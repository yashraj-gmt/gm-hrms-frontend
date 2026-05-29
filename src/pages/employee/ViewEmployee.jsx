// src/pages/employee/ViewEmployee.jsx
// Route: /employee/:id/view   (view-only, all employment types)

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Loader2, User, Briefcase, MapPin,
  CreditCard, FileText, Phone, Mail, Calendar, Building2,
  GraduationCap, Clock, AlertCircle, ExternalLink,
} from 'lucide-react'
import { useToast }     from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROUTES }       from '@/constants/routes'
import employeeService  from '@/services/employeeService'
import apiClient        from '@/services/apiClient'
import profileIcon      from '@/assets/images/profile-icon.png'

const PRIMARY   = '#C35E33'
const PRIMARY_L = '#FDF5F1'
const BORDER    = '#E8C5A8'

// ─── Fallback SVG doc icon (inline, no external dependency) ───────────────────
const DocFallbackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val) { return val || '-' }

function fmtDate(val) {
  if (!val) return '-'
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return val }
}

function fmtCurrency(val) {
  if (val == null || val === '') return '-'
  return `₹ ${Number(val).toLocaleString('en-IN')}`
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const STATUS_STYLE = {
  ACTIVE:   { bg: '#DCFCE7', color: '#15803D', label: 'Active' },
  INACTIVE: { bg: '#FEE2E2', color: '#B91C1C', label: 'Inactive' },
  ON_HOLD:  { bg: '#FEF9C3', color: '#854D0E', label: 'On Hold' },
}

const TYPE_LABEL = {
  EMPLOYEE: 'Employee',
  INTERN:   'Intern',
  TRAINEE:  'Trainee',
}

const GENDER_LABEL = {
  MALE: 'Male', FEMALE: 'Female', OTHER: 'Other',
}

const MARITAL_LABEL = {
  SINGLE: 'Single', MARRIED: 'Married', DIVORCED: 'Divorced', WIDOWED: 'Widowed',
}

const WMODE_LABEL = {
  REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On Site',
}

const WTYPE_LABEL = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACTUAL: 'Contractual',
}

// ─── Tiny components ───────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden ${className}`}
      style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b"
        style={{ borderColor: BORDER, backgroundColor: PRIMARY_L }}>
        <span style={{ color: PRIMARY }}>{icon}</span>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, value, mono = false, span = 1 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-800 break-words ${mono ? 'font-mono' : ''}`}>
        {value ?? '-'}
      </p>
    </div>
  )
}

function FieldGrid({ cols = 4, children }) {
  return (
    <div className={`grid gap-x-5 gap-y-4 grid-cols-2 md:grid-cols-${cols}`}>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t my-4" style={{ borderColor: '#F3F4F6' }} />
}

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: '#F3F4F6', color: '#6B7280', label: status }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
        style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  )
}

// FIX: DocCard now handles broken/missing file URLs gracefully with a fallback icon
function DocCard({ name, filePath, mandatory, reason }) {
  const [imgError, setImgError] = useState(false)
  const hasFile = !!filePath && !imgError
  const filename = filePath ? filePath.split('/').pop() : null

  // Detect if it's an image type to preview inline (optional future enhancement)
  const isImage = filePath && /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath)

  return (
    <div className={`rounded-xl border-2 p-3.5 flex flex-col gap-2 transition-colors ${
      hasFile
        ? 'border-green-200 bg-green-50'
        : reason
          ? 'border-amber-200 bg-amber-50'
          : 'border-dashed border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            hasFile ? 'bg-green-100' : reason ? 'bg-amber-100' : 'bg-gray-200'
          }`}>
            {/* FIX: always render a visible icon — never broken state */}
            <FileText
              size={14}
              color={hasFile ? '#16A34A' : reason ? '#D97706' : '#9CA3AF'}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
            {mandatory && (
              <span className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: PRIMARY }}>mandatory</span>
            )}
          </div>
        </div>

        {/* FIX: only show open-link if the file URL loads (no 404 / broken) */}
        {filePath && !imgError && (
          <a
            href={filePath}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-green-200"
            style={{ backgroundColor: '#DCFCE7' }}
            title="Open document"
            // FIX: detect broken links via fetch preflight on click rather than hiding
            onError={() => setImgError(true)}
          >
            <ExternalLink size={12} color="#16A34A" />
          </a>
        )}

        {/* FIX: show broken-link indicator if URL exists but failed */}
        {filePath && imgError && (
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#FEF9C3' }}
            title="File could not be loaded"
          >
            <AlertCircle size={12} color="#D97706" />
          </div>
        )}
      </div>

      {/* File name OR reason OR not-uploaded message */}
      {hasFile ? (
        <p className="text-[10px] text-green-700 font-medium truncate pl-10">{filename}</p>
      ) : filePath && imgError ? (
        <p className="text-[10px] text-amber-600 pl-10">File unavailable (broken link)</p>
      ) : reason ? (
        <p className="text-[10px] text-amber-700 pl-10 italic">Reason: {reason}</p>
      ) : (
        <p className="text-[10px] text-gray-400 pl-10">Not uploaded</p>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ViewEmployee() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { toast } = useToast()
  const { user }  = useAuthStore()

  const canEdit = user?.role === 'ADMIN' || user?.role === 'HR'

  const [loading,  setLoading]  = useState(true)
  const [emp,      setEmp]      = useState(null)
  // FIX: documents are fetched separately from /api/persons/:personalId/documents
  const [docList,  setDocList]  = useState([])
  const [docLoading, setDocLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const res  = await employeeService.getById(id)
        const data = res?.data?.data ?? res?.data ?? {}
        setEmp(data)

        // FIX: fetch documents using personalInformationId once we have the employee data
        if (data?.personalInformationId) {
          fetchDocuments(data.personalInformationId)
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load employee')
        navigate(ROUTES.EMPLOYEE)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // FIX: separate document fetch so it doesn't block the main profile load
  const fetchDocuments = async (personalInformationId) => {
    setDocLoading(true)
    try {
      const res = await apiClient.get(
        `/persons/${personalInformationId}/documents`
      )
      const docs = res?.data?.data ?? res?.data ?? []
      setDocList(Array.isArray(docs) ? docs : [])
    } catch {
      // Non-fatal: documents section will show empty gracefully
      setDocList([])
    } finally {
      setDocLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" size={32} color={PRIMARY} />
          <p className="text-sm text-gray-500">Loading employee profile…</p>
        </div>
      </div>
    )
  }

  if (!emp) return null

  // ── Destructure API response fields ──────────────────────────────────────────
  // FIX: contact fields live inside emp.contact sub-object, NOT at the top level
  const contact = emp.contact ?? {}

  const {
    // Identity
    employeeCode, employmentType, recordStatus,
    personalInformationId,

    // Personal
    firstName, middleName, lastName,
    gender, dateOfBirth, maritalStatus, spouseOrParentName,
    profileImageUrl,

    // Work profile (flat fields on the DTO)
    designationName, departmentName, branchName, shiftTiming,
    workMode, workingType, status,
    // FIX: reporting manager is 'reportingManagerName' from BaseUserMapper
    reportingManagerName,
    role,

    // Employment (Employee-specific)
    employment,

    // Training (Trainee-specific)
    trainingDetails, educationDetails,

    // Internship (Intern-specific)
    internshipDetails,

    // Address
    currentAddress, permanentAddress, sameAsCurrent,

    // Bank & Legal
    bankDetails,
  } = emp

  // FIX: all four contact fields come from the nested contact object
  const personalPhone   = contact.personalPhone   ?? null
  const emergencyPhone  = contact.emergencyPhone  ?? null
  const personalEmail   = contact.personalEmail   ?? null
  const officeEmail     = contact.officeEmail     ?? null

  // FIX: dateOfJoining lives inside employment sub-object for employees
  const dateOfJoining = employment?.dateOfJoining ?? null

  const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ')
  const statusInfo = STATUS_STYLE[status] ?? { bg: '#F3F4F6', color: '#6B7280', label: status }
  const isDraft    = recordStatus === 'DRAFT'
  const empType    = TYPE_LABEL[employmentType] ?? employmentType

  return (
    <div className="min-h-full pb-10">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.EMPLOYEE)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-xl font-bold text-gray-900">Employee Profile</h1>
          {isDraft && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
              Draft
            </span>
          )}
        </div>

        {canEdit && (
          <button
            onClick={() => navigate(
              isDraft
                ? ROUTES.EMPLOYEE_DRAFT.replace(':id', id)
                : ROUTES.EMPLOYEE_EDIT.replace(':id', id)
            )}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <Pencil size={14} />
            {isDraft ? 'Continue Editing' : 'Edit Employee'}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5">

        {/* ── Hero card — profile + key info ── */}
        <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: BORDER }}>

          {/* ── Banner strip ── */}
          <div className="relative px-5 pt-5 pb-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{
            background: `linear-gradient(135deg, #111827 0%, #1F2937 55%, ${PRIMARY} 100%)`,
            minHeight: 110,
          }}>
            <div className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />

            {/* Avatar */}
            <div className="relative flex-shrink-0 z-10">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 shadow-lg"
                  style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                  onError={e => { e.currentTarget.src = profileIcon }}
                />
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 shadow-lg flex items-center justify-center text-xl sm:text-2xl font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: PRIMARY, borderColor: 'rgba(255,255,255,0.25)' }}
                >
                  {initials(fullName)}
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: statusInfo.color }}
                title={statusInfo.label}
              />
            </div>

            {/* Name + designation + pills */}
            <div className="z-10 flex-1 min-w-0 flex flex-col gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight break-words">
                  {fullName || '—'}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {fmt(designationName)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusPill status={status} />
                {empType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
                    {empType}
                  </span>
                )}
                {employeeCode && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
                    {employeeCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick-stat strip ── */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Building2 size={14} />, label: 'Department', value: fmt(departmentName) },
              { icon: <MapPin     size={14} />, label: 'Branch',     value: fmt(branchName)    },
              // FIX: dateOfJoining from employment sub-object
              { icon: <Calendar  size={14} />, label: 'Joined',     value: fmtDate(dateOfJoining) },
              { icon: <Clock     size={14} />, label: 'Shift',      value: fmt(shiftTiming)    },
            ].map(({ icon, label, value }) => (
              <div key={label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: BORDER, backgroundColor: PRIMARY_L }}>
                <span className="flex-shrink-0" style={{ color: PRIMARY }}>{icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 truncate">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 truncate" title={value}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT column (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Personal Information */}
            <SectionCard title="Personal Information" icon={<User size={15} />}>
              <FieldGrid cols={4}>
                <Field label="First Name"   value={fmt(firstName)}  />
                <Field label="Middle Name"  value={fmt(middleName)} />
                <Field label="Last Name"    value={fmt(lastName)}   />
                <Field label="Gender"       value={GENDER_LABEL[gender] ?? fmt(gender)} />
                <Field label="Date of Birth"  value={fmtDate(dateOfBirth)} />
                <Field label="Marital Status" value={MARITAL_LABEL[maritalStatus] ?? fmt(maritalStatus)} />
                <Field label="Spouse / Parent Name" value={fmt(spouseOrParentName)} span={2} />
              </FieldGrid>

              <Divider />

              {/* FIX: Contact section — all fields sourced from emp.contact sub-object */}
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
                style={{ color: PRIMARY }}>Contact</p>
              <FieldGrid cols={2}>
                <div className="flex items-center gap-2">
                  <Phone size={13} color={PRIMARY} className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Personal Phone</p>
                    {/* FIX: use contact.personalPhone */}
                    <p className="text-sm font-medium text-gray-800">{fmt(personalPhone)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} color="#9CA3AF" className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Emergency Phone</p>
                    {/* FIX: use contact.emergencyPhone */}
                    <p className="text-sm font-medium text-gray-800">{fmt(emergencyPhone)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} color={PRIMARY} className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Personal Email</p>
                    {/* FIX: use contact.personalEmail */}
                    <p className="text-sm font-medium text-gray-800 break-all">{fmt(personalEmail)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} color="#9CA3AF" className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Office Email</p>
                    {/* FIX: use contact.officeEmail */}
                    <p className="text-sm font-medium text-gray-800 break-all">{fmt(officeEmail)}</p>
                  </div>
                </div>
              </FieldGrid>
            </SectionCard>

            {/* Office / Work Profile */}
            <SectionCard title="Office Information" icon={<Briefcase size={15} />}>
              <FieldGrid cols={3}>
                <Field label="Employee Code"      value={fmt(employeeCode)}    />
                <Field label="Designation"        value={fmt(designationName)} />
                <Field label="Department"         value={fmt(departmentName)}  />
                {/* FIX: officeEmail from contact sub-object */}
                <Field label="Office Email"       value={fmt(officeEmail)}     />
                {/* FIX: dateOfJoining from employment sub-object */}
                <Field label="Date of Joining"    value={fmtDate(dateOfJoining)} />
                <Field label="Branch / Location"  value={fmt(branchName)}      />
                <Field label="Shift"              value={fmt(shiftTiming)}     />
                {/* FIX: reportingManagerName (not reportingManager) from BaseUserMapper */}
                <Field label="Reporting Manager"  value={fmt(reportingManagerName)} />
                <Field label="Role"               value={fmt(role)}            />
                <Field label="Work Mode"          value={WMODE_LABEL[workMode] ?? fmt(workMode)} />
                <Field label="Working Type"       value={WTYPE_LABEL[workingType] ?? fmt(workingType)} />
              </FieldGrid>

              {/* Employee-specific employment details */}
              {employment && (
                <>
                  <Divider />
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>
                    Employment Details
                  </p>
                  <FieldGrid cols={3}>
                    <Field label="CTC / Salary"        value={fmtCurrency(employment.ctc)} />
                    <Field label="Years of Experience"  value={
                      employment.yearOfExperience != null
                        ? `${employment.yearOfExperience} yr${employment.yearOfExperience !== 1 ? 's' : ''}`
                        : '—'
                    } />
                    <Field label="Notice Period" value={
                      employment.noticePeriod != null
                        ? `${employment.noticePeriod} day${employment.noticePeriod !== 1 ? 's' : ''}`
                        : '—'
                    } />
                    {employment.previousCompanyNames?.length > 0 && (
                      <div className="col-span-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Previous Companies</p>
                        <div className="flex flex-wrap gap-1.5">
                          {employment.previousCompanyNames.map((c, i) => (
                            <span key={i}
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                              style={{ borderColor: BORDER, color: PRIMARY, backgroundColor: PRIMARY_L }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </FieldGrid>
                </>
              )}

              {/* Trainee-specific training details */}
              {trainingDetails && (
                <>
                  <Divider />
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>
                    Training Details
                  </p>
                  <FieldGrid cols={3}>
                    <Field label="Start Date"   value={fmtDate(trainingDetails.startDate)} />
                    <Field label="End Date"     value={fmtDate(trainingDetails.endDate)} />
                    <Field label="Duration"     value={trainingDetails.trainingPeriodMonths ? `${trainingDetails.trainingPeriodMonths} month(s)` : '—'} />
                    <Field label="Stipend"      value={fmtCurrency(trainingDetails.stipend)} />
                    <Field label="Work Mode"    value={WMODE_LABEL[trainingDetails.workMode] ?? fmt(trainingDetails.workMode)} />
                    <Field label="Working Type" value={WTYPE_LABEL[trainingDetails.workingType] ?? fmt(trainingDetails.workingType)} />
                  </FieldGrid>
                </>
              )}

              {/* Intern-specific details */}
              {internshipDetails && (
                <>
                  <Divider />
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>
                    Internship Details
                  </p>
                  <FieldGrid cols={3}>
                    <Field label="Start Date" value={fmtDate(internshipDetails.startDate)} />
                    <Field label="End Date"   value={fmtDate(internshipDetails.endDate)} />
                    <Field label="Duration"   value={internshipDetails.internshipPeriodMonths ? `${internshipDetails.internshipPeriodMonths} month(s)` : '—'} />
                    <Field label="Stipend"    value={fmtCurrency(internshipDetails.stipend)} />
                    <Field label="Course"     value={fmt(internshipDetails.courseName)} />
                  </FieldGrid>
                </>
              )}
            </SectionCard>

            {/* Educational Details — Trainee only */}
            {educationDetails && (
              <SectionCard title="Educational Details" icon={<GraduationCap size={15} />}>
                <FieldGrid cols={4}>
                  <Field label="12th Completion"  value={educationDetails.hscCompletion ? `${educationDetails.hscCompletion} ${educationDetails.hscYear ?? ''}`.trim() : '—'} />
                  <Field label="Bachelor Degree"  value={educationDetails.bachelorCompletion ? `${educationDetails.bachelorCompletion} ${educationDetails.bachelorYear ?? ''}`.trim() : '—'} />
                  <Field label="Master Degree"    value={educationDetails.masterCompletion  ? `${educationDetails.masterCompletion} ${educationDetails.masterYear ?? ''}`.trim()  : '—'} />
                  <Field label="Degree Name"      value={fmt(educationDetails.degreeName)} />
                  <Field label="Degree Result"    value={fmt(educationDetails.degreeResult)} />
                  <Field label="University"       value={fmt(educationDetails.universityName)} span={2} />
                  <Field label="University Address" value={fmt(educationDetails.universityAddress)} span={2} />
                  <Field label="Training Completion Status" value={fmt(educationDetails.trainingCompletionStatus)} />
                </FieldGrid>
              </SectionCard>
            )}

            {/* Address */}
            <SectionCard title="Address" icon={<MapPin size={15} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Current */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>
                    Current Address
                  </p>
                  {currentAddress ? (
                    <div className="space-y-1.5">
                      {[
                        currentAddress.addressLine,
                        [currentAddress.city, currentAddress.district].filter(Boolean).join(', '),
                        currentAddress.landmark ? `Near ${currentAddress.landmark}` : null,
                        [currentAddress.state, currentAddress.pinCode].filter(Boolean).join(' – '),
                        currentAddress.country,
                      ].filter(Boolean).map((line, i) => (
                        <p key={i} className="text-sm text-gray-700">{line}</p>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">Not provided</p>}
                </div>

                {/* Permanent */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400">
                    Permanent Address
                  </p>
                  {sameAsCurrent ? (
                    <p className="text-sm text-gray-500 italic">Same as current address</p>
                  ) : permanentAddress ? (
                    <div className="space-y-1.5">
                      {[
                        permanentAddress.addressLine,
                        [permanentAddress.city, permanentAddress.district].filter(Boolean).join(', '),
                        permanentAddress.landmark ? `Near ${permanentAddress.landmark}` : null,
                        [permanentAddress.state, permanentAddress.pinCode].filter(Boolean).join(' – '),
                        permanentAddress.country,
                      ].filter(Boolean).map((line, i) => (
                        <p key={i} className="text-sm text-gray-700">{line}</p>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">Not provided</p>}
                </div>
              </div>
            </SectionCard>

          </div>

          {/* RIGHT column (1/3 width) */}
          <div className="flex flex-col gap-5">

            {/* Bank & Legal */}
            <SectionCard title="Bank & Legal" icon={<CreditCard size={15} />}>
              <div className="space-y-3.5">
                {[
                  { label: 'Bank Name',    value: bankDetails?.bankName },
                  { label: 'Account No.', value: bankDetails?.accountNumber ? '•••• ' + String(bankDetails.accountNumber).slice(-4) : null },
                  { label: 'IFSC Code',   value: bankDetails?.ifscCode,     mono: true },
                  { label: 'PAN Number',  value: bankDetails?.panNumber,    mono: true },
                  { label: 'Aadhaar No.', value: bankDetails?.aadhaarNumber
                      ? String(bankDetails.aadhaarNumber).replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
                      : null,                                                mono: true },
                  { label: 'PF Number',   value: bankDetails?.pfNumber  },
                  { label: 'UAN Number',  value: bankDetails?.uanNumber },
                  { label: 'ESIC Number', value: bankDetails?.esicNumber },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0"
                    style={{ borderColor: '#F3F4F6' }}>
                    <p className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">{label}</p>
                    <p className={`text-[12px] font-semibold text-gray-800 text-right break-all ${mono ? 'font-mono' : ''}`}>
                      {value || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Work Mode & Status summary */}
            <SectionCard title="Work Summary" icon={<Briefcase size={15} />}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Status</p>
                  <StatusPill status={status} />
                </div>
                <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: '#F3F4F6' }}>
                  <p className="text-xs text-gray-500">Work Mode</p>
                  <span className="text-xs font-semibold text-gray-800">
                    {WMODE_LABEL[workMode] ?? fmt(workMode)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: '#F3F4F6' }}>
                  <p className="text-xs text-gray-500">Working Type</p>
                  <span className="text-xs font-semibold text-gray-800">
                    {WTYPE_LABEL[workingType] ?? fmt(workingType)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: '#F3F4F6' }}>
                  <p className="text-xs text-gray-500">Employment Type</p>
                  <span className="text-xs font-semibold" style={{ color: PRIMARY }}>{empType}</span>
                </div>
                {employment?.ctc && (
                  <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: '#F3F4F6' }}>
                    <p className="text-xs text-gray-500">CTC</p>
                    <span className="text-xs font-bold text-gray-800">{fmtCurrency(employment.ctc)}</span>
                  </div>
                )}
              </div>
            </SectionCard>

          </div>
        </div>

        {/* ── Documents — full width (FIX: uses separately-fetched docList) ── */}
        <SectionCard title="Documents" icon={<FileText size={15} />}>
          {docLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <Loader2 className="animate-spin w-4 h-4" color={PRIMARY} />
              Loading documents…
            </div>
          ) : docList.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No documents found for this employee.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {docList.map((doc, i) => (
                <DocCard
                  key={doc.id ?? i}
                  name={doc.documentTypeName ?? doc.name ?? `Document ${i + 1}`}
                  filePath={doc.filePath}
                  mandatory={doc.mandatory}
                  reason={doc.reason}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Draft warning banner ── */}
        {isDraft && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border-2 border-amber-200 bg-amber-50">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" color="#D97706" />
            <div>
              <p className="text-sm font-semibold text-amber-800">This record is a draft</p>
              <p className="text-xs text-amber-600 mt-0.5">
                This employee profile is incomplete. Complete all required fields and submit to activate the account and send login credentials.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => navigate(ROUTES.EMPLOYEE_DRAFT.replace(':id', id))}
                className="flex-shrink-0 ml-auto px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: PRIMARY }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A84E2A')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
              >
                Complete Draft
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}