// src/pages/employee/AddTrainee.jsx
// Unified page — handles Add, Edit Draft, and Edit (submitted) modes
// Routes:
//   /employee/add-trainee          → Add mode
//   /trainee/:id/draft             → Edit Draft mode  (personalInformationId)
//   /trainee/:id/edit              → Edit Submitted mode (personalInformationId)

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Mail, Save, UserPlus, ArrowLeft, Loader2, FileText, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import SearchableSelect from '@/components/shared/SearchableSelect'
import employeeService from '@/services/employeeService'
import apiClient from '@/services/apiClient'
import shiftService from '@/services/shiftService'

const getFileUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return path.startsWith('/') ? path : '/' + path
}


const PRIMARY = '#C35E33'

// ─── File-upload constraints ───────────────────────────────────────────────
const PROFILE_PHOTO_MAX_MB    = 5
const PROFILE_PHOTO_MAX_BYTES = PROFILE_PHOTO_MAX_MB * 1024 * 1024
const PROFILE_PHOTO_ALLOWED   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const PROFILE_PHOTO_EXT_LIST  = 'JPG, JPEG, PNG, GIF, WEBP'

const DOC_MAX_MB    = 5
const DOC_MAX_BYTES = DOC_MAX_MB * 1024 * 1024
const DOC_ALLOWED   = ['application/pdf', 'image/jpeg', 'image/png']
const DOC_EXT_LIST  = 'PDF, JPG, PNG'

const EMPLOYMENT_TYPE_ROUTES = {
  Internship: '/employee/add-intern',
  Training:   '/employee/add-trainee',
  Employee:   '/employee/add',
}

// ─── Regex helpers ─────────────────────────────────────────────────────────
const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const PAN_RE   = /^[A-Z]{5}\d{4}[A-Z]$/
const ADHAR_RE = /^\d{12}$/
const IFSC_RE  = /^[A-Z]{4}0[A-Z0-9]{6}$/

const API_TO_WMODE  = { REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On site', ON_SITE: 'On site' }
const API_TO_WTYPE  = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACTUAL: 'Contractual' }
const API_TO_STATUS = { ACTIVE: 'Active', INACTIVE: 'Inactive', ON_HOLD: 'On Hold' }
const STATUS_TO_API = { Active: 'ACTIVE', Inactive: 'INACTIVE', 'On Hold': 'ON_HOLD' }

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR - 19 + i))

// ─── Validation helpers ─────────────────────────────────────────────────────
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

function buildErrors(p, office, training, edu, addr, bank, docs, docReasons, docTypes) {
  const errs = {}

  if (!p.firstName.trim())   errs.firstName     = 'First name is required'
  if (!p.middleName.trim())  errs.middleName    = 'Middle name is required'
  if (!p.lastName.trim())    errs.lastName      = 'Last name is required'
  if (!p.gender)             errs.gender        = 'Gender is required'
  if (!p.dob)                errs.dob           = 'Date of birth is required'
  if (!p.maritalStatus)      errs.maritalStatus = 'Marital status is required'
  if (!p.spouseName.trim())  errs.spouseName    = 'Spouse / parent name is required'

  // ✅ FIX 3: Profile photo required only if no existing URL and no new file chosen
  const hasExistingPhoto = typeof p.profilePhoto === 'string' && p.profilePhoto.trim()
  const hasNewPhoto      = p.profilePhoto instanceof File
  if (!hasExistingPhoto && !hasNewPhoto) errs.profilePhoto = 'Profile photo is required'

  const phoneErr = validatePhone(p.personalPhone, 'Personal phone')
  if (phoneErr) errs.personalPhone = phoneErr

  const emergErr = validatePhone(p.emergencyPhone, 'Emergency phone')
  if (emergErr) errs.emergencyPhone = emergErr

  const emailErr = validateEmail(p.personalEmail, 'Personal email')
  if (emailErr) errs.personalEmail = emailErr

  if (!office.designationId)       errs.designation  = 'Designation is required'
  if (!office.departmentId)        errs.department   = 'Department is required'
  if (!office.workLocationId)      errs.workLocation = 'Branch / work location is required'
  if (!office.shiftId)             errs.shiftId      = 'Shift is required'
  if (!office.officeEmail.trim())  errs.officeEmail  = 'Office email is required'
  else if (!EMAIL_RE.test(office.officeEmail)) errs.officeEmail = 'Office email is not valid'

  if (!training.startDate) errs.startDate = 'Training start date is required'
  if (!training.endDate)   errs.endDate   = 'Training end date is required'
  if (training.startDate && training.endDate && training.endDate < training.startDate)
    errs.endDate = 'End date cannot be before start date'
  if (!training.trainingPeriodMonths)
    errs.trainingPeriodMonths = 'Training period is required'
  if (training.stipend === '' || training.stipend === null || training.stipend === undefined)
    errs.stipend = 'Stipend is required (enter 0 for unpaid)'
  else if (isNaN(training.stipend) || Number(training.stipend) < 0)
    errs.stipend = 'Stipend must be a non-negative number'

  if (!edu.hscMonth)              errs.hscMonth           = '12th completion month is required'
  if (!edu.hscYear)               errs.hscYear            = '12th year is required'
  if (!edu.bachelorMonth)         errs.bachelorMonth      = 'Bachelor completion month is required'
  if (!edu.bachelorYear)          errs.bachelorYear       = 'Bachelor year is required'
  if (!edu.degreeName.trim())     errs.degreeName         = 'Degree name is required'
  if (!edu.degreeResult.trim())   errs.degreeResult       = 'Degree result is required'
  if (!edu.universityName.trim()) errs.universityName     = 'University name is required'
  if (!edu.universityAddress.trim()) errs.universityAddress = 'University address is required'
  if (!edu.trainingStatus)        errs.trainingStatus     = 'Training completion status is required'

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

  if (Array.isArray(docTypes)) {
    docTypes.forEach(dt => {
      if (dt.mandatory) {
        const key       = dt.key || dt.docKey || String(dt.id)
        const hasFile   = docs[key] instanceof File || (docs[key] && (typeof docs[key] === 'string' || docs[key].filePath))
        const hasReason = docReasons?.[key]?.trim()
        if (!hasFile && !hasReason)
          errs[`doc_${key}`] = `${dt.name} is required (upload file or provide reason)`
      }
    })
  }

  return errs
}

// ─── Reusable UI primitives ─────────────────────────────────────────────────
function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-medium text-gray-500 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function ErrorMsg({ msg }) {
  return msg ? <p className="text-[11px] text-red-500 mt-0.5">{msg}</p> : null
}

function TextInput({ placeholder, type = 'text', value, onChange, error, className = '', numericOnly = false, readOnly = false }) {
  const h = (e) => {
    if (numericOnly) onChange({ target: { value: e.target.value.replace(/\D/g, '') } })
    else onChange(e)
  }
  return (
    <>
      <input
        type={type} placeholder={placeholder} value={value} onChange={h} readOnly={readOnly}
        className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border rounded-lg outline-none transition-colors placeholder:text-gray-400
          ${error       ? 'border-red-400 focus:border-red-500'
          : readOnly    ? 'border-gray-100 bg-gray-100 cursor-not-allowed opacity-70'
                        : 'border-gray-200 focus:border-[#C35E33] focus:bg-white'} ${className}`}
      />
      <ErrorMsg msg={error} />
    </>
  )
}

function SelectInput({ children, value, onChange, error }) {
  return (
    <>
      <select value={value} onChange={onChange}
        className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border rounded-lg outline-none appearance-none cursor-pointer transition-colors
          ${error ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33] focus:bg-white'}`}>
        {children}
      </select>
      <ErrorMsg msg={error} />
    </>
  )
}

function PhoneInput({ code = '+91', onCodeChange, value, onChange, error }) {
  const h = (e) => onChange({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 10) } })
  return (
    <>
      <div className="flex h-9">
        <select
          value={code}
          onChange={onCodeChange}
          className="flex items-center px-1 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-xs text-gray-500 outline-none cursor-pointer"
        >
          <option value="+91">+91</option>
          <option value="+1">+1</option>
          <option value="+44">+44</option>
          <option value="+971">+971</option>
          <option value="+65">+65</option>
          <option value="+61">+61</option>
          <option value="+966">+966</option>
          <option value="+968">+968</option>
          <option value="+974">+974</option>
          <option value="+973">+973</option>
          <option value="+965">+965</option>
        </select>
        <input type="tel" inputMode="numeric" placeholder="9876543210" value={value} onChange={h} maxLength={10}
          className={`flex-1 min-w-0 px-2 text-sm text-gray-700 bg-gray-50 border rounded-r-lg outline-none transition-colors
            ${error ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33]'}`} />
      </div>
      <ErrorMsg msg={error} />
    </>
  )
}

function RadioOption({ name, value, checked, onChange, label }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="hidden" />
      <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ borderColor: checked ? PRIMARY : '#D1D5DB', backgroundColor: checked ? PRIMARY : 'transparent' }}>
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      <span className="text-xs text-gray-600 whitespace-nowrap">{label}</span>
    </label>
  )
}

// ─── Profile Photo Upload with preview + fallback ──────────────────────────
function ProfilePhotoUpload({ file, onChange, error }) {
  const [fileError, setFileError] = useState(false)

  useEffect(() => {
    let active = true
    if (typeof file === 'string' && file) {
      const url = getFileUrl(file)
      fetch(url, { method: 'HEAD' })
        .then((res) => {
          if (active) setFileError(!res.ok)
        })
        .catch(() => {
          if (active) setFileError(true)
        })
    } else {
      const timer = setTimeout(() => {
        if (active) setFileError(false)
      }, 0)
      return () => clearTimeout(timer)
    }
    return () => {
      active = false
    }
  }, [file])

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

  const displayName = file instanceof File
    ? file.name
    : typeof file === 'string' && file
      ? file.split('/').pop()
      : null

  const handleView = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!file) return
    if (file instanceof File) {
      const url = URL.createObjectURL(file)
      window.open(url, '_blank')
    } else {
      window.open(getFileUrl(file), '_blank')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="relative cursor-pointer flex-1">
          <div className={`flex items-center h-9 px-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors ${
            error ? 'border-red-400' : 'border-gray-200'
          }`}>
            <span className="text-sm text-gray-400 flex-1 truncate">
              {displayName || 'Choose Photo'}
            </span>
            <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ml-2" style={{ backgroundColor: PRIMARY }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
          <input type="file" className="hidden" accept={PROFILE_PHOTO_ALLOWED.join(',')} onChange={handleChange} />
        </label>

        {file && (
          <button
            type="button"
            onClick={handleView}
            className="h-9 px-3 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
            style={{ color: PRIMARY, borderColor: '#E5E7EB' }}
            title="View photo"
          >
            <ExternalLink size={12} />
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
        Formats: {PROFILE_PHOTO_EXT_LIST} · Max {PROFILE_PHOTO_MAX_MB} MB
      </p>
      {fileError && (
        <p className="text-[10px] text-red-500 font-semibold mt-0.5">
          File not found (unable to open the file)
        </p>
      )}
      <ErrorMsg msg={error} />
    </div>
  )
}

function DocumentUploadRow({ dt, file, reason, error, onFileChange, onReasonChange }) {
  const [fileError, setFileError] = useState(false)

  useEffect(() => {
    let active = true
    const filePath = file && !(file instanceof File) ? file.filePath : null
    if (filePath) {
      const url = getFileUrl(filePath)
      fetch(url, { method: 'HEAD' })
        .then((res) => {
          if (active) setFileError(!res.ok)
        })
        .catch(() => {
          if (active) setFileError(true)
        })
    } else {
      const timer = setTimeout(() => {
        if (active) setFileError(false)
      }, 0)
      return () => clearTimeout(timer)
    }
    return () => {
      active = false
    }
  }, [file])

  const handleView = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!file) return
    if (file instanceof File) {
      const url = URL.createObjectURL(file)
      window.open(url, '_blank')
    } else if (file.filePath) {
      window.open(getFileUrl(file.filePath), '_blank')
    }
  }

  const displayName = file instanceof File
    ? file.name
    : file && typeof file === 'object' && file.name
      ? file.name
      : 'Choose File'

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel required={dt.mandatory}>
        {dt.name}
        {dt.mandatory && (
          <span className="ml-1.5 text-[10px] font-normal text-gray-400">(mandatory)</span>
        )}
      </FieldLabel>

      <div className="flex items-center gap-2">
<label className="relative cursor-pointer flex-1 min-w-0">
            <div className={`flex items-center h-9 px-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors ${
            error ? 'border-red-400' : 'border-gray-200'
          }`}>
            <span className="text-sm text-gray-400 flex-1 truncate min-w-0">
              {displayName}
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
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => {
              const picked = e.target.files?.[0]
              e.target.value = ''
              if (!picked) return
              if (!DOC_ALLOWED.includes(picked.type)) {
                onFileChange(null, `Invalid format. Allowed: ${DOC_EXT_LIST}`)
                return
              }
              if (picked.size > DOC_MAX_BYTES) {
                onFileChange(null, `File too large. Max ${DOC_MAX_MB} MB`)
                return
              }
              onFileChange(picked, null)
            }}
          />
        </label>

        {file && (
          <button
            type="button"
            onClick={handleView}
            className="h-9 px-3 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            style={{ color: PRIMARY, borderColor: '#E5E7EB' }}
            title="View document"
          >
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-400 -mt-0.5">{DOC_EXT_LIST} · Max {DOC_MAX_MB} MB</p>

      {fileError && (
        <p className="text-[10px] text-red-500 font-semibold -mt-1">
          File not found (unable to open the file)
        </p>
      )}

      {!file && (
        <input type="text" placeholder="Reason if document unavailable" value={reason}
          onChange={e => onReasonChange(e.target.value)}
          className={`w-full h-8 px-2.5 text-xs text-gray-600 bg-gray-50 border rounded-lg outline-none transition-colors ${
            error ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33]'
          }`}
        />
      )}

      <ErrorMsg msg={error} />
    </div>
  )
}

// ─── Month-Year Picker ──────────────────────────────────────────────────────
function MonthYearPicker({ monthValue, yearValue, onMonthChange, onYearChange, monthError, yearError, required }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <FieldLabel required={required}>Month</FieldLabel>
        <SelectInput value={monthValue} onChange={e => onMonthChange(e.target.value)} error={monthError}>
          <option value="">Month</option>
          {MONTH_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
        </SelectInput>
      </div>
      <div className="flex-1">
        <FieldLabel required={required}>Year</FieldLabel>
        <SelectInput value={yearValue} onChange={e => onYearChange(e.target.value)} error={yearError}>
          <option value="">Year</option>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </SelectInput>
      </div>
    </div>
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

// ─── Email Confirmation Modal ───────────────────────────────────────────────
function EmailConfirmModal({ isOpen, onClose, onConfirm, loading, traineeName, email, isEdit }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: 420, margin: '0 16px' }}>
        <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ backgroundColor: '#111827' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100">
              <Mail size={14} color="#1E40AF" />
            </div>
            <h2 className="text-white font-semibold text-sm">Confirm Submission</h2>
          </div>
          <button onClick={onClose} disabled={loading}
            className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 disabled:opacity-40">
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
            <p className="text-base font-bold text-gray-900 mb-1">
              {isEdit ? 'Submit Trainee?' : 'Send Credentials?'}
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              This will {isEdit ? 'finalise the record' : 'create the trainee record'} for{' '}
              <strong className="text-gray-700">{traineeName}</strong> and send login credentials
              to <strong className="text-gray-700">{email || 'the provided email'}</strong>.
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#2563EB' }}>
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            )}
            <Mail size={14} /> Submit & Send Email
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AddTrainee() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()
  const { toast } = useToast()

  // ✅ FIX: Mode detection updated for new trainee-specific routes
  // /trainee/:id/draft  → isDraftMode
  // /trainee/:id/edit   → isEditMode
  // /employee/add-trainee → isAddMode
  const isDraftMode = !!id && location.pathname.includes('/draft')
  const isEditMode  = !!id && location.pathname.includes('/edit')
  const isAddMode   = !id

  const pageTitle = isEditMode  ? 'Edit Trainee'
                  : isDraftMode ? 'Edit Draft'
                  :               'Add Trainee'

  // ── Loading / UI states ──────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(!!id)
  const [errors,      setErrors]      = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ✅ FIX 5: Store traineeDbId (the Trainee table PK) for the update API call
  const [traineeDbId, setTraineeDbId] = useState(null)

  // ── Dropdown data ────────────────────────────────────────────────────────
  const [departments,   setDepartments]   = useState([])
  const [designations,  setDesignations]  = useState([])
  const [branches,      setBranches]      = useState([])
  const [shifts,        setShifts]        = useState([])
  const [docTypes,      setDocTypes]      = useState([])
  const [deptLoading,   setDeptLoading]   = useState(true)
  const [desigLoading,  setDesigLoading]  = useState(true)
  const [branchLoading, setBranchLoading] = useState(true)
  const [shiftLoading,  setShiftLoading]  = useState(true)
  const [docLoading,    setDocLoading]    = useState(true)

  // ── Form state ───────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: '', middleName: '', lastName: '', gender: '',
    dob: '', personalPhone: '', personalPhoneCode: '+91',
    emergencyPhone: '', emergencyPhoneCode: '+91', personalEmail: '',
    maritalStatus: '', spouseName: '', profilePhoto: null,
  })

  const [office, setOffice] = useState({
    traineeId: '',
    designation: '', designationId: null,
    department: '',  departmentId: null,
    officeEmail: '',
    workLocation: '', workLocationId: null,
    shiftId: null,   shiftName: '',
    reportingManager: '',
  })

  const [training, setTraining] = useState({
    startDate: '', endDate: '',
    trainingPeriodMonths: '', stipend: '',
    workingType: 'Full-time', workMode: 'Remote',
    status: 'Active',
  })

  const [edu, setEdu] = useState({
    hscMonth: '', hscYear: '',
    bachelorMonth: '', bachelorYear: '',
    masterMonth: '', masterYear: '',
    degreeName: '', degreeResult: '',
    universityName: '', universityAddress: '',
    trainingStatus: '',
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

  async function loadExistingDocuments(personalInformationId) {
    try {
      const res = await apiClient.get(`/persons/${personalInformationId}/documents`)
      const docs = res?.data?.data ?? res?.data ?? []
      if (Array.isArray(docs)) {
        const reasonMap = {}
        const docsMap = {}
        docs.forEach(doc => {
          const key = doc.documentTypeKey ?? doc.docKey ?? String(doc.documentTypeId ?? doc.id)
          if (doc.filePath) {
            docsMap[key] = { id: doc.id, name: doc.filePath.split('/').pop(), filePath: doc.filePath }
          }
          if (doc.reason) {
            reasonMap[key] = doc.reason
          }
        })
        setDocReasons(reasonMap)
        setDocuments(docsMap)
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Load dropdowns ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [deptRes, desigRes, branchRes, docRes, shiftRes] = await Promise.allSettled([
          apiClient.get('/departments',    { params: { page: 0, size: 200 } }),
          apiClient.get('/designations',   { params: { page: 0, size: 200 } }),
          apiClient.get('/branches',       { params: { page: 0, size: 200 } }),
          apiClient.get('/document-types?applicableTypes=TRAINEE&page=0&size=100'),
          shiftService.getAll(0, 200),
        ])

        if (deptRes.status === 'fulfilled') {
          const d = deptRes.value?.data?.data ?? deptRes.value?.data ?? {}
          setDepartments((d.content ?? d).filter(x => x.status !== false))
        }
        if (desigRes.status === 'fulfilled') {
          const d = desigRes.value?.data?.data ?? desigRes.value?.data ?? {}
          setDesignations((d.content ?? d).filter(x => x.active !== false))
        }
        if (branchRes.status === 'fulfilled') {
          const d = branchRes.value?.data?.data ?? branchRes.value?.data ?? {}
          setBranches((d.content ?? d).filter(x => x.active !== false))
        }
        if (shiftRes.status === 'fulfilled') {
          const d = shiftRes.value?.data?.data ?? shiftRes.value?.data ?? {}
          setShifts((d.content ?? []).filter(x => x.isActive !== false))
        }
        if (docRes.status === 'fulfilled') {
          const d = docRes.value?.data?.data ?? docRes.value?.data ?? {}
          const activeDocs = (d.content ?? d ?? []).filter(x => x.active !== false)
          const seen = new Set()
          setDocTypes(activeDocs.filter(dt => {
            const key = dt.key || dt.docKey || String(dt.id)
            if (seen.has(key)) return false
            seen.add(key)
            return true
          }))
        }
      } finally {
        setDeptLoading(false); setDesigLoading(false)
        setBranchLoading(false); setShiftLoading(false); setDocLoading(false)
      }
    }
    load()
  }, [])

  // ── Load existing trainee data in edit/draft modes ───────────────────────
  useEffect(() => {
    if (!id) return
    const load = async () => {
      setPageLoading(true)
      try {
        // id here is personalInformationId (after backend fix)
        const res = await employeeService.getById(id)
        const emp = res?.data?.data ?? res?.data ?? {}
        const contact = emp.contact ?? {}

        // ✅ FIX 5: Store the Trainee table PK for the PATCH /api/trainees/:traineeId call
        if (emp.traineeId) setTraineeDbId(emp.traineeId)

        setPersonal({
          firstName:     emp.firstName          ?? '',
          middleName:    emp.middleName         ?? '',
          lastName:      emp.lastName           ?? '',
          gender:        emp.gender             ?? '',
          dob:           emp.dateOfBirth        ?? '',
          personalPhone: contact.personalPhone  ?? '',
          personalPhoneCode: contact.personalPhoneCode ?? '+91',
          emergencyPhone:contact.emergencyPhone ?? '',
          emergencyPhoneCode: contact.emergencyPhoneCode ?? '+91',
          personalEmail: contact.personalEmail  ?? '',
          maritalStatus: emp.maritalStatus      ?? '',
          spouseName:    emp.spouseOrParentName  ?? '',
          profilePhoto:  emp.profileImageUrl    ?? null,
        })

        setOffice({
          traineeId:        emp.traineeCode                   ?? '',
          designation:      emp.designationName               ?? '',
          designationId:    null,
          department:       emp.departmentName                ?? '',
          departmentId:     null,
          officeEmail:      contact.officeEmail               ?? '',
          workLocation:     emp.branchName                    ?? '',
          workLocationId:   null,
          shiftId:          null,
          shiftName:        emp.shiftTiming                   ?? '',
          reportingManager: emp.reportingManagerName          ?? '',
        })

        const td = emp.trainingDetails ?? {}
        setTraining({
          startDate:            td.startDate             ?? '',
          endDate:              td.endDate               ?? '',
          trainingPeriodMonths: td.trainingPeriodMonths  != null ? String(td.trainingPeriodMonths) : '',
          stipend:              td.stipend               != null ? String(td.stipend) : '',
          workingType:          API_TO_WTYPE[td.workingType] ?? 'Full-time',
          workMode:             API_TO_WMODE[td.workMode]    ?? 'Remote',
          status:               API_TO_STATUS[emp.status]    ?? 'Active',
        })

        const ed = emp.educationDetails ?? {}
        setEdu({
          hscMonth:         ed.hscCompletion       ?? '',
          hscYear:          ed.hscYear             != null ? String(ed.hscYear)        : '',
          bachelorMonth:    ed.bachelorCompletion   ?? '',
          bachelorYear:     ed.bachelorYear         != null ? String(ed.bachelorYear)   : '',
          masterMonth:      ed.masterCompletion     ?? '',
          masterYear:       ed.masterYear           != null ? String(ed.masterYear)     : '',
          degreeName:       ed.degreeName           ?? '',
          degreeResult:     ed.degreeResult         ?? '',
          universityName:   ed.universityName       ?? '',
          universityAddress:ed.universityAddress    ?? '',
          trainingStatus:   ed.trainingCompletionStatus ?? '',
        })

        const ca  = emp.currentAddress  ?? {}
        const pa  = emp.permanentAddress ?? {}
        const same = emp.sameAsCurrent ?? false
        setAddress({
          currentAddress: ca.addressLine ?? '',
          city:           ca.city        ?? '',
          district:       ca.district    ?? '',
          landmark:       ca.landmark    ?? '',
          state:          ca.state       ?? '',
          pinCode:        ca.pinCode     ?? '',
          country:        ca.country     ?? 'India',
          sameAsCurrent:  same,
          permAddress:    same ? (ca.addressLine ?? '') : (pa.addressLine ?? ''),
          permCity:       same ? (ca.city        ?? '') : (pa.city        ?? ''),
          permDistrict:   same ? (ca.district    ?? '') : (pa.district    ?? ''),
          permLandmark:   same ? (ca.landmark    ?? '') : (pa.landmark    ?? ''),
          permState:      same ? (ca.state       ?? '') : (pa.state       ?? ''),
          permPinCode:    same ? (ca.pinCode     ?? '') : (pa.pinCode     ?? ''),
          permCountry:    same ? (ca.country     ?? 'India') : (pa.country ?? 'India'),
        })

        const b = emp.bankDetails ?? {}
        setBank({
          bankName:      b.bankName      ?? '',
          accountNumber: b.accountNumber ?? '',
          ifscCode:      b.ifscCode      ?? '',
          panNumber:     b.panNumber     ?? '',
          aadhaarNumber: b.aadhaarNumber ?? '',
          pfNumber:      b.pfNumber      ?? '',
          uanNumber:     b.uanNumber     ?? '',
          esicNumber:    b.esicNumber    ?? '',
        })

        const piId = emp.personalInformationId ?? id
if (piId) {
  loadExistingDocuments(piId)
}
      } catch {
        toast.error('Failed to load trainee data')
      } finally {
        setPageLoading(false)
      }
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resolve dropdown IDs by name after dropdowns load ───────────────────
useEffect(() => {
    if (isAddMode) return
    const timer = setTimeout(() => {
      setOffice(prev => {
        const updated = { ...prev }

        if (prev.designation && !prev.designationId && designations.length > 0) {
          const match = designations.find(d => d.name === prev.designation)
          if (match) updated.designationId = match.id
        }
        if (prev.department && !prev.departmentId && departments.length > 0) {
          const match = departments.find(d => d.name === prev.department)
          if (match) updated.departmentId = match.id
        }
        if (prev.workLocation && !prev.workLocationId && branches.length > 0) {
          const match = branches.find(b => b.branchName === prev.workLocation)
          if (match) updated.workLocationId = match.id
        }
        if (prev.shiftName && !prev.shiftId && shifts.length > 0) {
          const match = shifts.find(s => s.shiftName === prev.shiftName)
          if (match) updated.shiftId = match.id
        }
        return updated
      })
    }, 0)

    return () => clearTimeout(timer)
  }, [departments, designations, branches, shifts, isAddMode])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const up  = f => e => setPersonal(p  => ({ ...p,  [f]: e.target?.value ?? e }))
  const upo = f => e => setOffice(o   => ({ ...o,   [f]: e.target?.value ?? e }))
  const upt = f => e => setTraining(t => ({ ...t,   [f]: e.target?.value ?? e }))
  const upe = f => e => setEdu(ed     => ({ ...ed,  [f]: e.target?.value ?? e }))
  const upa = f => e => setAddress(a  => ({ ...a,   [f]: e.target?.value ?? e }))
  const upb = f => e => setBank(b     => ({ ...b,   [f]: e.target?.value ?? e }))

  const clearError  = k       => setErrors(p => { const n = { ...p }; delete n[k]; return n })
  const clearErrors = (...ks) => setErrors(p => { const n = { ...p }; ks.forEach(k => delete n[k]); return n })

  const handleSameAsCurrent = (checked) => {
    setAddress(p => ({
      ...p, sameAsCurrent: checked,
      ...(checked ? {
        permAddress: p.currentAddress, permCity: p.city, permDistrict: p.district,
        permLandmark: p.landmark, permState: p.state, permPinCode: p.pinCode, permCountry: p.country,
      } : {}),
    }))
    if (checked) clearErrors('permAddress','permCity','permDistrict','permState','permPinCode','permCountry')
  }

  // ── Build FormData ────────────────────────────────────────────────────────
  const buildPayload = useCallback((isDraft) => {
    const personalInfo = {
      status:             isDraft ? 'DRAFT' : 'SUBMITTED',
      firstName:          personal.firstName.trim(),
      middleName:         personal.middleName.trim(),
      lastName:           personal.lastName.trim(),
      gender:             personal.gender ? personal.gender.toUpperCase() : null,
      dateOfBirth:        personal.dob || null,
      employmentType:     'TRAINEE',
      maritalStatus:      personal.maritalStatus ? personal.maritalStatus.toUpperCase() : null,
      spouseOrParentName: personal.spouseName.trim() || null,
      personalPhone:      personal.personalPhone || null,
      personalPhoneCode:  personal.personalPhoneCode || '+91',
      emergencyPhone:     personal.emergencyPhone || null,
      emergencyPhoneCode: personal.emergencyPhoneCode || '+91',
      officeEmail:        office.officeEmail.trim() || null,
      workProfile: {
        departmentId:       office.departmentId   || null,
        designationId:      office.designationId  || null,
        branchId:           office.workLocationId || null,
        shiftId:            office.shiftId        || null,
        reportingManagerId: office.reportingManager.trim() || null,
        workMode:           training.workMode === 'On site' ? 'ONSITE' : training.workMode.toUpperCase(),
        workingType:        training.workingType.toUpperCase().replace(/[\s-]+/g, '_'),
        status:             STATUS_TO_API[training.status] || 'ACTIVE',
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
        sameAsCurrent: address.sameAsCurrent,
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

    const traineeData = {
      traineeCode: office.traineeId.trim() || null,
      trainingDetails: {
        startDate:            training.startDate  || null,
        endDate:              training.endDate    || null,
        trainingPeriodMonths: training.trainingPeriodMonths !== '' ? Number(training.trainingPeriodMonths) : null,
        stipend:              training.stipend !== '' ? Number(training.stipend) : null,
        workMode:             training.workMode === 'On site' ? 'ONSITE' : training.workMode.toUpperCase(),
        workingType:          training.workingType.toUpperCase().replace(/[\s-]+/g, '_'),
      },
      educationDetails: {
        hscCompletion:            edu.hscMonth          || null,
        hscYear:                  edu.hscYear           ? Number(edu.hscYear)         : null,
        bachelorCompletion:       edu.bachelorMonth     || null,
        bachelorYear:             edu.bachelorYear      ? Number(edu.bachelorYear)    : null,
        masterCompletion:         edu.masterMonth       || null,
        masterYear:               edu.masterYear        ? Number(edu.masterYear)      : null,
        degreeName:               edu.degreeName.trim()         || null,
        degreeResult:             edu.degreeResult.trim()       || null,
        universityName:           edu.universityName.trim()     || null,
        universityAddress:        edu.universityAddress.trim()  || null,
        trainingCompletionStatus: edu.trainingStatus             || null,
      },
    }

    const fd = new FormData()
    fd.append('personalInformation', JSON.stringify(personalInfo))
    fd.append('trainee',             JSON.stringify(traineeData))

    // ✅ FIX 3: Only append profileImage if a NEW file was chosen
    if (personal.profilePhoto instanceof File) {
      fd.append('profileImage', personal.profilePhoto)
    }
    // If it's a string URL (existing), don't re-upload — backend keeps it as-is

    // Document files — only newly uploaded ones
    Object.entries(documents).forEach(([docKey, file]) => {
      if (file instanceof File) fd.append(docKey, file)
    })

    // Document reasons
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
  }, [personal, office, training, edu, address, bank, documents, docReasons])

  // ── Save as Draft (Add mode only) ─────────────────────────────────────────
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
      const fd = buildPayload(true)
      await employeeService.create(fd)
      toast.success('Trainee saved as draft successfully')
      navigate('/employee')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save draft')
    } finally {
      setSubmitting(false)
    }
  }
const handleUpdate = async () => {
  if (isDraftMode) {
    const draftErrs = {}
    if (!personal.firstName.trim()) draftErrs.firstName = 'First name is required'
    if (!personal.lastName.trim())  draftErrs.lastName  = 'Last name is required'
    if (Object.keys(draftErrs).length > 0) {
      setErrors(draftErrs)
      toast.warning('Please fix the highlighted fields')
      return
    }
  } else {
    const errs = buildErrors(
      personal, office, training, edu, address,
      bank, documents, docReasons, docTypes
    )
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.warning('Please fix the highlighted fields before updating')
      setTimeout(() => {
        document.querySelector('[data-error="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }
  }

  setErrors({})
  setSubmitting(true)

  try {
    const fd = buildPayload(isDraftMode)

    console.log('traineeDbId:', traineeDbId, '| personalInformationId (id):', id)

    if (traineeDbId) {
      await apiClient.patch(`/trainees/${traineeDbId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } else {
      await apiClient.patch(`/trainees/personal/${id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }

    toast.success(isDraftMode ? 'Draft saved successfully' : 'Trainee updated successfully')
    navigate('/employee')
  } catch (err) {
    console.error('Update error:', err?.response ?? err)
    toast.error(
      err?.response?.data?.message || err?.message || 'Failed to update trainee'
    )
  } finally {
    setSubmitting(false)
  }
}

  // ── Submit (Add mode only) ────────────────────────────────────────────────
  const handleSubmitClick = () => {
    const errs = buildErrors(personal, office, training, edu, address, bank, documents, docReasons, docTypes)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.warning('Please fix the highlighted fields before submitting')
      setTimeout(() => {
        document.querySelector('[data-error="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }
    setErrors({})
    setShowConfirm(true)
  }

  const handleConfirmedSubmit = async () => {
    setSubmitting(true)
    try {
      const fd = buildPayload(false)
      await employeeService.create(fd)
      toast.success('Trainee added successfully! Credentials sent via email.')
      setShowConfirm(false)
      navigate('/employee')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit trainee')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Page loading screen ───────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" size={32} color={PRIMARY} />
          <p className="text-sm text-gray-500">Loading trainee data…</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-full pb-8">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/employee')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            {isDraftMode && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                Draft
              </span>
            )}
            {isEditMode && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                Editing
              </span>
            )}
          </div>

          {/* Employment type switcher — only in Add mode */}
          {isAddMode && (
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Employment Type</span>
              <div className="flex items-center gap-4">
                {['Internship', 'Training', 'Employee'].map(type => (
                  <RadioOption
                    key={type} name="employmentType" value={type}
                    checked={type === 'Training'}
                    onChange={() => navigate(EMPLOYMENT_TYPE_ROUTES[type])}
                    label={type}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">

          {/* ── Personal Information ── */}
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.firstName}>
                <FieldLabel required>First Name</FieldLabel>
                <TextInput placeholder="First Name" value={personal.firstName} error={errors.firstName}
                  onChange={e => { up('firstName')(e); clearError('firstName') }} />
              </div>
              <div data-error={!!errors.middleName}>
                <FieldLabel required>Middle Name</FieldLabel>
                <TextInput placeholder="Middle Name" value={personal.middleName} error={errors.middleName}
                  onChange={e => { up('middleName')(e); clearError('middleName') }} />
              </div>
              <div data-error={!!errors.lastName}>
                <FieldLabel required>Last Name</FieldLabel>
                <TextInput placeholder="Last Name" value={personal.lastName} error={errors.lastName}
                  onChange={e => { up('lastName')(e); clearError('lastName') }} />
              </div>
              <div data-error={!!errors.gender}>
                <FieldLabel required>Gender</FieldLabel>
                <SelectInput value={personal.gender} error={errors.gender}
                  onChange={e => { up('gender')(e); clearError('gender') }}>
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </SelectInput>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.dob}>
                <FieldLabel required>Date of Birth</FieldLabel>
                <TextInput type="date" value={personal.dob} error={errors.dob}
                  onChange={e => { up('dob')(e); clearError('dob') }} />
              </div>
              <div data-error={!!errors.personalPhone}>
                <FieldLabel required>Personal Phone</FieldLabel>
                <PhoneInput
                  code={personal.personalPhoneCode}
                  onCodeChange={e => { up('personalPhoneCode')(e.target.value) }}
                  value={personal.personalPhone}
                  error={errors.personalPhone}
                  onChange={e => { up('personalPhone')(e); clearError('personalPhone') }}
                />
              </div>
              <div data-error={!!errors.emergencyPhone}>
                <FieldLabel required>Emergency Phone</FieldLabel>
                <PhoneInput
                  code={personal.emergencyPhoneCode}
                  onCodeChange={e => { up('emergencyPhoneCode')(e.target.value) }}
                  value={personal.emergencyPhone}
                  error={errors.emergencyPhone}
                  onChange={e => { up('emergencyPhone')(e); clearError('emergencyPhone') }}
                />
              </div>
              <div data-error={!!errors.personalEmail}>
                <FieldLabel required>Personal Email</FieldLabel>
                <TextInput type="email" placeholder="name@gmail.com" value={personal.personalEmail}
                  error={errors.personalEmail}
                  onChange={e => { up('personalEmail')(e); clearError('personalEmail') }} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.maritalStatus}>
                <FieldLabel required>Marital Status</FieldLabel>
                <SelectInput value={personal.maritalStatus} error={errors.maritalStatus}
                  onChange={e => { up('maritalStatus')(e); clearError('maritalStatus') }}>
                  <option value="">Select Status</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </SelectInput>
              </div>
              <div data-error={!!errors.spouseName}>
                <FieldLabel required>Spouse / Parent Name</FieldLabel>
                <TextInput placeholder="Name" value={personal.spouseName} error={errors.spouseName}
                  onChange={e => { up('spouseName')(e); clearError('spouseName') }} />
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

          {/* ── Office / Work Profile ── */}
          <SectionCard title="Office Information">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <FieldLabel>Trainee ID {isAddMode && '(auto-generated if blank)'}</FieldLabel>
                <TextInput
                  placeholder="GMTR001"
                  value={office.traineeId}
                  error={errors.traineeId}
                  readOnly={isEditMode}
                  onChange={e => {
                    setOffice(o => ({ ...o, traineeId: e.target.value }))
                    clearError('traineeId')
                  }}
                />
              </div>

              <div data-error={!!errors.designation}>
                <FieldLabel required>Designation</FieldLabel>
                <SearchableSelect
                  value={office.designation} options={designations}
                  labelKey="name" valueKey="name"
                  placeholder={desigLoading ? 'Loading…' : 'Select designation…'}
                  loading={desigLoading} error={errors.designation}
                  onChange={opt => {
                    setOffice(o => ({ ...o, designation: opt?.name ?? '', designationId: opt?.id ?? null }))
                    clearError('designation')
                  }}
                />
              </div>

              <div data-error={!!errors.department}>
                <FieldLabel required>Department</FieldLabel>
                <SearchableSelect
                  value={office.department} options={departments}
                  labelKey="name" valueKey="name"
                  placeholder={deptLoading ? 'Loading…' : 'Select department…'}
                  loading={deptLoading} error={errors.department}
                  onChange={opt => {
                    setOffice(o => ({ ...o, department: opt?.name ?? '', departmentId: opt?.id ?? null }))
                    clearError('department')
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.officeEmail}>
                <FieldLabel required>Office Email</FieldLabel>
                <TextInput type="email" placeholder="name@company.com" value={office.officeEmail}
                  error={errors.officeEmail}
                  onChange={e => { upo('officeEmail')(e); clearError('officeEmail') }} />
              </div>
              <div data-error={!!errors.workLocation}>
                <FieldLabel required>Branch / Work Location</FieldLabel>
                <SearchableSelect
                  value={office.workLocation} options={branches}
                  labelKey="branchName" valueKey="branchName"
                  placeholder={branchLoading ? 'Loading…' : 'Select branch…'}
                  loading={branchLoading} error={errors.workLocation}
                  onChange={opt => {
                    setOffice(o => ({ ...o, workLocation: opt?.branchName ?? '', workLocationId: opt?.id ?? null }))
                    clearError('workLocation')
                  }}
                />
              </div>
              <div data-error={!!errors.shiftId}>
                <FieldLabel required>Shift</FieldLabel>
                <SearchableSelect
                  value={office.shiftName} options={shifts}
                  labelKey="shiftName" valueKey="id"
                  placeholder={shiftLoading ? 'Loading…' : 'Select shift…'}
                  loading={shiftLoading} error={errors.shiftId}
                  onChange={opt => {
                    setOffice(o => ({ ...o, shiftName: opt?.shiftName ?? '', shiftId: opt?.id ?? null }))
                    clearError('shiftId')
                  }}
                />
              </div>
              <div data-error={!!errors.reportingManager}>
                <FieldLabel>Reporting Manager</FieldLabel>
                <TextInput placeholder="Manager Name" value={office.reportingManager}
                  error={errors.reportingManager}
                  onChange={e => { upo('reportingManager')(e); clearError('reportingManager') }} />
              </div>
            </div>
          </SectionCard>

          {/* ── Training Details ── */}
          <SectionCard title="Training Details">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div data-error={!!errors.startDate}>
                <FieldLabel required>Training Start Date</FieldLabel>
                <TextInput type="date" value={training.startDate} error={errors.startDate}
                  onChange={e => { upt('startDate')(e); clearError('startDate') }} />
              </div>
              <div data-error={!!errors.endDate}>
                <FieldLabel required>Training End Date</FieldLabel>
                <TextInput type="date" value={training.endDate} error={errors.endDate}
                  onChange={e => { upt('endDate')(e); clearError('endDate') }} />
              </div>
              <div data-error={!!errors.trainingPeriodMonths}>
                <FieldLabel required>Training Period (months)</FieldLabel>
                <TextInput placeholder="3" value={training.trainingPeriodMonths} numericOnly
                  error={errors.trainingPeriodMonths}
                  onChange={e => { upt('trainingPeriodMonths')(e); clearError('trainingPeriodMonths') }} />
              </div>
              <div data-error={!!errors.stipend}>
                <FieldLabel required>Stipend (₹ / 0 for unpaid)</FieldLabel>
                <TextInput placeholder="0" value={training.stipend} numericOnly error={errors.stipend}
                  onChange={e => { upt('stipend')(e); clearError('stipend') }} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <FieldLabel required>Work Mode</FieldLabel>
                <div className="flex items-center gap-4 mt-1">
                  {['Remote', 'Hybrid', 'On site'].map(m => (
                    <RadioOption key={m} name="tr_workMode" value={m}
                      checked={training.workMode === m} onChange={upt('workMode')} label={m} />
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel required>Working Type</FieldLabel>
                <div className="flex items-center gap-3 mt-1">
                  {['Part-time', 'Full-time', 'Contractual'].map(t => (
                    <RadioOption key={t} name="tr_workingType" value={t}
                      checked={training.workingType === t} onChange={upt('workingType')} label={t} />
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel required>Trainee Status</FieldLabel>
                <div className="flex items-center gap-4 mt-1">
                  {['Active', 'Inactive', 'On Hold'].map(s => (
                    <RadioOption key={s} name="tr_status" value={s}
                      checked={training.status === s} onChange={upt('status')} label={s} />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Educational Details ── */}
          <SectionCard title="Educational Details">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">12th (HSC)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div data-error={!!errors.hscMonth || !!errors.hscYear}>
                  <MonthYearPicker
                    required
                    monthValue={edu.hscMonth}
                    yearValue={edu.hscYear}
                    onMonthChange={v => { setEdu(e => ({ ...e, hscMonth: v })); clearError('hscMonth') }}
                    onYearChange={v =>  { setEdu(e => ({ ...e, hscYear:  v })); clearError('hscYear')  }}
                    monthError={errors.hscMonth}
                    yearError={errors.hscYear}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Bachelor Degree</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div data-error={!!errors.bachelorMonth || !!errors.bachelorYear}>
                  <MonthYearPicker
                    required
                    monthValue={edu.bachelorMonth}
                    yearValue={edu.bachelorYear}
                    onMonthChange={v => { setEdu(e => ({ ...e, bachelorMonth: v })); clearError('bachelorMonth') }}
                    onYearChange={v =>  { setEdu(e => ({ ...e, bachelorYear:  v })); clearError('bachelorYear')  }}
                    monthError={errors.bachelorMonth}
                    yearError={errors.bachelorYear}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Master Degree <span className="text-gray-400 font-normal">(optional)</span></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MonthYearPicker
                  monthValue={edu.masterMonth}
                  yearValue={edu.masterYear}
                  onMonthChange={v => setEdu(e => ({ ...e, masterMonth: v }))}
                  onYearChange={v =>  setEdu(e => ({ ...e, masterYear:  v }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div data-error={!!errors.degreeName}>
                <FieldLabel required>Degree Name</FieldLabel>
                <TextInput placeholder="B.Tech / BCA / MBA…" value={edu.degreeName} error={errors.degreeName}
                  onChange={e => { upe('degreeName')(e); clearError('degreeName') }} />
              </div>
              <div data-error={!!errors.degreeResult}>
                <FieldLabel required>Degree Result</FieldLabel>
                <TextInput placeholder="72%" value={edu.degreeResult} error={errors.degreeResult}
                  onChange={e => { upe('degreeResult')(e); clearError('degreeResult') }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div data-error={!!errors.universityName}>
                <FieldLabel required>University Name</FieldLabel>
                <TextInput placeholder="ABC University" value={edu.universityName} error={errors.universityName}
                  onChange={e => { upe('universityName')(e); clearError('universityName') }} />
              </div>
              <div data-error={!!errors.universityAddress}>
                <FieldLabel required>University Address</FieldLabel>
                <TextInput placeholder="Ahmedabad, Gujarat" value={edu.universityAddress}
                  error={errors.universityAddress}
                  onChange={e => { upe('universityAddress')(e); clearError('universityAddress') }} />
              </div>
            </div>

            <div data-error={!!errors.trainingStatus}>
              <FieldLabel required>Training Completion Status</FieldLabel>
              <div className="flex items-center gap-5 mt-1">
                {['Complete', 'Pending', 'On Going'].map(s => (
                  <RadioOption key={s} name="trainingStatus" value={s}
                    checked={edu.trainingStatus === s}
                    onChange={e => { upe('trainingStatus')(e); clearError('trainingStatus') }}
                    label={s} />
                ))}
              </div>
              <ErrorMsg msg={errors.trainingStatus} />
            </div>
          </SectionCard>

          {/* ── Current Address ── */}
          <SectionCard title="Current Address">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div data-error={!!errors.currentAddress}>
                <FieldLabel required>Address Line</FieldLabel>
                <TextInput placeholder="Street / House No." value={address.currentAddress} error={errors.currentAddress}
                  onChange={e => {
                    upa('currentAddress')(e); clearError('currentAddress')
                    if (address.sameAsCurrent) upa('permAddress')(e)
                  }} />
              </div>
              <div data-error={!!errors.city}>
                <FieldLabel required>City</FieldLabel>
                <TextInput placeholder="Ahmedabad" value={address.city} error={errors.city}
                  onChange={e => {
                    upa('city')(e); clearError('city')
                    if (address.sameAsCurrent) upa('permCity')(e)
                  }} />
              </div>
              <div data-error={!!errors.district}>
                <FieldLabel required>District</FieldLabel>
                <TextInput placeholder="Ahmedabad" value={address.district} error={errors.district}
                  onChange={e => {
                    upa('district')(e); clearError('district')
                    if (address.sameAsCurrent) upa('permDistrict')(e)
                  }} />
              </div>
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near..." value={address.landmark}
                  onChange={e => {
                    upa('landmark')(e)
                    if (address.sameAsCurrent) upa('permLandmark')(e)
                  }} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div data-error={!!errors.state}>
                <FieldLabel required>State</FieldLabel>
                <TextInput placeholder="Gujarat" value={address.state} error={errors.state}
                  onChange={e => {
                    upa('state')(e); clearError('state')
                    if (address.sameAsCurrent) upa('permState')(e)
                  }} />
              </div>
              <div data-error={!!errors.pinCode}>
                <FieldLabel required>PIN Code</FieldLabel>
                <TextInput placeholder="380060" value={address.pinCode} numericOnly error={errors.pinCode}
                  onChange={e => {
                    upa('pinCode')(e); clearError('pinCode')
                    if (address.sameAsCurrent) upa('permPinCode')(e)
                  }} />
              </div>
              <div data-error={!!errors.country}>
                <FieldLabel required>Country</FieldLabel>
                <TextInput placeholder="India" value={address.country} error={errors.country}
                  onChange={e => {
                    upa('country')(e); clearError('country')
                    if (address.sameAsCurrent) upa('permCountry')(e)
                  }} />
              </div>
            </div>
          </SectionCard>

          {/* ── Permanent Address ── */}
          <div className="rounded-xl border-2 p-5" style={{ borderColor: PRIMARY }}>
            <label className="flex items-start gap-2.5 cursor-pointer mb-5">
              <div
                className="w-4 h-4 rounded flex items-center justify-center border-2 transition-colors mt-0.5 flex-shrink-0 cursor-pointer"
                style={{ backgroundColor: address.sameAsCurrent ? PRIMARY : 'white', borderColor: address.sameAsCurrent ? PRIMARY : '#D1D5DB' }}
                onClick={() => handleSameAsCurrent(!address.sameAsCurrent)}>
                {address.sameAsCurrent && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
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
                  onChange={e => { upa('permAddress')(e); clearError('permAddress') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permCity}>
                <FieldLabel required={!address.sameAsCurrent}>City</FieldLabel>
                <TextInput placeholder="Ahmedabad"
                  value={address.sameAsCurrent ? address.city : address.permCity}
                  error={errors.permCity}
                  onChange={e => { upa('permCity')(e); clearError('permCity') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permDistrict}>
                <FieldLabel required={!address.sameAsCurrent}>District</FieldLabel>
                <TextInput placeholder="Ahmedabad"
                  value={address.sameAsCurrent ? address.district : address.permDistrict}
                  error={errors.permDistrict}
                  onChange={e => { upa('permDistrict')(e); clearError('permDistrict') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near..."
                  value={address.sameAsCurrent ? address.landmark : address.permLandmark}
                  onChange={e => upa('permLandmark')(e)}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div data-error={!!errors.permState}>
                <FieldLabel required={!address.sameAsCurrent}>State</FieldLabel>
                <TextInput placeholder="Gujarat"
                  value={address.sameAsCurrent ? address.state : address.permState}
                  error={errors.permState}
                  onChange={e => { upa('permState')(e); clearError('permState') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permPinCode}>
                <FieldLabel required={!address.sameAsCurrent}>PIN Code</FieldLabel>
                <TextInput placeholder="380060" numericOnly
                  value={address.sameAsCurrent ? address.pinCode : address.permPinCode}
                  error={errors.permPinCode}
                  onChange={e => { upa('permPinCode')(e); clearError('permPinCode') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
              <div data-error={!!errors.permCountry}>
                <FieldLabel required={!address.sameAsCurrent}>Country</FieldLabel>
                <TextInput placeholder="India"
                  value={address.sameAsCurrent ? address.country : address.permCountry}
                  error={errors.permCountry}
                  onChange={e => { upa('permCountry')(e); clearError('permCountry') }}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            </div>
          </div>

          {/* ── Bank & Legal Details ── */}
          <SectionCard title="Bank & Legal Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div data-error={!!errors.bankName}>
                <FieldLabel required>Bank Name</FieldLabel>
                <TextInput placeholder="HDFC Bank" value={bank.bankName} error={errors.bankName}
                  onChange={e => { upb('bankName')(e); clearError('bankName') }} />
              </div>
              <div data-error={!!errors.accountNumber}>
                <FieldLabel required>Account Number</FieldLabel>
                <TextInput type="password" placeholder="••••••••••••" value={bank.accountNumber}
                  numericOnly error={errors.accountNumber}
                  onChange={e => { upb('accountNumber')(e); clearError('accountNumber') }} />
              </div>
              <div data-error={!!errors.ifscCode}>
                <FieldLabel required>IFSC Code</FieldLabel>
                <TextInput placeholder="HDFC0001234" value={bank.ifscCode} error={errors.ifscCode}
                  onChange={e => { upb('ifscCode')({ target: { value: e.target.value.toUpperCase() } }); clearError('ifscCode') }} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div data-error={!!errors.panNumber}>
                <FieldLabel required>PAN Number</FieldLabel>
                <TextInput placeholder="ABCDE1234F" value={bank.panNumber} error={errors.panNumber}
                  onChange={e => { upb('panNumber')({ target: { value: e.target.value.toUpperCase() } }); clearError('panNumber') }} />
              </div>
              <div data-error={!!errors.aadhaarNumber}>
                <FieldLabel required>Aadhaar Card Number</FieldLabel>
                <TextInput placeholder="123456789012" value={bank.aadhaarNumber} numericOnly error={errors.aadhaarNumber}
                  onChange={e => { upb('aadhaarNumber')(e); clearError('aadhaarNumber') }} />
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
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke={PRIMARY} strokeWidth="4"/>
                  <path className="opacity-75" fill={PRIMARY} d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading required documents…
              </div>
            ) : docTypes.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No documents configured for TRAINEE.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {docTypes.map((dt, idx) => {
                  const docKey = dt.key || dt.docKey || String(dt.id || idx)
                  const errKey = `doc_${docKey}`
                  const file   = documents[docKey]
                  const reason = docReasons[docKey] ?? ''
                  return (
                    <DocumentUploadRow
                      key={docKey}
                      dt={dt}
                      file={file}
                      reason={reason}
                      error={errors[errKey]}
                      onFileChange={(picked, validationError) => {
                        if (validationError) {
                          setErrors(prev => ({ ...prev, [errKey]: validationError }))
                          setDocuments(d => ({ ...d, [docKey]: null }))
                        } else {
                          setDocuments(d => ({ ...d, [docKey]: picked }))
                          setDocReasons(d => ({ ...d, [docKey]: '' }))
                          clearError(errKey)
                        }
                      }}
                      onReasonChange={(val) => {
                        setDocReasons(d => ({ ...d, [docKey]: val }))
                        clearError(errKey)
                      }}
                    />
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* ── FIX 4: Action Buttons — different for Add vs Edit/Draft modes ── */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
            <button type="button" onClick={() => navigate('/employee')}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center">
              Cancel
            </button>

            {/* ✅ FIX 4: Add mode shows "Save as Draft" + "Add Trainee" */}
            {isAddMode && (
              <>
                <button type="button" onClick={handleSaveDraft} disabled={submitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors disabled:opacity-50"
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FDF5F1')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  {submitting
                    ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <Save size={15} />}
                  Save as Draft
                </button>

                <button type="button" onClick={handleSubmitClick} disabled={submitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#111827' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}>
                  {submitting
                    ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <UserPlus size={15} />}
                  Add Trainee
                </button>
              </>
            )}

            {/* ✅ FIX 4: Edit/Draft mode shows only "Update" button */}
            {(isEditMode || isDraftMode) && (
              <button type="button" onClick={handleUpdate} disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#111827' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}>
                {submitting
                  ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <CheckCircle size={15} />}
                {isDraftMode ? 'Save Draft' : 'Update Trainee'}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Confirm modal only shown in Add mode */}
      {isAddMode && (
        <EmailConfirmModal
          isOpen={showConfirm}
          onClose={() => !submitting && setShowConfirm(false)}
          onConfirm={handleConfirmedSubmit}
          loading={submitting}
          isEdit={false}
          traineeName={`${personal.firstName} ${personal.lastName}`.trim()}
          email={office.officeEmail || personal.personalEmail}
        />
      )}
    </>
  )
}