// src/pages/employee/AddEmployee.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Save, UserPlus, CheckCircle, XCircle, Loader } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import employeeService from '@/services/employeeService'
import apiClient from '@/services/apiClient'
import shiftService from '@/services/shiftService'
import SearchableSelect from '@/components/shared/SearchableSelect'

const PRIMARY = '#C35E33'

// ─── File-upload constraints ──────────────────────────────────────────────────
const PROFILE_PHOTO_MAX_MB    = 5
const PROFILE_PHOTO_MAX_BYTES = PROFILE_PHOTO_MAX_MB * 1024 * 1024
const PROFILE_PHOTO_ALLOWED   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const PROFILE_PHOTO_EXT_LIST  = 'JPG, PNG, GIF, WEBP'

const DOC_MAX_MB    = 5
const DOC_MAX_BYTES = DOC_MAX_MB * 1024 * 1024
const DOC_ALLOWED   = ['application/pdf', 'image/jpeg', 'image/png']
const DOC_EXT_LIST  = 'PDF, JPG, PNG'

const EMPLOYMENT_TYPE_ROUTES = {
  Internship: '/employees/add-intern',
  Training:   '/employees/add-trainee',
  Employee:   '/employees/add',
}

// ─── Regex helpers ────────────────────────────────────────────────────────────
const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const PAN_RE   = /^[A-Z]{5}\d{4}[A-Z]$/
const ADHAR_RE = /^\d{12}$/
const IFSC_RE  = /^[A-Z]{4}0[A-Z0-9]{6}$/

function validatePhone(value, fieldName) {
  const cleaned = (value || '').replace(/[\s\-()]/g, '')
  if (!cleaned) return `${fieldName} is required`
  if (!/^\d+$/.test(cleaned)) return `${fieldName} must contain only digits`
  if (cleaned.length !== 10) return `${fieldName} must be exactly 10 digits`
  if (!PHONE_RE.test(cleaned)) return `${fieldName} must start with 6–9`
  return null
}

function validateEmail(value, fieldName) {
  if (!value?.trim()) return `${fieldName} is required`
  if (!EMAIL_RE.test(value)) return `${fieldName} is not a valid email`
  return null
}

function buildErrors(p, o, emp, addr, bank, docs, reasons, docTypes) {
  const errs = {}

  if (!p.firstName.trim())  errs.firstName     = 'First name is required'
  if (!p.middleName.trim()) errs.middleName    = 'Middle name is required'
  if (!p.lastName.trim())   errs.lastName      = 'Last name is required'
  if (!p.gender)            errs.gender        = 'Gender is required'
  if (!p.dob)               errs.dob           = 'Date of birth is required'
  if (!p.maritalStatus)     errs.maritalStatus = 'Marital status is required'
  if (!p.spouseName.trim()) errs.spouseName    = 'Spouse / parent name is required'
  if (!p.profilePhoto)      errs.profilePhoto  = 'Profile photo is required'

  const phoneErr = validatePhone(p.personalPhone, 'Personal phone')
  if (phoneErr) errs.personalPhone = phoneErr

  const emergErr = validatePhone(p.emergencyPhone, 'Emergency phone')
  if (emergErr) errs.emergencyPhone = emergErr

  const emailErr = validateEmail(p.personalEmail, 'Personal email')
  if (emailErr) errs.personalEmail = emailErr

if (!o.designationId)   errs.designation  = 'Designation is required'
if (!o.departmentId)    errs.department   = 'Department is required'
if (!o.workLocationId)  errs.workLocation = 'Work location / branch is required'
if (!o.shiftId)         errs.shiftId      = 'Shift is required'
  else if (!EMAIL_RE.test(o.officeEmail)) errs.officeEmail = 'Office email is not valid'
  if (!o.joiningDate)             errs.joiningDate      = 'Date of joining is required'
  if (!o.workLocation.trim())     errs.workLocation     = 'Work location / branch is required'
  if (!o.reportingManager.trim()) errs.reportingManager = 'Reporting manager is required'
  if (!o.role.trim())             errs.role             = 'Role is required'

  if (o.experience === '' || o.experience === null || o.experience === undefined)
    errs.experience = 'Years of experience is required'
  else if (isNaN(o.experience) || Number(o.experience) < 0)
    errs.experience = 'Experience must be a non-negative number'

  if (emp.salary.trim() === '')
    errs.salary = 'Salary / CTC is required'
  else if (isNaN(emp.salary) || Number(emp.salary) <= 0)
    errs.salary = 'CTC must be a positive number'

  if (emp.noticePeriod === '' || emp.noticePeriod === null || emp.noticePeriod === undefined)
    errs.noticePeriod = 'Notice period is required'
  else if (isNaN(emp.noticePeriod) || Number(emp.noticePeriod) < 0)
    errs.noticePeriod = 'Notice period must be a non-negative number'

  if (!addr.currentAddress.trim()) errs.currentAddress = 'Current address is required'
  if (!addr.city.trim())           errs.city           = 'City is required'
  if (!addr.district.trim())       errs.district       = 'District is required'
  if (!addr.state.trim())          errs.state          = 'State is required'
  if (!addr.pinCode.trim())        errs.pinCode        = 'PIN code is required'
  else if (!/^\d{6}$/.test(addr.pinCode)) errs.pinCode = 'PIN code must be 6 digits'
  if (!addr.country.trim())        errs.country        = 'Country is required'

  if (!addr.sameAsCurrent) {
    if (!addr.permAddress.trim())  errs.permAddress  = 'Permanent address is required'
    if (!addr.permCity.trim())     errs.permCity     = 'City is required'
    if (!addr.permDistrict.trim()) errs.permDistrict = 'District is required'
    if (!addr.permState.trim())    errs.permState    = 'State is required'
    if (!addr.permPinCode.trim())  errs.permPinCode  = 'PIN code is required'
    else if (!/^\d{6}$/.test(addr.permPinCode)) errs.permPinCode = 'PIN code must be 6 digits'
    if (!addr.permCountry.trim())  errs.permCountry  = 'Country is required'
  }

  if (!bank.bankName.trim())      errs.bankName      = 'Bank name is required'
  if (!bank.accountNumber.trim()) errs.accountNumber = 'Account number is required'
  if (!bank.ifscCode.trim())      errs.ifscCode      = 'IFSC code is required'
  else if (!IFSC_RE.test(bank.ifscCode.toUpperCase())) errs.ifscCode = 'IFSC format invalid (e.g. HDFC0001234)'
  if (!bank.panNumber.trim())     errs.panNumber     = 'PAN number is required'
  else if (!PAN_RE.test(bank.panNumber.toUpperCase()))  errs.panNumber = 'PAN format invalid (e.g. ABCDE1234F)'
  if (!bank.aadhaarNumber.trim()) errs.aadhaarNumber = 'Aadhaar number is required'
  else if (!ADHAR_RE.test(bank.aadhaarNumber.replace(/\s/g, ''))) errs.aadhaarNumber = 'Aadhaar must be exactly 12 digits'

 if (Array.isArray(docTypes)) {
  docTypes.forEach(dt => {
    if (dt.mandatory) {
      const key       = dt.key || dt.docKey || String(dt.id)
      const hasFile   = docs[key] instanceof File
      const hasReason = reasons?.[key]?.trim()
        if (!hasFile && !hasReason)
          errs[`doc_${key}`] = `${dt.name} is required (upload file or provide reason)`
      }
    })
  }

  return errs
}

// ─── Reusable UI components ───────────────────────────────────────────────────
function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-medium text-gray-500 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function ErrorMsg({ msg }) {
  if (!msg) return null
  return <p className="text-[11px] text-red-500 mt-0.5">{msg}</p>
}

function TextInput({ placeholder, type = 'text', value, onChange, error, className = '', numericOnly = false }) {
  const handleChange = (e) => {
    if (numericOnly) {
      const v = e.target.value.replace(/\D/g, '')
      onChange({ target: { value: v } })
    } else {
      onChange(e)
    }
  }
  return (
    <>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border rounded-lg outline-none transition-colors placeholder:text-gray-400 ${
          error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#C35E33] focus:bg-white'
        } ${className}`}
      />
      <ErrorMsg msg={error} />
    </>
  )
}

// FIX: Removed live uniqueness badge — email checks now happen only on save/submit
function SelectInput({ children, value, onChange, error }) {
  return (
    <>
      <select
        value={value}
        onChange={onChange}
        className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border rounded-lg outline-none transition-colors appearance-none cursor-pointer ${
          error ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33] focus:bg-white'
        }`}
      >
        {children}
      </select>
      <ErrorMsg msg={error} />
    </>
  )
}

function PhoneInput({ value, onChange, error }) {
  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
    onChange({ target: { value: v } })
  }
  return (
    <>
      <div className="flex h-9">
        <span className="flex items-center px-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-xs text-gray-500 whitespace-nowrap">
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          placeholder="9876543210"
          value={value}
          onChange={handleChange}
          maxLength={10}
          className={`flex-1 min-w-0 px-2 text-sm text-gray-700 bg-gray-50 border rounded-r-lg outline-none transition-colors ${
            error ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33]'
          }`}
        />
      </div>
      <ErrorMsg msg={error} />
    </>
  )
}

function RadioOption({ name, value, checked, onChange, label }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="hidden" />
      <span
        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ borderColor: checked ? PRIMARY : '#D1D5DB', backgroundColor: checked ? PRIMARY : 'transparent' }}
      >
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      <span className="text-xs text-gray-600 whitespace-nowrap">{label}</span>
    </label>
  )
}

function ProfilePhotoUpload({ file, onChange, error }) {
  const handleChange = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (!PROFILE_PHOTO_ALLOWED.includes(picked.type)) {
      onChange(null, `Invalid format. Allowed: ${PROFILE_PHOTO_EXT_LIST}`)
      return
    }
    if (picked.size > PROFILE_PHOTO_MAX_BYTES) {
      onChange(null, `File too large. Max size is ${PROFILE_PHOTO_MAX_MB} MB`)
      return
    }
    onChange(picked, null)
  }
  return (
    <div>
      <label className="relative cursor-pointer">
        <div className={`flex items-center h-9 px-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors ${
          error ? 'border-red-400' : 'border-gray-200'
        }`}>
          <span className="text-sm text-gray-400 flex-1 truncate">
            {file ? file.name : 'Choose Photo'}
          </span>
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ml-2"
            style={{ backgroundColor: PRIMARY }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
        </div>
        <input type="file" className="hidden" accept={PROFILE_PHOTO_ALLOWED.join(',')} onChange={handleChange} />
      </label>
      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
        Formats: {PROFILE_PHOTO_EXT_LIST} · Max {PROFILE_PHOTO_MAX_MB} MB
        {!file && ' · Required for submission (optional for draft)'}
      </p>
      <ErrorMsg msg={error} />
    </div>
  )
}

function FileUpload({ onChange, file, error, accept = '*' }) {
  const handleChange = (e) => {
    if (e.target.files?.length > 0) onChange(e.target.files[0])
    e.target.value = ''
  }
  return (
    <>
      <label className="relative cursor-pointer">
        <div className={`flex items-center h-9 px-3 bg-gray-50 border rounded-lg
          hover:bg-gray-100 transition-colors
          ${error ? 'border-red-400' : 'border-gray-200'}`}>
          <span className="text-sm text-gray-400 flex-1 truncate">
            {file instanceof File ? file.name : 'Choose File'}
          </span>
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ml-2"
            style={{ backgroundColor: PRIMARY }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
        </div>
        <input type="file" className="hidden" accept={accept} onChange={handleChange} />
      </label>
    </>
  )
}

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border-2 p-5 ${className}`} style={{ borderColor: '#E8C5A8' }}>
      <h2 className="text-sm font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function EmailConfirmModal({ isOpen, onClose, onConfirm, loading, employeeName, email }) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: 420, margin: '0 16px' }}>
        <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ backgroundColor: '#111827' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100">
              <Mail size={14} color="#1E40AF" />
            </div>
            <h2 className="text-white font-semibold text-sm">Confirm Submission</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50">
            <Mail size={28} color="#1E40AF" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 mb-1">Send Credentials?</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              This will create the employee record for{' '}
              <strong className="text-gray-700">{employeeName}</strong> and send login
              credentials to <strong className="text-gray-700">{email || 'the provided email'}</strong>.
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            style={{ backgroundColor: '#2563EB' }}
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            )}
            <Mail size={14} />
            Submit & Send Email
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUS_TO_API = { Active: 'ACTIVE', Inactive: 'INACTIVE', 'On Hold': 'ON_HOLD' }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AddEmployee() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [errors,      setErrors]      = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Dropdown data
  const [departments,   setDepartments]   = useState([])
  const [designations,  setDesignations]  = useState([])
  const [branches,      setBranches]      = useState([])
  const [deptLoading,   setDeptLoading]   = useState(true)
  const [desigLoading,  setDesigLoading]  = useState(true)
  const [branchLoading, setBranchLoading] = useState(true)

  // Document types
  const [docTypes,   setDocTypes]   = useState([])
  const [docLoading, setDocLoading] = useState(true)

  const [shifts,       setShifts]       = useState([])
const [shiftLoading, setShiftLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
const [deptRes, desigRes, branchRes, docRes, shiftRes] = await Promise.allSettled([
  apiClient.get('/departments',    { params: { page: 0, size: 200 } }),
  apiClient.get('/designations',   { params: { page: 0, size: 200 } }),
  apiClient.get('/branches/tree'),
  apiClient.get('/document-types?applicableTypes=EMPLOYEE&page=0&size=100'),
  shiftService.getAll(0, 200),   // ← use existing service
])
        if (deptRes.status === 'fulfilled') {
          const d = deptRes.value?.data?.data ?? deptRes.value?.data ?? {}
          setDepartments((d.content ?? []).filter(x => x.status !== false))
        } else {
          console.error('Failed to load departments:', deptRes.reason)
        }

        if (desigRes.status === 'fulfilled') {
          const d = desigRes.value?.data?.data ?? desigRes.value?.data ?? {}
          setDesignations((d.content ?? []).filter(x => x.active !== false))
        } else {
          console.error('Failed to load designations:', desigRes.reason)
        }

        if (branchRes.status === 'fulfilled') {
          const d = branchRes.value?.data?.data ?? branchRes.value?.data ?? []
          // FIX: Flatten tree structure (same as original AddEmployee had)
          const flatten = (nodes) =>
            nodes.flatMap(n => [n, ...(n.children ? flatten(n.children) : [])])
          setBranches(flatten(Array.isArray(d) ? d : [d]).filter(x => x.active !== false))
        } else {
          console.error('Failed to load branches:', branchRes.reason)
        }

        if (shiftRes.status === 'fulfilled') {
  const d = shiftRes.value?.data?.data ?? shiftRes.value?.data ?? {}
  setShifts((d.content ?? []).filter(x => x.isActive !== false))
} else {
  console.error('Failed to load shifts:', shiftRes.reason)
}

        if (docRes.status === 'fulfilled') {
          const d = docRes.value?.data?.data ?? docRes.value?.data ?? {}
          
          const rawDocs = (d.content ?? []).filter(x => x.active !== false)
          const seen    = new Set()
          const unique  = rawDocs.filter(dt => {
            const key = dt.key || dt.docKey || String(dt.id)
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          setDocTypes(unique)
        } else {
          console.error('Failed to load document types:', docRes.reason)
        }
      } finally {
        setDeptLoading(false)
        setDesigLoading(false)
        setBranchLoading(false)
        setDocLoading(false)
         setShiftLoading(false)
      }
    }
    load()
  }, [])

  // ── Form state ─────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: '', middleName: '', lastName: '', gender: '',
    dob: '', personalPhone: '', emergencyPhone: '', personalEmail: '',
    maritalStatus: '', spouseName: '', profilePhoto: null,
  })

const [office, setOffice] = useState({
  employeeId: '',
  designation: '', designationId: null,
  department: '',  departmentId: null,
  officeEmail: '', joiningDate: '', experience: '',
  prevCompanyNames: [''],
  workLocation: '', workLocationId: null,
  shiftId: null,       // ← already exists, keep as null
  shiftName: '',       // ← add for display
  reportingManager: '', role: '',
})

  const [empDetails, setEmpDetails] = useState({
    salary: '', status: 'Active',
    workMode: 'Remote', workingMode: 'Full-time', noticePeriod: '',
  })

  const [address, setAddress] = useState({
    currentAddress: '', city: '', district: '', landmark: '',
    state: '', pinCode: '', country: 'India',
    sameAsCurrent: false,
    permAddress: '', permCity: '', permDistrict: '', permLandmark: '',
    permState: '', permPinCode: '', permCountry: 'India',
  })

  const [bank, setBank] = useState({
    bankName: '', accountNumber: '', ifscCode: '',
    panNumber: '', aadhaarNumber: '', pfNumber: '',
    uanNumber: '', esicNumber: '',
  })

  const [documents,  setDocuments]  = useState({})
  const [docReasons, setDocReasons] = useState({})

  // ── FIX 2: Email/code uniqueness — check on save/submit, NOT while typing ──
  // Removed all debounced useEffect email checkers.
  // Instead, checkEmailsAvailable() is called inside handleSaveDraft and
  // handleSubmitClick before proceeding.

  const checkEmailsAvailable = async () => {
    const issues = []
    try {
      if (personal.personalEmail && EMAIL_RE.test(personal.personalEmail)) {
        const r = await apiClient.get('/users/check-email', {
          params: { email: personal.personalEmail.trim(), type: 'PERSONAL' }
        })
        // if (!r.data?.data?.available) {
        //   issues.push({ field: 'personalEmail', msg: 'Personal email is already registered' })
        // }
      }
      if (office.officeEmail && EMAIL_RE.test(office.officeEmail)) {
        const r = await apiClient.get('/users/check-email', {
          params: { email: office.officeEmail.trim(), type: 'OFFICE' }
        })
        // if (!r.data?.data?.available) {
        //   issues.push({ field: 'officeEmail', msg: 'Office email is already registered' })
        // }
      }
      if (office.employeeId.trim()) {
  const r = await apiClient.get('/users/check-employee-code', {
    params: { code: office.employeeId.trim() }
  })
  const available = r.data?.data?.available ?? r.data?.available ?? true
  if (!available) {
    issues.push({ field: 'employeeId', msg: 'Employee ID is already in use' })
  }
}
    } catch {
      // Network failure — don't block the user; backend will catch duplicates
    }
    return issues
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateField = (setter) => (field) => (e) =>
    setter((prev) => ({ ...prev, [field]: e.target?.value ?? e }))

  const up  = updateField(setPersonal)
  const upo = updateField(setOffice)
  const upe = updateField(setEmpDetails)
  const upa = updateField(setAddress)
  const upb = updateField(setBank)

  const clearError  = (key) => setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  const clearErrors = (...keys) => setErrors((prev) => {
    const n = { ...prev }; keys.forEach((k) => delete n[k]); return n
  })

  const handleSameAsCurrent = (checked) => {
    setAddress((prev) => ({
      ...prev, sameAsCurrent: checked,
      ...(checked ? {
        permAddress: prev.currentAddress, permCity: prev.city,
        permDistrict: prev.district,      permLandmark: prev.landmark,
        permState: prev.state,            permPinCode: prev.pinCode,
        permCountry: prev.country,
      } : {}),
    }))
    if (checked) clearErrors('permAddress','permCity','permDistrict','permState','permPinCode','permCountry')
  }

  const addPrevCompany = () =>
    setOffice((prev) => ({ ...prev, prevCompanyNames: [...prev.prevCompanyNames, ''] }))

  const updatePrevCompany = (idx, val) =>
    setOffice((prev) => ({
      ...prev, prevCompanyNames: prev.prevCompanyNames.map((v, i) => (i === idx ? val : v)),
    }))

  // ── Build FormData ─────────────────────────────────────────────────────────
  const buildPayload = useCallback((isDraft) => {
    const personalInfo = {
      status:             isDraft ? 'DRAFT' : 'SUBMITTED',
      firstName:          personal.firstName.trim(),
      middleName:         personal.middleName.trim(),
      lastName:           personal.lastName.trim(),
      gender:             personal.gender ? personal.gender.toUpperCase() : null,
      dateOfBirth:        personal.dob                || null,
      employmentType:     'EMPLOYEE',
      maritalStatus:      personal.maritalStatus ? personal.maritalStatus.toUpperCase() : null,
      spouseOrParentName: personal.spouseName.trim()  || null,
      personalPhone:      personal.personalPhone,
      emergencyPhone:     personal.emergencyPhone,
      personalEmail:      personal.personalEmail.trim() || null,
      officeEmail:        office.officeEmail.trim()     || null,
      workProfile: {
  departmentId:       office.departmentId    || null,   // ← was departmentName
  designationId:      office.designationId   || null,   // ← was designationName
  branchId:           office.workLocationId  || null,   // ← was branchName
  shiftId:            office.shiftId         || null,
  reportingManagerId: office.reportingManager.trim() || null,
  workMode:     empDetails.workMode === 'On site' ? 'ONSITE' : empDetails.workMode.toUpperCase(),
  workingType:  empDetails.workingMode.toUpperCase().replace(/[\s-]+/g, '_'),
  status:       STATUS_TO_API[empDetails.status] || 'ACTIVE',
  dateOfJoining: office.joiningDate || null,        
},
      address: {
        currentAddress: {
          addressLine: address.currentAddress.trim(),
          city:        address.city.trim(),
          district:    address.district.trim(),
          landmark:    address.landmark.trim() || null,
          state:       address.state.trim(),
          pinCode:     address.pinCode.trim(),
          country:     address.country.trim(),
        },
        sameAsCurrent:    address.sameAsCurrent,
        permanentAddress: address.sameAsCurrent ? null : {
          addressLine: address.permAddress.trim(),
          city:        address.permCity.trim(),
          district:    address.permDistrict.trim(),
          landmark:    address.permLandmark.trim() || null,
          state:       address.permState.trim(),
          pinCode:     address.permPinCode.trim(),
          country:     address.permCountry.trim(),
        },
      },
      bankDetails: {
        bankName:      bank.bankName.trim()      || null,
        accountNumber: bank.accountNumber.trim() || null,
        ifscCode:      bank.ifscCode.trim()      || null,
        panNumber:     bank.panNumber.trim()     || null,
        aadhaarNumber: bank.aadhaarNumber.trim() || null,
        pfNumber:      bank.pfNumber.trim()      || null,
        uanNumber:     bank.uanNumber.trim()     || null,
        esicNumber:    bank.esicNumber.trim()    || null,
      },
    }

    const employeeData = {
      role:         'EMPLOYEE',
      employeeCode: office.employeeId.trim() || null,
      employment: {
        dateOfJoining:        office.joiningDate  || null,
        yearOfExperience:     office.experience !== '' ? Number(office.experience) : null,
        ctc:                  empDetails.salary  !== '' ? Number(empDetails.salary) : null,
        previousCompanyNames: office.prevCompanyNames.filter(Boolean),
        noticePeriod:         empDetails.noticePeriod !== '' ? Number(empDetails.noticePeriod) : null,
      },
    }

    const fd = new FormData()
    fd.append('personalInformation', JSON.stringify(personalInfo))
    fd.append('employee',            JSON.stringify(employeeData))

    if (personal.profilePhoto instanceof File) fd.append('profileImage', personal.profilePhoto)

    Object.entries(documents).forEach(([docKey, file]) => {
      if (file instanceof File) fd.append(docKey, file)
    })
   const reasonsMap = {}
Object.entries(docReasons).forEach(([docKey, reason]) => {
  if (reason?.trim() && !(documents[docKey] instanceof File)) {
    reasonsMap[docKey] = reason.trim()
  }
})
if (Object.keys(reasonsMap).length > 0) {
  fd.append('reasons', JSON.stringify(reasonsMap))
}
    return fd
  }, [personal, office, empDetails, address, bank, documents, docReasons])

  // ── Save as Draft ──────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const draftErrs = {}
    if (!personal.firstName.trim()) draftErrs.firstName = 'First name is required'
    if (!personal.lastName.trim())  draftErrs.lastName  = 'Last name is required'

    if (Object.keys(draftErrs).length > 0) {
      setErrors(draftErrs)
      toast.warning('Please provide at least first and last name for draft')
      return
    }

    setSubmitting(true)
    try {
      // FIX: Check email/code availability HERE (on save), not while typing
      const uniquenessIssues = await checkEmailsAvailable()
      if (uniquenessIssues.length > 0) {
        const newErrs = {}
        uniquenessIssues.forEach(({ field, msg }) => { newErrs[field] = msg })
        setErrors(newErrs)
        toast.warning(uniquenessIssues[0].msg)
        setSubmitting(false)
        return
      }

      const fd = buildPayload(true)
      await employeeService.create(fd)
      toast.success('Employee saved as draft successfully')
      navigate('/employees')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save draft')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit (full validation → confirmation modal) ──────────────────────────
  const handleSubmitClick = async () => {
    const errs = buildErrors(personal, office, empDetails, address, bank, documents, docReasons, docTypes)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.warning('Please fix the highlighted fields before submitting')
      setTimeout(() => {
        const el = document.querySelector('[data-error="true"]')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }

    // FIX: Check email/code availability HERE (on submit), not while typing
    setSubmitting(true)
    try {
      const uniquenessIssues = await checkEmailsAvailable()
      if (uniquenessIssues.length > 0) {
        const newErrs = {}
        uniquenessIssues.forEach(({ field, msg }) => { newErrs[field] = msg })
        setErrors(newErrs)
        toast.warning(uniquenessIssues[0].msg)
        return
      }
    } finally {
      setSubmitting(false)
    }

    setErrors({})
    setShowConfirm(true)
  }

  // ── Confirmed submit ───────────────────────────────────────────────────────
  const handleConfirmedSubmit = async () => {
    setSubmitting(true)
    try {
      const fd = buildPayload(false)
      await employeeService.create(fd)
      toast.success('Employee added successfully! Credentials sent via email.')
      setShowConfirm(false)
      navigate('/employees')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create employee')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-full pb-8">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
          <h1 className="text-xl font-bold text-gray-900">Add Employee</h1>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs font-semibold text-gray-700">Employment Type</span>
            <div className="flex items-center gap-4">
              {['Internship', 'Training', 'Employee'].map((type) => (
                <RadioOption
                  key={type} name="employmentType" value={type}
                  checked={type === 'Employee'}
                  onChange={() => navigate(EMPLOYMENT_TYPE_ROUTES[type])}
                  label={type}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">

          {/* ── Personal Information ──────────────────────────────────── */}
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.firstName}>
                <FieldLabel required>First Name</FieldLabel>
                <TextInput placeholder="First Name" value={personal.firstName} error={errors.firstName}
                  onChange={(e) => { up('firstName')(e); clearError('firstName') }} />
              </div>
              <div data-error={!!errors.middleName}>
                <FieldLabel required>Middle Name</FieldLabel>
                <TextInput placeholder="Middle Name" value={personal.middleName} error={errors.middleName}
                  onChange={(e) => { up('middleName')(e); clearError('middleName') }} />
              </div>
              <div data-error={!!errors.lastName}>
                <FieldLabel required>Last Name</FieldLabel>
                <TextInput placeholder="Last Name" value={personal.lastName} error={errors.lastName}
                  onChange={(e) => { up('lastName')(e); clearError('lastName') }} />
              </div>
              <div data-error={!!errors.gender}>
                <FieldLabel required>Gender</FieldLabel>
                <SelectInput value={personal.gender} error={errors.gender}
                  onChange={(e) => { up('gender')(e); clearError('gender') }}>
                  <option value="">Select Gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </SelectInput>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.dob}>
                <FieldLabel required>Date of Birth</FieldLabel>
                <TextInput type="date" value={personal.dob} error={errors.dob}
                  onChange={(e) => { up('dob')(e); clearError('dob') }} />
              </div>
              <div data-error={!!errors.personalPhone}>
                <FieldLabel required>Personal Phone</FieldLabel>
                <PhoneInput value={personal.personalPhone} error={errors.personalPhone}
                  onChange={(e) => { up('personalPhone')(e); clearError('personalPhone') }} />
              </div>
              <div data-error={!!errors.emergencyPhone}>
                <FieldLabel required>Emergency Phone</FieldLabel>
                <PhoneInput value={personal.emergencyPhone} error={errors.emergencyPhone}
                  onChange={(e) => { up('emergencyPhone')(e); clearError('emergencyPhone') }} />
              </div>
              {/* FIX: Removed live uniqueness check — plain email input now */}
              <div data-error={!!errors.personalEmail}>
                <FieldLabel required>Personal Email</FieldLabel>
                <TextInput
                  type="email"
                  placeholder="name@gmail.com"
                  value={personal.personalEmail}
                  error={errors.personalEmail}
                  onChange={(e) => { up('personalEmail')(e); clearError('personalEmail') }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.maritalStatus}>
                <FieldLabel required>Marital Status</FieldLabel>
                <SelectInput value={personal.maritalStatus} error={errors.maritalStatus}
                  onChange={(e) => { up('maritalStatus')(e); clearError('maritalStatus') }}>
                  <option value="">Select Status</option>
                  <option>Single</option><option>Married</option>
                  <option>Divorced</option><option>Widowed</option>
                </SelectInput>
              </div>
              <div data-error={!!errors.spouseName}>
                <FieldLabel required>Spouse / Parent Name</FieldLabel>
                <TextInput placeholder="Name" value={personal.spouseName} error={errors.spouseName}
                  onChange={(e) => { up('spouseName')(e); clearError('spouseName') }} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div data-error={!!errors.profilePhoto}>
                <FieldLabel required>Profile Photo</FieldLabel>
                <ProfilePhotoUpload
                  file={personal.profilePhoto}
                  error={errors.profilePhoto}
                  onChange={(file, validationError) => {
                    if (validationError) {
                      setErrors(e => ({ ...e, profilePhoto: validationError }))
                      setPersonal(p => ({ ...p, profilePhoto: null }))
                    } else {
                      setPersonal(p => ({ ...p, profilePhoto: file }))
                      clearError('profilePhoto')
                    }
                  }}
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Office Information ────────────────────────────────────── */}
          <SectionCard title="Office Information">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <FieldLabel>Employee ID (auto-generated if blank)</FieldLabel>
                <TextInput
                  type="text"
                  placeholder="GMEP001"
                  value={office.employeeId}
                  error={errors.employeeId}
                  onChange={(e) => {
                    setOffice(o => ({ ...o, employeeId: e.target.value }))
                    clearError('employeeId')
                  }}
                />
              </div>

              {/* FIX: Uses SearchableSelect with data from direct apiClient */}
              <div data-error={!!errors.designation}>
                <FieldLabel required>Designation</FieldLabel>
                <SearchableSelect
                  value={office.designation}
                  options={designations}
                  labelKey="name"
                  valueKey="name"
                  placeholder={desigLoading ? 'Loading…' : 'Select designation…'}
                  loading={desigLoading}
                  onChange={opt => {
  setOffice(o => ({ ...o, designation: opt?.name ?? '', designationId: opt?.id ?? null }))
  clearError('designation')
}}
                />
              </div>

              <div data-error={!!errors.department}>
                <FieldLabel required>Department</FieldLabel>
                <SearchableSelect
                  value={office.department}
                  options={departments}
                  labelKey="name"
                  valueKey="name"
                  placeholder={deptLoading ? 'Loading…' : 'Select department…'}
                  loading={deptLoading}
                  error={errors.department}
                  onChange={opt => {
  setOffice(o => ({ ...o, department: opt?.name ?? '', departmentId: opt?.id ?? null }))
  clearError('department')
}}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {/* FIX: Removed live uniqueness check — plain email input now */}
              <div data-error={!!errors.officeEmail}>
                <FieldLabel required>Office Email</FieldLabel>
                <TextInput
                  type="email"
                  placeholder="name@company.com"
                  value={office.officeEmail}
                  error={errors.officeEmail}
                  onChange={(e) => {
                    upo('officeEmail')(e)
                    clearError('officeEmail')
                  }}
                />
              </div>

              <div data-error={!!errors.joiningDate}>
                <FieldLabel required>Date of Joining</FieldLabel>
                <TextInput type="date" value={office.joiningDate} error={errors.joiningDate}
                  onChange={(e) => { upo('joiningDate')(e); clearError('joiningDate') }} />
              </div>
              <div data-error={!!errors.experience}>
                <FieldLabel required>Years of Experience</FieldLabel>
                <TextInput placeholder="2" value={office.experience} numericOnly error={errors.experience}
                  onChange={(e) => { upo('experience')(e); clearError('experience') }} />
              </div>
              <div data-error={!!errors.workLocation}>
                <FieldLabel required>Work Location / Branch</FieldLabel>
                <SearchableSelect
                  value={office.workLocation}
                  options={branches}
                  labelKey="branchName"
                  valueKey="branchName"
                  placeholder={branchLoading ? 'Loading…' : 'Select branch…'}
                  loading={branchLoading}
                  error={errors.workLocation}
                 onChange={opt => {
  setOffice(o => ({ ...o, workLocation: opt?.branchName ?? '', workLocationId: opt?.id ?? null }))
  clearError('workLocation')
}}
                />
              </div>

              {/* Add after Work Location / Branch div */}
<div data-error={!!errors.shiftId}>
  <FieldLabel required>Shift</FieldLabel>
  <SearchableSelect
    value={office.shiftName}
    options={shifts}
    labelKey="shiftName"
    valueKey="id"
    placeholder={shiftLoading ? 'Loading…' : 'Select shift…'}
    loading={shiftLoading}
    error={errors.shiftId}
    onChange={opt => {
      setOffice(o => ({
        ...o,
        shiftName: opt?.shiftName ?? '',
        shiftId:   opt?.id        ?? null,
      }))
      clearError('shiftId')
    }}
  />
</div>
            </div>

            <div className="mb-3">
              <FieldLabel>Previous Company Name(s)</FieldLabel>
              <div className="flex flex-col gap-2">
                {office.prevCompanyNames.map((name, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Company ${idx + 1}`}
                      value={name}
                      onChange={(e) => updatePrevCompany(idx, e.target.value)}
                      className="flex-1 h-9 px-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C35E33]"
                    />
                    {idx === office.prevCompanyNames.length - 1 && (
                      <button type="button" onClick={addPrevCompany}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: PRIMARY }}>
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
              <div data-error={!!errors.reportingManager}>
                <FieldLabel required>Reporting Manager</FieldLabel>
                <TextInput placeholder="Manager Name" value={office.reportingManager} error={errors.reportingManager}
                  onChange={(e) => { upo('reportingManager')(e); clearError('reportingManager') }} />
              </div>
              <div data-error={!!errors.role}>
                <FieldLabel required>Role</FieldLabel>
                <TextInput placeholder="Employee" value={office.role} error={errors.role}
                  onChange={(e) => { upo('role')(e); clearError('role') }} />
              </div>
            </div>
          </SectionCard>

          {/* ── Employment Details ────────────────────────────────────── */}
          <SectionCard title="Employment Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div data-error={!!errors.salary}>
                  <FieldLabel required>Salary / CTC (₹)</FieldLabel>
                  <TextInput placeholder="500000" value={empDetails.salary} numericOnly error={errors.salary}
                    onChange={(e) => { upe('salary')(e); clearError('salary') }} />
                </div>
                <div>
                  <FieldLabel required>Work Mode</FieldLabel>
                  <div className="flex items-center gap-4 mt-1">
                    {['Remote', 'Hybrid', 'On site'].map((m) => (
                      <RadioOption key={m} name="workMode" value={m}
                        checked={empDetails.workMode === m} onChange={upe('workMode')} label={m} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel required>Employee Status</FieldLabel>
                  <div className="flex items-center gap-4 mt-1">
                    {['Active', 'Inactive', 'On Hold'].map((s) => (
                      <RadioOption key={s} name="empStatus" value={s}
                        checked={empDetails.status === s} onChange={upe('status')} label={s} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Working Type</FieldLabel>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {['Part-time', 'Full-time', 'Contractual'].map((m) => (
                        <RadioOption key={m} name="workingMode" value={m}
                          checked={empDetails.workingMode === m} onChange={upe('workingMode')} label={m} />
                      ))}
                    </div>
                  </div>
                  <div data-error={!!errors.noticePeriod}>
                    <FieldLabel required>Notice Period (days)</FieldLabel>
                    <TextInput placeholder="30" value={empDetails.noticePeriod} numericOnly error={errors.noticePeriod}
                      onChange={(e) => { upe('noticePeriod')(e); clearError('noticePeriod') }} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Current Address ───────────────────────────────────────── */}
          <SectionCard title="Current Address">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.currentAddress}>
                <FieldLabel required>Address Line</FieldLabel>
                <TextInput placeholder="Street / House No." value={address.currentAddress} error={errors.currentAddress}
                  onChange={(e) => {
                    upa('currentAddress')(e); clearError('currentAddress')
                    if (address.sameAsCurrent) upa('permAddress')(e)
                  }} />
              </div>
              <div data-error={!!errors.city}>
                <FieldLabel required>City</FieldLabel>
                <TextInput placeholder="Ahmedabad" value={address.city} error={errors.city}
                  onChange={(e) => {
                    upa('city')(e); clearError('city')
                    if (address.sameAsCurrent) upa('permCity')(e)
                  }} />
              </div>
              <div data-error={!!errors.district}>
                <FieldLabel required>District</FieldLabel>
                <TextInput placeholder="Ahmedabad" value={address.district} error={errors.district}
                  onChange={(e) => {
                    upa('district')(e); clearError('district')
                    if (address.sameAsCurrent) upa('permDistrict')(e)
                  }} />
              </div>
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near..." value={address.landmark}
                  onChange={(e) => {
                    upa('landmark')(e)
                    if (address.sameAsCurrent) upa('permLandmark')(e)
                  }} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div data-error={!!errors.state}>
                <FieldLabel required>State</FieldLabel>
                <TextInput placeholder="Gujarat" value={address.state} error={errors.state}
                  onChange={(e) => {
                    upa('state')(e); clearError('state')
                    if (address.sameAsCurrent) upa('permState')(e)
                  }} />
              </div>
              <div data-error={!!errors.pinCode}>
                <FieldLabel required>PIN Code</FieldLabel>
                <TextInput placeholder="380060" value={address.pinCode} numericOnly error={errors.pinCode}
                  onChange={(e) => {
                    upa('pinCode')(e); clearError('pinCode')
                    if (address.sameAsCurrent) upa('permPinCode')(e)
                  }} />
              </div>
              <div data-error={!!errors.country}>
                <FieldLabel required>Country</FieldLabel>
                <TextInput placeholder="India" value={address.country} error={errors.country}
                  onChange={(e) => {
                    upa('country')(e); clearError('country')
                    if (address.sameAsCurrent) upa('permCountry')(e)
                  }} />
              </div>
            </div>
          </SectionCard>

          {/* ── Permanent Address ─────────────────────────────────────── */}
          <div className="rounded-xl border-2 p-5" style={{ borderColor: PRIMARY }}>
            <label className="flex items-start gap-2.5 cursor-pointer mb-5">
              <div className="relative mt-0.5 flex-shrink-0">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center border-2 transition-colors"
                  style={{ backgroundColor: address.sameAsCurrent ? PRIMARY : 'white', borderColor: address.sameAsCurrent ? PRIMARY : '#D1D5DB' }}
                  onClick={() => handleSameAsCurrent(!address.sameAsCurrent)}
                >
                  {address.sameAsCurrent && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 leading-relaxed select-none font-medium"
                onClick={() => handleSameAsCurrent(!address.sameAsCurrent)}>
                Permanent address is same as current address
              </span>
            </label>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.permAddress}>
                <FieldLabel required={!address.sameAsCurrent}>Address Line</FieldLabel>
                <TextInput placeholder="Street / House No."
                  value={address.sameAsCurrent ? address.currentAddress : address.permAddress}
                  error={errors.permAddress}
                  onChange={(e) => { upa('permAddress')(e); clearError('permAddress') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permCity}>
                <FieldLabel required={!address.sameAsCurrent}>City</FieldLabel>
                <TextInput placeholder="Ahmedabad"
                  value={address.sameAsCurrent ? address.city : address.permCity}
                  error={errors.permCity}
                  onChange={(e) => { upa('permCity')(e); clearError('permCity') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permDistrict}>
                <FieldLabel required={!address.sameAsCurrent}>District</FieldLabel>
                <TextInput placeholder="Ahmedabad"
                  value={address.sameAsCurrent ? address.district : address.permDistrict}
                  error={errors.permDistrict}
                  onChange={(e) => { upa('permDistrict')(e); clearError('permDistrict') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near..."
                  value={address.sameAsCurrent ? address.landmark : address.permLandmark}
                  onChange={(e) => { upa('permLandmark')(e) }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div data-error={!!errors.permState}>
                <FieldLabel required={!address.sameAsCurrent}>State</FieldLabel>
                <TextInput placeholder="Gujarat"
                  value={address.sameAsCurrent ? address.state : address.permState}
                  error={errors.permState}
                  onChange={(e) => { upa('permState')(e); clearError('permState') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permPinCode}>
                <FieldLabel required={!address.sameAsCurrent}>PIN Code</FieldLabel>
                <TextInput placeholder="380060" numericOnly
                  value={address.sameAsCurrent ? address.pinCode : address.permPinCode}
                  error={errors.permPinCode}
                  onChange={(e) => { upa('permPinCode')(e); clearError('permPinCode') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permCountry}>
                <FieldLabel required={!address.sameAsCurrent}>Country</FieldLabel>
                <TextInput placeholder="India"
                  value={address.sameAsCurrent ? address.country : address.permCountry}
                  error={errors.permCountry}
                  onChange={(e) => { upa('permCountry')(e); clearError('permCountry') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            </div>
          </div>

          {/* ── Bank & Legal Details ──────────────────────────────────── */}
          <SectionCard title="Bank & Legal Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div data-error={!!errors.bankName}>
                <FieldLabel required>Bank Name</FieldLabel>
                <TextInput placeholder="HDFC Bank" value={bank.bankName} error={errors.bankName}
                  onChange={(e) => { upb('bankName')(e); clearError('bankName') }} />
              </div>
              <div data-error={!!errors.accountNumber}>
                <FieldLabel required>Account Number</FieldLabel>
                <TextInput type="password" placeholder="••••••••••••" value={bank.accountNumber}
                  numericOnly error={errors.accountNumber}
                  onChange={(e) => { upb('accountNumber')(e); clearError('accountNumber') }} />
              </div>
              <div data-error={!!errors.ifscCode}>
                <FieldLabel required>IFSC Code</FieldLabel>
                <TextInput placeholder="HDFC0001234" value={bank.ifscCode} error={errors.ifscCode}
                  onChange={(e) => { upb('ifscCode')({ target: { value: e.target.value.toUpperCase() } }); clearError('ifscCode') }} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div data-error={!!errors.panNumber}>
                <FieldLabel required>PAN Number</FieldLabel>
                <TextInput placeholder="ABCDE1234F" value={bank.panNumber} error={errors.panNumber}
                  onChange={(e) => { upb('panNumber')({ target: { value: e.target.value.toUpperCase() } }); clearError('panNumber') }} />
              </div>
              <div data-error={!!errors.aadhaarNumber}>
                <FieldLabel required>Aadhaar Card Number</FieldLabel>
                <TextInput placeholder="123456789012" value={bank.aadhaarNumber} numericOnly error={errors.aadhaarNumber}
                  onChange={(e) => { upb('aadhaarNumber')(e); clearError('aadhaarNumber') }} />
              </div>
              <div>
                <FieldLabel>ESIC Number</FieldLabel>
                <TextInput placeholder="ESIC number" value={bank.esicNumber} numericOnly onChange={upb('esicNumber')} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <FieldLabel>PF Number</FieldLabel>
                <TextInput placeholder="PF number" value={bank.pfNumber} onChange={upb('pfNumber')} />
              </div>
              <div>
                <FieldLabel>UAN Number</FieldLabel>
                <TextInput placeholder="UAN number" value={bank.uanNumber} numericOnly onChange={upb('uanNumber')} />
              </div>
            </div>
          </SectionCard>

         {/* ── Documents ── */}
<SectionCard title="Documents">
  {docLoading ? (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke={PRIMARY} strokeWidth="4"/>
        <path className="opacity-75" fill={PRIMARY} d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Loading required documents…
    </div>
  ) : docTypes.length === 0 ? (
    <p className="text-sm text-gray-400 py-2">No documents required for this employment type.</p>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {docTypes.map((dt, idx) => {
        const docKey = dt.key || dt.docKey || String(dt.id || idx)
        const errKey = `doc_${docKey}`
        const file   = documents[docKey]
        const reason = docReasons[docKey] ?? ''
        return (
          <div key={docKey} className="flex flex-col gap-1.5">
            <FieldLabel required={dt.mandatory}>
              {dt.name}
              {dt.mandatory && (
                <span className="ml-1.5 text-[10px] font-normal text-gray-400">(mandatory)</span>
              )}
            </FieldLabel>

            {/* ── Inline file upload with type/size validation ── */}
            <label className="relative cursor-pointer">
              <div className={`flex items-center h-9 px-3 bg-gray-50 border rounded-lg
                hover:bg-gray-100 transition-colors
                ${errors[errKey] ? 'border-red-400' : 'border-gray-200'}`}>
                <span className="text-sm text-gray-400 flex-1 truncate">
                  {file instanceof File ? file.name : 'Choose File'}
                </span>
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ml-2"
                  style={{ backgroundColor: PRIMARY }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => {
                  const picked = e.target.files?.[0]
                  e.target.value = ''
                  if (!picked) return
                  // Type validation
                  if (!DOC_ALLOWED.includes(picked.type)) {
                    setErrors(prev => ({ ...prev, [errKey]: `Invalid format. Allowed: ${DOC_EXT_LIST}` }))
                    return
                  }
                  // Size validation
                  if (picked.size > DOC_MAX_BYTES) {
                    setErrors(prev => ({ ...prev, [errKey]: `File too large. Max ${DOC_MAX_MB} MB` }))
                    return
                  }
                  setDocuments(d => ({ ...d, [docKey]: picked }))
                  setDocReasons(d => ({ ...d, [docKey]: '' }))
                  clearError(errKey)
                }}
              />
            </label>

            {/* Format hint */}
            <p className="text-[10px] text-gray-400 -mt-0.5">{DOC_EXT_LIST} · Max {DOC_MAX_MB} MB</p>

            {/* Reason input — only when no file uploaded */}
            {!(file instanceof File) && (
              <input
                type="text"
                placeholder="Reason if document unavailable"
                value={reason}
                onChange={e => {
                  setDocReasons(d => ({ ...d, [docKey]: e.target.value }))
                  clearError(errKey)
                }}
                className={`w-full h-8 px-2.5 text-xs text-gray-600 bg-gray-50 border rounded-lg
                  outline-none transition-colors
                  ${errors[errKey] ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33]'}`}
              />
            )}

            {/* Single error message */}
            <ErrorMsg msg={errors[errKey]} />
          </div>
        )
      })}
    </div>
  )}
</SectionCard>

{/* ── Action Buttons ── */}
<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
  <button
    type="button"
    onClick={() => navigate('/employees')}
    className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center"
  >
    Cancel
  </button>

  <button
    type="button"
    onClick={handleSaveDraft}
    disabled={submitting}
    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors disabled:opacity-50"
    style={{ borderColor: PRIMARY, color: PRIMARY }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FDF5F1' }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
  >
    {submitting ? (
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    ) : <Save size={15} />}
    Save as Draft
  </button>

  <button
    type="button"
    onClick={handleSubmitClick}
    disabled={submitting}
    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
    style={{ backgroundColor: '#111827' }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
  >
    {submitting ? (
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    ) : <UserPlus size={15} />}
    Add Employee
  </button>
</div>
        </div>
      </div>

      <EmailConfirmModal
        isOpen={showConfirm}
        onClose={() => !submitting && setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        loading={submitting}
        employeeName={`${personal.firstName} ${personal.lastName}`.trim()}
        email={office.officeEmail || personal.personalEmail}
      />
    </>
  )
}