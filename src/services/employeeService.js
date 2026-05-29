// src/services/employeeService.js
// ─── Employee API service ─────────────────────────────────────────────────────
import apiClient from './apiClient'

// ── Status display → backend enum mapping ─────────────────────────────────────
export const STATUS_TO_API = {
  Active:   'ACTIVE',
  Inactive: 'INACTIVE',
  Hold:     'ON_HOLD',
}

export const API_TO_STATUS = {
  ACTIVE:   'Active',
  INACTIVE: 'Inactive',
  ON_HOLD:  'Hold',
}

// ── Employment type display → backend enum mapping ────────────────────────────
export const TYPE_TO_API = {
  Employee:   'EMPLOYEE',
  Internship: 'INTERN',
  Training:   'TRAINEE',
}

export const API_TO_TYPE = {
  EMPLOYEE: 'Employee',
  INTERN:   'Internship',
  TRAINEE:  'Training',
}

const employeeService = {

  /**
   * GET /api/employees — paginated list with filters + sorting
   * @param {Object} params
   * @param {number}  params.page           0-based page index
   * @param {number}  params.size           page size (10 / 25 / 50 / 100)
   * @param {string}  [params.search]       free-text search
   * @param {string}  [params.status]       'ACTIVE' | 'INACTIVE' | 'ON_HOLD'
   * @param {string}  [params.employmentType] 'EMPLOYEE' | 'INTERN' | 'TRAINEE'
   * @param {string}  [params.department]   department name
   * @param {string}  [params.dateFrom]     ISO date e.g. '2024-01-01'
   * @param {string}  [params.dateTo]       ISO date
   * @param {string}  [params.sortBy]       'id' | 'name' | 'joiningDate'
   * @param {string}  [params.sortDir]      'asc' | 'desc'
   * @param {string}  [params.recordStatus] 'SUBMITTED' | 'DRAFT'
   * @returns {Promise<EmployeeListResponseDTO>}
   */
  getAll: (params = {}) => {
    // Strip undefined/null/empty values so they're not sent as '&key='
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    )
    return apiClient.get('/employees', { params: clean })
  },

  /**
   * GET /api/employees/:id
   * Returns EmployeeResponseDTO (extends BaseUserResponseDTO).
   *
   * KEY RESPONSE STRUCTURE — consumed by AddEmployee & ViewEmployee:
   *   emp.contact.personalPhone    ← NOT emp.personalPhone
   *   emp.contact.emergencyPhone   ← NOT emp.emergencyPhone
   *   emp.contact.personalEmail    ← NOT emp.personalEmail
   *   emp.contact.officeEmail      ← NOT emp.officeEmail
   *   emp.reportingManagerName     ← NOT emp.reportingManager
   *   emp.employment.dateOfJoining ← for employees
   *   emp.employment.ctc
   *   emp.employment.yearOfExperience
   *   emp.employment.noticePeriod
   *   emp.employment.previousCompanyNames
   *   emp.personalInformationId    ← used to fetch documents separately
   */
  getById: (id) => apiClient.get(`/employees/${id}`),

  /**
   * GET /api/persons/:personalInformationId/documents
   * Returns the list of PersonalDocument records for a person.
   *
   * Each document has:
   *   id, documentTypeName, docKey / documentTypeKey, filePath, reason, mandatory
   *
   * Used by ViewEmployee and AddEmployee (edit mode) to show existing documents.
   *
   * @param {number|string} personalInformationId
   * @returns {Promise<PersonalDocument[]>}
   */
  getDocuments: (personalInformationId) =>
    apiClient.get(`/persons/${personalInformationId}/documents`),

  /**
   * POST /api/users  (multipart/form-data)
   * Creates PersonalInformation + role-specific record in one shot.
   *
   * @param {FormData} formData
   *   Required parts:
   *     personalInformation  – JSON string  (PersonalInformationRequestDTO)
   *     profileImage         – File
   *   Optional parts:
   *     employee / intern / trainee  – JSON string
   *     <docKey>             – File (e.g. 'aadhaar', 'pan')
   *     reasons              – JSON string { docKey: 'reason text' }
   */
  create: (formData) =>
    apiClient.post('/users', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * PATCH /api/employees/:id  (multipart/form-data)
   */
  update: (id, formData) =>
    apiClient.patch(`/employees/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * PATCH /api/employees/:id/status
   * @param {number|string} id
   * @param {string}        status  'ACTIVE' | 'INACTIVE' | 'ON_HOLD'
   */
  updateStatus: (id, status) =>
    apiClient.patch(`/employees/${id}/status`, { status }),

  /**
   * DELETE /api/employees/:id  (ADMIN only)
   */
  delete: (id) => apiClient.delete(`/employees/${id}`),

  // ── Convenience helpers ──────────────────────────────────────────────────

  /**
   * Build a FormData payload for create / draft-save.
   *
   * @param {Object}  personalInformation  JSON-serialisable DTO
   * @param {Object}  [rolePayload]        e.g. { role: 'EMPLOYEE', employment: {...} }
   * @param {string}  roleKey              'employee' | 'intern' | 'trainee'
   * @param {File}    [profileImage]
   * @param {Object}  [documents]          { docKey: File }
   * @param {Object}  [reasons]            { docKey: 'reason text' }
   * @returns {FormData}
   */
  buildFormData: ({
    personalInformation,
    rolePayload = null,
    roleKey     = 'employee',
    profileImage,
    documents   = {},
    reasons     = {},
  }) => {
    const fd = new FormData()

    fd.append('personalInformation', JSON.stringify(personalInformation))

    if (rolePayload) {
      fd.append(roleKey, JSON.stringify(rolePayload))
    }

    if (profileImage) {
      fd.append('profileImage', profileImage)
    }

    // Document files
    Object.entries(documents).forEach(([key, file]) => {
      if (file) fd.append(key, file)
    })

    // Document absence reasons as a single JSON blob (backend parses as Map<String,String>)
    const reasonEntries = Object.entries(reasons).filter(([, text]) => !!text)
    if (reasonEntries.length > 0) {
      fd.append('reasons', JSON.stringify(Object.fromEntries(reasonEntries)))
    }

    return fd
  },
}

export default employeeService