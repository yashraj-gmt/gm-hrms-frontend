// src/pages/employee/AddTrainee.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full trainee creation form with:
//   • All fields mandatory (matching AddEmployee quality)
//   • Searchable dropdowns for department, designation, branch (from API)
//   • Draft + Submit flow with email confirmation modal
//   • Dynamic document types from backend (filtered by TRAINEE)
//   • Same UI patterns as AddEmployee.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Save, UserPlus } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import SearchableSelect from '@/components/shared/SearchableSelect'
import employeeService from '@/services/employeeService'
import apiClient from '@/services/apiClient'

const PRIMARY = '#C35E33'

const EMPLOYMENT_TYPE_ROUTES = {
  Internship: '/employees/add-intern',
  Training:   '/employees/add-trainee',
  Employee:   '/employees/add',
}

// ─── Validation ───────────────────────────────────────────────────────────────
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

function buildErrors(p, office, training, edu, addr, bank, docs, docTypes) {
  const errs = {}

  // ── Personal ──────────────────────────────────────────────────────────────
  if (!p.firstName.trim())   errs.firstName     = 'First name is required'
  if (!p.middleName.trim())  errs.middleName    = 'Middle name is required'
  if (!p.lastName.trim())    errs.lastName      = 'Last name is required'
  if (!p.gender)             errs.gender        = 'Gender is required'
  if (!p.dob)                errs.dob           = 'Date of birth is required'
  if (!p.maritalStatus)      errs.maritalStatus = 'Marital status is required'
  if (!p.spouseName.trim())  errs.spouseName    = 'Spouse / parent name is required'
  if (!p.profilePhoto)       errs.profilePhoto  = 'Profile photo is required'

  const phoneErr = validatePhone(p.personalPhone, 'Personal phone')
  if (phoneErr) errs.personalPhone = phoneErr

  const emergErr = validatePhone(p.emergencyPhone, 'Emergency phone')
  if (emergErr) errs.emergencyPhone = emergErr

  const emailErr = validateEmail(p.personalEmail, 'Personal email')
  if (emailErr) errs.personalEmail = emailErr

  // ── Office ────────────────────────────────────────────────────────────────
  if (!office.designation.trim())  errs.designation   = 'Designation is required'
  if (!office.department.trim())   errs.department    = 'Department is required'
  if (!office.officeEmail.trim())  errs.officeEmail   = 'Office email is required'
  else if (!EMAIL_RE.test(office.officeEmail)) errs.officeEmail = 'Office email is not valid'
  if (!office.workLocation.trim()) errs.workLocation  = 'Branch / work location is required'

  // ── Training ──────────────────────────────────────────────────────────────
  if (!training.startDate)        errs.startDate        = 'Training start date is required'
  if (!training.endDate)          errs.endDate          = 'Training end date is required'
  if (training.startDate && training.endDate && training.endDate < training.startDate)
    errs.endDate = 'End date cannot be before start date'
  if (!training.trainingPeriodMonths)
    errs.trainingPeriodMonths = 'Training period is required'
  if (!training.stipend || isNaN(training.stipend) || Number(training.stipend) < 0)
    errs.stipend = 'Stipend is required (0 for unpaid)'

  // ── Education ─────────────────────────────────────────────────────────────
  if (!edu.hscCompletion.trim())    errs.hscCompletion    = '12th completion is required'
  if (!edu.hscYear)                 errs.hscYear          = '12th year is required'
  if (!edu.bachelorCompletion.trim()) errs.bachelorCompletion = 'Bachelor completion is required'
  if (!edu.bachelorYear)            errs.bachelorYear     = 'Bachelor year is required'
  if (!edu.degreeName.trim())       errs.degreeName       = 'Degree name is required'
  if (!edu.degreeResult.trim())     errs.degreeResult     = 'Degree result is required'
  if (!edu.universityName.trim())   errs.universityName   = 'University name is required'
  if (!edu.universityAddress.trim()) errs.universityAddress = 'University address is required'
  if (!edu.trainingStatus)          errs.trainingStatus   = 'Training completion status is required'

  // ── Current address ────────────────────────────────────────────────────────
  if (!addr.currentAddress.trim()) errs.currentAddress = 'Current address is required'
  if (!addr.city.trim())           errs.city           = 'City is required'
  if (!addr.district.trim())       errs.district       = 'District is required'
  if (!addr.state.trim())          errs.state          = 'State is required'
  if (!addr.pinCode.trim())        errs.pinCode        = 'PIN code is required'
  else if (!/^\d{6}$/.test(addr.pinCode)) errs.pinCode = 'PIN code must be 6 digits'
  if (!addr.country.trim())        errs.country        = 'Country is required'

  // ── Permanent address ──────────────────────────────────────────────────────
  if (!addr.sameAsCurrent) {
    if (!addr.permAddress.trim())  errs.permAddress  = 'Permanent address is required'
    if (!addr.permCity.trim())     errs.permCity     = 'City is required'
    if (!addr.permDistrict.trim()) errs.permDistrict = 'District is required'
    if (!addr.permState.trim())    errs.permState    = 'State is required'
    if (!addr.permPinCode.trim())  errs.permPinCode  = 'PIN code is required'
    else if (!/^\d{6}$/.test(addr.permPinCode)) errs.permPinCode = 'PIN code must be 6 digits'
    if (!addr.permCountry.trim())  errs.permCountry  = 'Country is required'
  }

  // ── Bank & Legal ───────────────────────────────────────────────────────────
  if (!bank.bankName.trim())      errs.bankName      = 'Bank name is required'
  if (!bank.accountNumber.trim()) errs.accountNumber = 'Account number is required'
  if (!bank.ifscCode.trim())      errs.ifscCode      = 'IFSC code is required'
  else if (!IFSC_RE.test(bank.ifscCode.toUpperCase())) errs.ifscCode = 'IFSC format invalid (e.g. HDFC0001234)'
  if (!bank.panNumber.trim())     errs.panNumber     = 'PAN number is required'
  else if (!PAN_RE.test(bank.panNumber.toUpperCase())) errs.panNumber = 'PAN format invalid (e.g. ABCDE1234F)'
  if (!bank.aadhaarNumber.trim()) errs.aadhaarNumber = 'Aadhaar number is required'
  else if (!ADHAR_RE.test(bank.aadhaarNumber.replace(/\s/g, ''))) errs.aadhaarNumber = 'Aadhaar must be exactly 12 digits'

  // ── Mandatory documents ────────────────────────────────────────────────────
  docTypes.forEach(dt => {
    if (dt.mandatory) {
      const hasFile   = docs[dt.docKey] instanceof File
      const hasReason = docs[`reason_${dt.docKey}`]?.trim()
      if (!hasFile && !hasReason) errs[`doc_${dt.docKey}`] = `${dt.name} is required`
    }
  })

  return errs
}

// ─── Shared primitives ─────────────────────────────────────────────────────────
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
function TextInput({ placeholder, type = 'text', value, onChange, error, className = '', numericOnly = false }) {
  const h = (e) => {
    if (numericOnly) onChange({ target: { value: e.target.value.replace(/\D/g, '') } })
    else onChange(e)
  }
  return (
    <>
      <input
        type={type} placeholder={placeholder} value={value} onChange={h}
        className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border rounded-lg outline-none transition-colors placeholder:text-gray-400
          ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#C35E33] focus:bg-white'} ${className}`}
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
function PhoneInput({ value, onChange, error }) {
  const h = (e) => onChange({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 10) } })
  return (
    <>
      <div className="flex h-9">
        <span className="flex items-center px-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-xs text-gray-500 whitespace-nowrap">+91</span>
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
function FileUpload({ onChange, file, error, accept = '*' }) {
  const h = (e) => {
    if (e.target.files?.length > 0) onChange(e.target.files[0])
    e.target.value = ''
  }
  return (
    <>
      <label className="relative cursor-pointer">
        <div className={`flex items-center h-9 px-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors ${error ? 'border-red-400' : 'border-gray-200'}`}>
          <span className="text-sm text-gray-400 flex-1 truncate">{file ? file.name : 'Choose File'}</span>
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ml-2" style={{ backgroundColor: PRIMARY }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
        </div>
        <input type="file" className="hidden" accept={accept} onChange={h} />
      </label>
      <ErrorMsg msg={error} />
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

// ─── Email Confirmation Modal ─────────────────────────────────────────────────
function EmailConfirmModal({ isOpen, onClose, onConfirm, loading, traineeName, email }) {
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50"><Mail size={28} color="#1E40AF" /></div>
          <div>
            <p className="text-base font-bold text-gray-900 mb-1">Send Credentials?</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              This will create the trainee record for <strong className="text-gray-700">{traineeName}</strong> and
              send login credentials to <strong className="text-gray-700">{email || 'the provided email'}</strong>.
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
            {loading && <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
            <Mail size={14} /> Submit & Send Email
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUS_TO_API = { Active: 'ACTIVE', Inactive: 'INACTIVE', 'On Hold': 'ON_HOLD' }
const PERIODS = ['1 month', '2 months', '3 months', '6 months', '1 year']
const YEARS   = Array.from({ length: 15 }, (_, i) => String(2012 + i))

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AddTrainee() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [errors,      setErrors]      = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Dropdown options ───────────────────────────────────────────────────────
  const [departments,  setDepartments]  = useState([])
  const [designations, setDesignations] = useState([])
  const [branches,     setBranches]     = useState([])
  const [docTypes,     setDocTypes]     = useState([])
  const [deptLoading,  setDeptLoading]  = useState(true)
  const [desigLoading, setDesigLoading] = useState(true)
  const [branchLoading,setBranchLoading]= useState(true)
  const [docLoading,   setDocLoading]   = useState(true)

  // ── Form state ─────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: '', middleName: '', lastName: '', gender: '',
    dob: '', personalPhone: '', emergencyPhone: '', personalEmail: '',
    maritalStatus: '', spouseName: '', profilePhoto: null,
  })
  const [office, setOffice] = useState({
    designation: '', designationId: '',
    department: '', departmentId: '',
    officeEmail: '',
    workLocation: '', workLocationId: '',
  })
  const [training, setTraining] = useState({
    startDate: '', endDate: '',
    trainingPeriodMonths: '', stipend: '',
    workingType: 'Full-time', workMode: 'Remote',
    status: 'Active',
  })
  const [edu, setEdu] = useState({
    hscCompletion: '', hscYear: '',
    bachelorCompletion: '', bachelorYear: '',
    masterCompletion: '', masterYear: '',
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
  // { [docKey]: File, [`reason_${docKey}`]: 'string' }
  const [docs, setDocs] = useState({})

  // ── Load dropdowns ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [deptRes, desigRes, branchRes, docRes] = await Promise.allSettled([
          apiClient.get('/departments',  { params: { page: 0, size: 200 } }),
          apiClient.get('/designations', { params: { page: 0, size: 200 } }),
          apiClient.get('/branches',     { params: { page: 0, size: 200 } }),
          apiClient.get('/document-types', { params: { applicableType: 'TRAINEE', page: 0, size: 100 } }),
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
        if (docRes.status === 'fulfilled') {
          const d = docRes.value?.data?.data ?? docRes.value?.data ?? {}
          setDocTypes(d.content ?? d ?? [])
        }
      } finally {
        setDeptLoading(false); setDesigLoading(false)
        setBranchLoading(false); setDocLoading(false)
      }
    }
    load()
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const up  = f => e => setPersonal(p  => ({ ...p,  [f]: e.target?.value ?? e }))
  const upo = f => e => setOffice(o   => ({ ...o,   [f]: e.target?.value ?? e }))
  const upt = f => e => setTraining(t => ({ ...t,   [f]: e.target?.value ?? e }))
  const upe = f => e => setEdu(ed     => ({ ...ed,  [f]: e.target?.value ?? e }))
  const upa = f => e => setAddress(a  => ({ ...a,   [f]: e.target?.value ?? e }))
  const upb = f => e => setBank(b     => ({ ...b,   [f]: e.target?.value ?? e }))

  const clearError  = k    => setErrors(p => { const n = { ...p }; delete n[k]; return n })
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

  // ── Build FormData ─────────────────────────────────────────────────────────
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
      emergencyPhone:     personal.emergencyPhone || null,
      personalEmail:      personal.personalEmail.trim() || null,
      officeEmail:        office.officeEmail.trim() || null,
      workProfile: {
        designationName: office.designation.trim() || null,
        departmentName:  office.department.trim()  || null,
        branchName:      office.workLocation.trim()|| null,
        workMode:        training.workMode.toUpperCase().replace(/[\s-]+/g, '_'),
        workingType:     training.workingType.toUpperCase().replace(/[\s-]+/g, '_'),
        status:          STATUS_TO_API[training.status] || 'ACTIVE',
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
      trainingDetails: {
        startDate:            training.startDate  || null,
        endDate:              training.endDate    || null,
        trainingPeriodMonths: training.trainingPeriodMonths !== '' ? Number(training.trainingPeriodMonths) : null,
        stipend:              training.stipend    !== '' ? Number(training.stipend)    : null,
        workMode:             training.workMode.toUpperCase().replace(/[\s-]+/g, '_'),
        workingType:          training.workingType.toUpperCase().replace(/[\s-]+/g, '_'),
      },
      educationDetails: {
        hscCompletion:           edu.hscCompletion.trim()       || null,
        hscYear:                 edu.hscYear     ? Number(edu.hscYear)     : null,
        bachelorCompletion:      edu.bachelorCompletion.trim()  || null,
        bachelorYear:            edu.bachelorYear? Number(edu.bachelorYear): null,
        masterCompletion:        edu.masterCompletion.trim()    || null,
        masterYear:              edu.masterYear  ? Number(edu.masterYear)  : null,
        degreeName:              edu.degreeName.trim()          || null,
        degreeResult:            edu.degreeResult.trim()        || null,
        universityName:          edu.universityName.trim()      || null,
        universityAddress:       edu.universityAddress.trim()   || null,
        trainingCompletionStatus:edu.trainingStatus             || null,
      },
    }

    const fd = new FormData()
    fd.append('personalInformation', JSON.stringify(personalInfo))
    fd.append('trainee',             JSON.stringify(traineeData))

    if (personal.profilePhoto) fd.append('profileImage', personal.profilePhoto)

    // Dynamic documents
    docTypes.forEach(dt => {
      const file   = docs[dt.docKey]
      const reason = docs[`reason_${dt.docKey}`]
      if (file instanceof File) fd.append(dt.docKey, file)
      if (reason?.trim())       fd.append(dt.docKey, reason.trim())
    })

    return fd
  }, [personal, office, training, edu, address, bank, docs, docTypes])

  // ── Save as Draft ──────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!personal.firstName.trim() || !personal.lastName.trim()) {
      setErrors({
        firstName: !personal.firstName.trim() ? 'First name is required' : undefined,
        lastName:  !personal.lastName.trim()  ? 'Last name is required'  : undefined,
      })
      toast.warning('Please provide at least first and last name for draft')
      return
    }
    setSubmitting(true)
    try {
      const fd = buildPayload(true)
      await employeeService.create(fd)
      toast.success('Trainee saved as draft successfully')
      navigate('/employees')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save draft')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmitClick = () => {
    const errs = buildErrors(personal, office, training, edu, address, bank, docs, docTypes)
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
      navigate('/employees')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create trainee')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-full pb-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
          <h1 className="text-xl font-bold text-gray-900">Add Trainee</h1>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs font-semibold text-gray-700">Employment Type</span>
            <div className="flex items-center gap-4">
              {['Internship', 'Training', 'Employee'].map(type => (
                <RadioOption key={type} name="employmentType" value={type}
                  checked={type === 'Training'}
                  onChange={() => navigate(EMPLOYMENT_TYPE_ROUTES[type])}
                  label={type} />
              ))}
            </div>
          </div>
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
                  <option>Male</option><option>Female</option><option>Other</option>
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
                <PhoneInput value={personal.personalPhone} error={errors.personalPhone}
                  onChange={e => { up('personalPhone')(e); clearError('personalPhone') }} />
              </div>
              <div data-error={!!errors.emergencyPhone}>
                <FieldLabel required>Emergency Phone</FieldLabel>
                <PhoneInput value={personal.emergencyPhone} error={errors.emergencyPhone}
                  onChange={e => { up('emergencyPhone')(e); clearError('emergencyPhone') }} />
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
                  <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
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
                <FileUpload file={personal.profilePhoto} accept="image/*" error={errors.profilePhoto}
                  onChange={f => { setPersonal(p => ({ ...p, profilePhoto: f })); clearError('profilePhoto') }} />
              </div>
            </div>
          </SectionCard>

          {/* ── Office / Work Profile ── */}
          <SectionCard title="Office Information">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div data-error={!!errors.designation}>
                <FieldLabel required>Designation</FieldLabel>
                <SearchableSelect
                  value={office.designation} options={designations}
                  labelKey="name" valueKey="name" placeholder="Select designation…"
                  loading={desigLoading} error={errors.designation}
                  onChange={opt => { setOffice(o => ({ ...o, designation: opt.name, designationId: opt.id })); clearError('designation') }}
                />
              </div>
              <div data-error={!!errors.department}>
                <FieldLabel required>Department</FieldLabel>
                <SearchableSelect
                  value={office.department} options={departments}
                  labelKey="name" valueKey="name" placeholder="Select department…"
                  loading={deptLoading} error={errors.department}
                  onChange={opt => { setOffice(o => ({ ...o, department: opt.name, departmentId: opt.id })); clearError('department') }}
                />
              </div>
              <div data-error={!!errors.workLocation}>
                <FieldLabel required>Branch / Work Location</FieldLabel>
                <SearchableSelect
                  value={office.workLocation} options={branches}
                  labelKey="branchName" valueKey="branchName" placeholder="Select branch…"
                  loading={branchLoading} error={errors.workLocation}
                  onChange={opt => { setOffice(o => ({ ...o, workLocation: opt.branchName, workLocationId: opt.id })); clearError('workLocation') }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
              <div data-error={!!errors.officeEmail}>
                <FieldLabel required>Office Email</FieldLabel>
                <TextInput type="email" placeholder="name@company.com" value={office.officeEmail}
                  error={errors.officeEmail}
                  onChange={e => { upo('officeEmail')(e); clearError('officeEmail') }} />
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
            {/* 12th / HSC */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div data-error={!!errors.hscCompletion}>
                <FieldLabel required>12th (HSC) Completion</FieldLabel>
                <SelectInput value={edu.hscCompletion} error={errors.hscCompletion}
                  onChange={e => { upe('hscCompletion')(e); clearError('hscCompletion') }}>
                  <option value="">Select…</option>
                  {PERIODS.map(p => <option key={p}>{p}</option>)}
                </SelectInput>
              </div>
              <div data-error={!!errors.hscYear}>
                <FieldLabel required>12th Year</FieldLabel>
                <SelectInput value={edu.hscYear} error={errors.hscYear}
                  onChange={e => { upe('hscYear')(e); clearError('hscYear') }}>
                  <option value="">Select Year</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </SelectInput>
              </div>
            </div>

            {/* Bachelor */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div data-error={!!errors.bachelorCompletion}>
                <FieldLabel required>Bachelor Degree Completion</FieldLabel>
                <SelectInput value={edu.bachelorCompletion} error={errors.bachelorCompletion}
                  onChange={e => { upe('bachelorCompletion')(e); clearError('bachelorCompletion') }}>
                  <option value="">Select…</option>
                  {PERIODS.map(p => <option key={p}>{p}</option>)}
                </SelectInput>
              </div>
              <div data-error={!!errors.bachelorYear}>
                <FieldLabel required>Bachelor Year</FieldLabel>
                <SelectInput value={edu.bachelorYear} error={errors.bachelorYear}
                  onChange={e => { upe('bachelorYear')(e); clearError('bachelorYear') }}>
                  <option value="">Select Year</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </SelectInput>
              </div>
            </div>

            {/* Master (optional) */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <FieldLabel>Master Degree Completion</FieldLabel>
                <SelectInput value={edu.masterCompletion} onChange={upe('masterCompletion')}>
                  <option value="">Select…</option>
                  {PERIODS.map(p => <option key={p}>{p}</option>)}
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Master Year</FieldLabel>
                <SelectInput value={edu.masterYear} onChange={upe('masterYear')}>
                  <option value="">Select Year</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </SelectInput>
              </div>
            </div>

            {/* Degree + Result */}
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

            {/* University */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div data-error={!!errors.universityName}>
                <FieldLabel required>University Name</FieldLabel>
                <TextInput placeholder="Shivaji University" value={edu.universityName} error={errors.universityName}
                  onChange={e => { upe('universityName')(e); clearError('universityName') }} />
              </div>
              <div data-error={!!errors.universityAddress}>
                <FieldLabel required>University Address</FieldLabel>
                <TextInput placeholder="Kolhapur, Maharashtra" value={edu.universityAddress}
                  error={errors.universityAddress}
                  onChange={e => { upe('universityAddress')(e); clearError('universityAddress') }} />
              </div>
            </div>

            {/* Training completion status */}
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
                <TextInput placeholder="Kolhapur" value={address.city} error={errors.city}
                  onChange={e => {
                    upa('city')(e); clearError('city')
                    if (address.sameAsCurrent) upa('permCity')(e)
                  }} />
              </div>
              <div data-error={!!errors.district}>
                <FieldLabel required>District</FieldLabel>
                <TextInput placeholder="Kolhapur" value={address.district} error={errors.district}
                  onChange={e => {
                    upa('district')(e); clearError('district')
                    if (address.sameAsCurrent) upa('permDistrict')(e)
                  }} />
              </div>
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near..." value={address.landmark}
                  onChange={e => { upa('landmark')(e); if (address.sameAsCurrent) upa('permLandmark')(e) }} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div data-error={!!errors.state}>
                <FieldLabel required>State</FieldLabel>
                <TextInput placeholder="Maharashtra" value={address.state} error={errors.state}
                  onChange={e => {
                    upa('state')(e); clearError('state')
                    if (address.sameAsCurrent) upa('permState')(e)
                  }} />
              </div>
              <div data-error={!!errors.pinCode}>
                <FieldLabel required>PIN Code</FieldLabel>
                <TextInput placeholder="416001" value={address.pinCode} numericOnly error={errors.pinCode}
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
              {[
                { key: 'permAddress',  placeholder: 'Street / House No.' },
                { key: 'permCity',     placeholder: 'Kolhapur' },
                { key: 'permDistrict', placeholder: 'Kolhapur' },
              ].map(({ key, placeholder }) => (
                <div key={key}>
                  <FieldLabel required={!address.sameAsCurrent}>
                    {key === 'permAddress' ? 'Address Line' : key === 'permCity' ? 'City' : 'District'}
                  </FieldLabel>
                  <TextInput placeholder={placeholder}
                    value={address.sameAsCurrent
                      ? address[key === 'permAddress' ? 'currentAddress' : key === 'permCity' ? 'city' : 'district']
                      : address[key]}
                    error={errors[key]}
                    onChange={e => { upa(key)(e); clearError(key) }}
                    className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
                </div>
              ))}
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near..."
                  value={address.sameAsCurrent ? address.landmark : address.permLandmark}
                  onChange={e => upa('permLandmark')(e)}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'permState',   curKey: 'state',   placeholder: 'Maharashtra' },
                { key: 'permPinCode', curKey: 'pinCode', placeholder: '416001', numeric: true },
                { key: 'permCountry', curKey: 'country', placeholder: 'India' },
              ].map(({ key, curKey, placeholder, numeric }) => (
                <div key={key}>
                  <FieldLabel required={!address.sameAsCurrent}>
                    {key === 'permState' ? 'State' : key === 'permPinCode' ? 'PIN Code' : 'Country'}
                  </FieldLabel>
                  <TextInput placeholder={placeholder} numericOnly={numeric}
                    value={address.sameAsCurrent ? address[curKey] : address[key]}
                    error={errors[key]}
                    onChange={e => { upa(key)(e); clearError(key) }}
                    className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
                </div>
              ))}
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
              <div><FieldLabel>PF Number</FieldLabel><TextInput placeholder="PF number" value={bank.pfNumber} onChange={upb('pfNumber')} /></div>
              <div><FieldLabel>UAN Number</FieldLabel><TextInput placeholder="UAN number" value={bank.uanNumber} numericOnly onChange={upb('uanNumber')} /></div>
            </div>
          </SectionCard>

          {/* ── Documents (dynamic, TRAINEE-filtered) ── */}
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
              <p className="text-sm text-gray-400 py-2">No documents configured for TRAINEE. Ask admin to add document types.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {docTypes.map(dt => {
                  const errKey = `doc_${dt.docKey}`
                  const file   = docs[dt.docKey]
                  const reason = docs[`reason_${dt.docKey}`] ?? ''
                  return (
                    <div key={dt.docKey} className="flex flex-col gap-1.5">
                      <FieldLabel required={dt.mandatory}>
                        {dt.name}
                        {dt.mandatory && <span className="ml-1.5 text-[10px] font-normal text-gray-400">(mandatory)</span>}
                      </FieldLabel>
                      <FileUpload
                        file={file instanceof File ? file : null}
                        accept=".pdf,.jpg,.jpeg,.png"
                        error={errors[errKey]}
                        onChange={f => {
                          setDocs(d => ({ ...d, [dt.docKey]: f, [`reason_${dt.docKey}`]: '' }))
                          clearError(errKey)
                        }}
                      />
                      {!(file instanceof File) && (
                        <input
                          type="text"
                          placeholder="Reason if not available"
                          value={reason}
                          onChange={e => {
                            setDocs(d => ({ ...d, [`reason_${dt.docKey}`]: e.target.value }))
                            clearError(errKey)
                          }}
                          className={`w-full h-8 px-2.5 text-xs text-gray-600 bg-gray-50 border rounded-lg outline-none transition-colors
                            ${errors[errKey] ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33]'}`}
                        />
                      )}
                      <ErrorMsg msg={errors[errKey]} />
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* ── Action Buttons ── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/employees')}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>

            <button type="button" onClick={handleSaveDraft} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors disabled:opacity-50"
              style={{ borderColor: PRIMARY, color: PRIMARY }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FDF5F1')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              {submitting
                ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : <Save size={15} />}
              Save as Draft
            </button>

            <button type="button" onClick={handleSubmitClick} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#111827' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}>
              <UserPlus size={15} /> Add Trainee
            </button>
          </div>
        </div>
      </div>

      <EmailConfirmModal
        isOpen={showConfirm}
        onClose={() => !submitting && setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        loading={submitting}
        traineeName={`${personal.firstName} ${personal.lastName}`.trim()}
        email={office.officeEmail || personal.personalEmail}
      />
    </>
  )
}