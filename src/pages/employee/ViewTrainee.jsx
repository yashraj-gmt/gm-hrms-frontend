// src/pages/employee/ViewTrainee.jsx
// Route: /employee/:id/view   (when employmentType === 'TRAINEE')
//
// This page is reached from EmployeeList when a Trainee row is clicked.
// The unified ViewEmployee route already detects employmentType and can
// delegate here — or route directly. See routing notes at bottom of file.

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Loader2, User, Briefcase, MapPin,
  CreditCard, FileText, Phone, Mail, Calendar, Building2,
  GraduationCap, Clock, AlertCircle, ExternalLink,
  BookOpen, Users, Star,
} from 'lucide-react'
import { useToast }    from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROUTES }      from '@/constants/routes'
import employeeService from '@/services/employeeService'
import apiClient       from '@/services/apiClient'
import profileIcon     from '@/assets/images/profile-icon.png'

const PRIMARY   = '#C35E33'
const PRIMARY_L = '#FDF5F1'
const BORDER    = '#E8C5A8'

// ─── Format helpers ────────────────────────────────────────────────────────────
function fmt(val) { return val ?? '-' }

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
  const n = Number(val)
  if (n === 0) return 'Unpaid'
  return `₹ ${n.toLocaleString('en-IN')}`
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Lookup maps ───────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  ACTIVE:   { bg: '#DCFCE7', color: '#15803D', label: 'Active'   },
  INACTIVE: { bg: '#FEE2E2', color: '#B91C1C', label: 'Inactive' },
  ON_HOLD:  { bg: '#FEF9C3', color: '#854D0E', label: 'On Hold'  },
}

const GENDER_LABEL   = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' }
const MARITAL_LABEL  = { SINGLE: 'Single', MARRIED: 'Married', DIVORCED: 'Divorced', WIDOWED: 'Widowed' }
const WMODE_LABEL    = { REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On Site', ON_SITE: 'On Site' }
const WTYPE_LABEL    = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACTUAL: 'Contractual' }

// ─── Reusable UI atoms (mirrors ViewEmployee exactly) ──────────────────────────
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

function Field({ label, value, mono = false, span = 1, highlight = false }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium break-words ${mono ? 'font-mono' : ''} ${highlight ? 'font-semibold' : 'text-gray-800'}`}
        style={highlight ? { color: PRIMARY } : {}}>
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
  const s = STATUS_STYLE[status] ?? { bg: '#F3F4F6', color: '#6B7280', label: status ?? '—' }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  )
}

// ─── Document card (identical to ViewEmployee) ─────────────────────────────────
function DocCard({ name, filePath, mandatory, reason }) {
  const [imgError, setImgError] = useState(false)
  const hasFile  = !!filePath && !imgError
  const filename = filePath ? filePath.split('/').pop() : null

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
            <FileText size={14} color={hasFile ? '#16A34A' : reason ? '#D97706' : '#9CA3AF'} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
            {mandatory && (
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>
                mandatory
              </span>
            )}
          </div>
        </div>

        {filePath && !imgError && (
          <a href={filePath} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-green-200"
            style={{ backgroundColor: '#DCFCE7' }} title="Open document">
            <ExternalLink size={12} color="#16A34A" />
          </a>
        )}
        {filePath && imgError && (
          <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#FEF9C3' }} title="File could not be loaded">
            <AlertCircle size={12} color="#D97706" />
          </div>
        )}
      </div>

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

// ─── Training timeline bar ─────────────────────────────────────────────────────
function TrainingProgress({ startDate, endDate }) {
  if (!startDate || !endDate) return null
  const start   = new Date(startDate)
  const end     = new Date(endDate)
  const today   = new Date()
  const total   = end - start
  const elapsed = Math.min(Math.max(today - start, 0), total)
  const pct     = total > 0 ? Math.round((elapsed / total) * 100) : 0
  const done    = today >= end

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Training Progress</p>
        <span className="text-[11px] font-bold" style={{ color: done ? '#15803D' : PRIMARY }}>
          {done ? 'Completed' : `${pct}%`}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: done ? '#16A34A' : PRIMARY,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <p className="text-[9px] text-gray-400">{fmtDate(startDate)}</p>
        <p className="text-[9px] text-gray-400">{fmtDate(endDate)}</p>
      </div>
    </div>
  )
}

// ─── Info row for right sidebar ────────────────────────────────────────────────
function InfoRow({ label, value, mono = false, last = false }) {
  return (
    <div className={`flex items-start justify-between gap-2 py-1.5 ${!last ? 'border-b' : ''}`}
      style={{ borderColor: '#F3F4F6' }}>
      <p className="text-[11px] font-semibold text-gray-400 whitespace-nowrap flex-shrink-0">{label}</p>
      <p className={`text-[12px] font-semibold text-gray-800 text-right break-all ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ViewTrainee() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { toast } = useToast()
  const { user }  = useAuthStore()

  const canEdit = user?.role === 'ADMIN' || user?.role === 'HR'

  const [loading,    setLoading]    = useState(true)
  const [emp,        setEmp]        = useState(null)
  const [docList,    setDocList]    = useState([])
  const [docLoading, setDocLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const res  = await employeeService.getById(id)
        const data = res?.data?.data ?? res?.data ?? {}
        setEmp(data)
        if (data?.personalInformationId) {
          fetchDocuments(data.personalInformationId)
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load trainee')
        navigate(ROUTES.EMPLOYEE)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const fetchDocuments = async (personalInformationId) => {
    setDocLoading(true)
    try {
      const res  = await apiClient.get(`/persons/${personalInformationId}/documents`)
      const docs = res?.data?.data ?? res?.data ?? []
      setDocList(Array.isArray(docs) ? docs : [])
    } catch {
      setDocList([])
    } finally {
      setDocLoading(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" size={32} color={PRIMARY} />
          <p className="text-sm text-gray-500">Loading trainee profile…</p>
        </div>
      </div>
    )
  }

  if (!emp) return null

  // ── Destructure API response (mirrors AddTrainee payload shape) ───────────────
  const contact = emp.contact ?? {}

  const {
    // Identity
    traineeCode, employmentType, recordStatus,
    personalInformationId,

    // Personal
    firstName, middleName, lastName,
    gender, dateOfBirth, maritalStatus, spouseOrParentName,
    profileImageUrl,

    // Work profile (flat on DTO — from BaseUserMapper)
    designationName, departmentName, branchName, shiftTiming,
    workMode, workingType, status,
    reportingManagerName,

    // Trainee-specific sub-objects
    trainingDetails,
    educationDetails,
    mentorDetails,

    // Address
    currentAddress, permanentAddress, sameAsCurrent,

    // Bank & Legal
    bankDetails,
  } = emp

  // Contact — from nested sub-object
  const personalPhone  = contact.personalPhone  ?? null
  const emergencyPhone = contact.emergencyPhone ?? null
  const personalEmail  = contact.personalEmail  ?? null
  const officeEmail    = contact.officeEmail    ?? null

  const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ')
  const statusInfo = STATUS_STYLE[status] ?? { bg: '#F3F4F6', color: '#6B7280', label: status }
  const isDraft    = recordStatus === 'DRAFT'

  return (
    <div className="min-h-full pb-10">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(ROUTES.EMPLOYEE)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-xl font-bold text-gray-900">Trainee Profile</h1>
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
    ? ROUTES.EMPLOYEE_TRAINEE_DRAFT.replace(':id', id)
    : ROUTES.EMPLOYEE_TRAINEE_EDIT.replace(':id', id)
)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <Pencil size={14} />
            {isDraft ? 'Continue Editing' : 'Edit Trainee'}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5">

        {/* ── Hero card ── */}
        <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: BORDER }}>

          {/* Banner */}
          <div
            className="relative px-5 pt-5 pb-5 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{
              background: `linear-gradient(135deg, #111827 0%, #1F2937 55%, ${PRIMARY} 100%)`,
              minHeight: 110,
            }}
          >
            {/* Dot-grid texture overlay */}
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
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
                >
                  Trainee
                </span>
                {traineeCode && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
                  >
                    {traineeCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick-stat strip */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Building2 size={14} />, label: 'Department', value: fmt(departmentName) },
              { icon: <MapPin     size={14} />, label: 'Branch',     value: fmt(branchName)     },
              { icon: <Calendar  size={14} />, label: 'Start Date',  value: fmtDate(trainingDetails?.startDate) },
              { icon: <Clock     size={14} />, label: 'Shift',       value: fmt(shiftTiming)    },
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

          {/* ── LEFT col (2/3) ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Personal Information */}
            <SectionCard title="Personal Information" icon={<User size={15} />}>
              <FieldGrid cols={4}>
                <Field label="First Name"   value={fmt(firstName)}  />
                <Field label="Middle Name"  value={fmt(middleName)} />
                <Field label="Last Name"    value={fmt(lastName)}   />
                <Field label="Gender"       value={GENDER_LABEL[gender] ?? fmt(gender)} />
                <Field label="Date of Birth"    value={fmtDate(dateOfBirth)} />
                <Field label="Marital Status"   value={MARITAL_LABEL[maritalStatus] ?? fmt(maritalStatus)} />
                <Field label="Spouse / Parent"  value={fmt(spouseOrParentName)} span={2} />
              </FieldGrid>

              <Divider />

              {/* Contact — sourced from emp.contact */}
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>
                Contact
              </p>
              <FieldGrid cols={2}>
                <div className="flex items-center gap-2">
                  <Phone size={13} color={PRIMARY} className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Personal Phone</p>
                    <p className="text-sm font-medium text-gray-800">{fmt(personalPhone)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} color="#9CA3AF" className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Emergency Phone</p>
                    <p className="text-sm font-medium text-gray-800">{fmt(emergencyPhone)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} color={PRIMARY} className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Personal Email</p>
                    <p className="text-sm font-medium text-gray-800 break-all">{fmt(personalEmail)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} color="#9CA3AF" className="flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Office Email</p>
                    <p className="text-sm font-medium text-gray-800 break-all">{fmt(officeEmail)}</p>
                  </div>
                </div>
              </FieldGrid>
            </SectionCard>

            {/* Office Information */}
            <SectionCard title="Office Information" icon={<Briefcase size={15} />}>
              <FieldGrid cols={3}>
                <Field label="Trainee ID"        value={fmt(traineeCode)}       highlight />
                <Field label="Designation"       value={fmt(designationName)}   />
                <Field label="Department"        value={fmt(departmentName)}    />
                <Field label="Office Email"      value={fmt(officeEmail)}       />
                <Field label="Branch / Location" value={fmt(branchName)}        />
                <Field label="Shift"             value={fmt(shiftTiming)}       />
                <Field label="Reporting Manager" value={fmt(reportingManagerName)} />
                <Field label="Work Mode"         value={WMODE_LABEL[workMode]  ?? fmt(workMode)}    />
                <Field label="Working Type"      value={WTYPE_LABEL[workingType] ?? fmt(workingType)} />
              </FieldGrid>
            </SectionCard>

            {/* Training Details */}
            {trainingDetails && (
              <SectionCard title="Training Details" icon={<Clock size={15} />}>
                <FieldGrid cols={3}>
                  <Field label="Start Date"        value={fmtDate(trainingDetails.startDate)} />
                  <Field label="End Date"          value={fmtDate(trainingDetails.endDate)}   />
                  <Field label="Duration"
                    value={trainingDetails.trainingPeriodMonths
                      ? `${trainingDetails.trainingPeriodMonths} month(s)` : '—'} />
                  <Field label="Stipend"
                    value={fmtCurrency(trainingDetails.stipend)} />
                  <Field label="Work Mode"
                    value={WMODE_LABEL[trainingDetails.workMode]    ?? fmt(trainingDetails.workMode)} />
                  <Field label="Working Type"
                    value={WTYPE_LABEL[trainingDetails.workingType] ?? fmt(trainingDetails.workingType)} />
                </FieldGrid>

                {/* Training progress bar */}
                <TrainingProgress
                  startDate={trainingDetails.startDate}
                  endDate={trainingDetails.endDate}
                />
              </SectionCard>
            )}

            {/* Educational Details */}
            {educationDetails && (
              <SectionCard title="Educational Details" icon={<GraduationCap size={15} />}>
                {/* 12th / HSC */}
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>
                  12th (HSC)
                </p>
                <FieldGrid cols={3}>
                  <Field label="Completion Month" value={fmt(educationDetails.hscCompletion)} />
                  <Field label="Year"             value={educationDetails.hscYear ?? '—'}     />
                </FieldGrid>

                <Divider />

                {/* Bachelor */}
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>
                  Bachelor Degree
                </p>
                <FieldGrid cols={3}>
                  <Field label="Completion Month" value={fmt(educationDetails.bachelorCompletion)} />
                  <Field label="Year"             value={educationDetails.bachelorYear ?? '—'}     />
                </FieldGrid>

                {/* Master (conditional) */}
                {(educationDetails.masterCompletion || educationDetails.masterYear) && (
                  <>
                    <Divider />
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400">
                      Master Degree
                    </p>
                    <FieldGrid cols={3}>
                      <Field label="Completion Month" value={fmt(educationDetails.masterCompletion)} />
                      <Field label="Year"             value={educationDetails.masterYear ?? '—'}     />
                    </FieldGrid>
                  </>
                )}

                <Divider />

                {/* Degree details */}
                <FieldGrid cols={2}>
                  <Field label="Degree Name"    value={fmt(educationDetails.degreeName)}    />
                  <Field label="Degree Result"  value={fmt(educationDetails.degreeResult)}  />
                  <Field label="University"     value={fmt(educationDetails.universityName)} span={2} />
                  <Field label="University Address" value={fmt(educationDetails.universityAddress)} span={2} />
                </FieldGrid>

                <Divider />

                {/* Training completion status */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Training Completion Status
                  </p>
                  {educationDetails.trainingCompletionStatus ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      educationDetails.trainingCompletionStatus === 'Complete'
                        ? 'bg-green-100 text-green-700'
                        : educationDetails.trainingCompletionStatus === 'On Going'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {educationDetails.trainingCompletionStatus}
                    </span>
                  ) : (
                    <p className="text-sm font-medium text-gray-400">—</p>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Mentor / Supervisor Details */}
            {mentorDetails && (
              <SectionCard title="Mentor & Supervisor" icon={<Users size={15} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Mentor */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl border"
                    style={{ borderColor: BORDER, backgroundColor: PRIMARY_L }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: PRIMARY }}>
                      <Star size={14} color="white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Mentor</p>
                      <p className="text-sm font-bold text-gray-900">
                        {mentorDetails.mentorName ?? '—'}
                      </p>
                      {mentorDetails.mentorDesignation && (
                        <p className="text-xs text-gray-500 mt-0.5">{mentorDetails.mentorDesignation}</p>
                      )}
                    </div>
                  </div>

                  {/* Supervisor */}
                  {(mentorDetails.supervisorName || mentorDetails.supervisorEmployeeId) && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl border"
                      style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-200">
                        <Users size={14} color="#6B7280" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Supervisor</p>
                        <p className="text-sm font-bold text-gray-900">
                          {mentorDetails.supervisorName ?? '—'}
                        </p>
                        {mentorDetails.supervisorDesignation && (
                          <p className="text-xs text-gray-500 mt-0.5">{mentorDetails.supervisorDesignation}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Address */}
            <SectionCard title="Address" icon={<MapPin size={15} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          {/* ── RIGHT col (1/3) ── */}
          <div className="flex flex-col gap-5">

            {/* Training at a glance */}
            <SectionCard title="Training Summary" icon={<BookOpen size={15} />}>
              <div className="space-y-0">
                <InfoRow label="Status"       value={statusInfo.label} />
                <InfoRow label="Work Mode"    value={WMODE_LABEL[workMode]    ?? fmt(workMode)} />
                <InfoRow label="Working Type" value={WTYPE_LABEL[workingType] ?? fmt(workingType)} />
                {trainingDetails && (
                  <>
                    <InfoRow label="Duration"
                      value={trainingDetails.trainingPeriodMonths
                        ? `${trainingDetails.trainingPeriodMonths} month(s)` : '—'} />
                    <InfoRow label="Stipend"
                      value={fmtCurrency(trainingDetails.stipend)} />
                    <InfoRow label="Start Date" value={fmtDate(trainingDetails.startDate)} />
                    <InfoRow label="End Date"   value={fmtDate(trainingDetails.endDate)} last />
                  </>
                )}
              </div>
            </SectionCard>

            {/* Bank & Legal */}
            <SectionCard title="Bank & Legal" icon={<CreditCard size={15} />}>
              <div className="space-y-0">
                {[
                  { label: 'Bank Name',    value: bankDetails?.bankName },
                  { label: 'Account No.', value: bankDetails?.accountNumber
                      ? '•••• ' + String(bankDetails.accountNumber).slice(-4) : null },
                  { label: 'IFSC Code',   value: bankDetails?.ifscCode,  mono: true },
                  { label: 'PAN Number',  value: bankDetails?.panNumber,  mono: true },
                  { label: 'Aadhaar No.', value: bankDetails?.aadhaarNumber
                      ? String(bankDetails.aadhaarNumber).replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
                      : null, mono: true },
                  { label: 'PF Number',   value: bankDetails?.pfNumber  },
                  { label: 'UAN Number',  value: bankDetails?.uanNumber  },
                  { label: 'ESIC Number', value: bankDetails?.esicNumber },
                ].map(({ label, value, mono }, i, arr) => (
                  <InfoRow key={label} label={label} value={value || '—'}
                    mono={mono} last={i === arr.length - 1} />
                ))}
              </div>
            </SectionCard>

            {/* Degree snapshot (quick view) */}
            {educationDetails && (
              <SectionCard title="Education Snapshot" icon={<GraduationCap size={15} />}>
                <div className="space-y-0">
                  <InfoRow label="Degree"      value={educationDetails.degreeName}  />
                  <InfoRow label="Result"      value={educationDetails.degreeResult} />
                  <InfoRow label="University"  value={educationDetails.universityName} />
                  <InfoRow label="12th"
                    value={educationDetails.hscCompletion
                      ? `${educationDetails.hscCompletion} ${educationDetails.hscYear ?? ''}`.trim()
                      : '—'} />
                  <InfoRow label="Bachelor"
                    value={educationDetails.bachelorCompletion
                      ? `${educationDetails.bachelorCompletion} ${educationDetails.bachelorYear ?? ''}`.trim()
                      : '—'}
                    last={!educationDetails.masterCompletion} />
                  {educationDetails.masterCompletion && (
                    <InfoRow label="Master"
                      value={`${educationDetails.masterCompletion} ${educationDetails.masterYear ?? ''}`.trim()}
                      last />
                  )}
                </div>
              </SectionCard>
            )}

          </div>
        </div>

        {/* ── Documents — full width ── */}
        <SectionCard title="Documents" icon={<FileText size={15} />}>
          {docLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <Loader2 className="animate-spin w-4 h-4" color={PRIMARY} />
              Loading documents…
            </div>
          ) : docList.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No documents found for this trainee.</p>
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

        {/* ── Draft warning ── */}
        {isDraft && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border-2 border-amber-200 bg-amber-50">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" color="#D97706" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">This record is a draft</p>
              <p className="text-xs text-amber-600 mt-0.5">
                This trainee profile is incomplete. Complete all required fields and submit to activate the account and send login credentials.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => navigate(ROUTES.EMPLOYEE_TRAINEE_DRAFT.replace(':id', id))}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
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