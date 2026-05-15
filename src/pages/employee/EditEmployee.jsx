// src/pages/employee/EditEmployee.jsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, UserPlus, Mail, ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import SearchableSelect from '@/components/shared/SearchableSelect'
import employeeService  from '@/services/employeeService'
import apiClient        from '@/services/apiClient'

const PRIMARY = '#C35E33'

// ─── Tiny shared UI helpers ───────────────────────────────────────────────────
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
    if (numericOnly) {
      const v = e.target.value.replace(/\D/g, '')
      onChange({ target: { value: v } })
    } else onChange(e)
  }
  return (
    <>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={h} readOnly={readOnly}
        className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border rounded-lg outline-none transition-colors placeholder:text-gray-400
          ${error      ? 'border-red-400 focus:border-red-500'
            : readOnly ? 'border-gray-100 bg-gray-100 cursor-not-allowed opacity-70'
                       : 'border-gray-200 focus:border-[#C35E33] focus:bg-white'}
          ${className}`}
      />
      <ErrorMsg msg={error} />
    </>
  )
}
function SelectInput({ children, value, onChange, error }) {
  return (
    <>
      <select value={value} onChange={onChange}
        className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border rounded-lg outline-none appearance-none cursor-pointer
          ${error ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33] focus:bg-white'}`}>
        {children}
      </select>
      <ErrorMsg msg={error} />
    </>
  )
}
function PhoneInput({ value, onChange, error }) {
  const h = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
    onChange({ target: { value: v } })
  }
  return (
    <>
      <div className="flex h-9">
        <span className="flex items-center px-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-xs text-gray-500">+91</span>
        <input type="tel" inputMode="numeric" placeholder="9876543210"
          value={value} onChange={h} maxLength={10}
          className={`flex-1 min-w-0 px-2 text-sm text-gray-700 bg-gray-50 border rounded-r-lg outline-none transition-colors
            ${error ? 'border-red-400' : 'border-gray-200 focus:border-[#C35E33]'}`}
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
      <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ borderColor: checked ? PRIMARY : '#D1D5DB', backgroundColor: checked ? PRIMARY : 'transparent' }}>
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      <span className="text-xs text-gray-600 whitespace-nowrap">{label}</span>
    </label>
  )
}
function FileUpload({ label, onChange, file, error, accept = '*' }) {
  const h = (e) => {
    if (e.target.files?.length > 0) onChange(e.target.files[0])
    e.target.value = ''
  }
  return (
    <>
      <label className="relative cursor-pointer">
        <div className={`flex items-center h-9 px-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors ${error ? 'border-red-400' : 'border-gray-200'}`}>
          <span className="text-sm text-gray-400 flex-1 truncate">{file ? (file.name ?? file) : 'Choose File'}</span>
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ml-2" style={{ backgroundColor: PRIMARY }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
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

// ─── Email confirm modal ──────────────────────────────────────────────────────
function EmailConfirmModal({ isOpen, onClose, onConfirm, loading, employeeName, email }) {
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
            className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50"><Mail size={28} color="#1E40AF" /></div>
          <div>
            <p className="text-base font-bold text-gray-900 mb-1">Submit Employee?</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              This will finalise the record for <strong className="text-gray-700">{employeeName}</strong> and send
              login credentials to <strong className="text-gray-700">{email || 'the provided email'}</strong>.
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
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
const API_TO_WMODE  = { REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On site' }
const API_TO_WTYPE  = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACTUAL: 'Contractual' }
const API_TO_STATUS = { ACTIVE: 'Active', INACTIVE: 'Inactive', ON_HOLD: 'On Hold' }

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EditEmployee() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { toast } = useToast()

  // ── Loading states ────────────────────────────────────────────────────────
  const [pageLoading,  setPageLoading]  = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [errors,       setErrors]       = useState({})

  // ── Dropdown options (fetched from API) ───────────────────────────────────
  const [departments,  setDepartments]  = useState([])
  const [designations, setDesignations] = useState([])
  const [branches,     setBranches]     = useState([])
  const [docTypes,     setDocTypes]     = useState([])   // dynamic document types
  const [deptLoading,  setDeptLoading]  = useState(true)
  const [desigLoading, setDesigLoading] = useState(true)
  const [branchLoading,setBranchLoading]= useState(true)
  const [docLoading,   setDocLoading]   = useState(true)

  // ── Employee meta ─────────────────────────────────────────────────────────
  const [personalInfoId, setPersonalInfoId] = useState(null)

  // ── Form state (mirrors AddEmployee) ─────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: '', middleName: '', lastName: '', gender: '',
    dob: '', personalPhone: '', emergencyPhone: '', personalEmail: '',
    maritalStatus: '', spouseName: '', profilePhoto: null,
  })
  const [office, setOffice] = useState({
    employeeId: '', designation: '', designationId: '',
    department: '', departmentId: '',
    officeEmail: '', joiningDate: '', experience: '',
    prevCompanyNames: [''],
    workLocation: '', workLocationId: '', shiftId: '',
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
  // Dynamic: { [docKey]: File | null }
  const [documents, setDocuments] = useState({})
  // { [docKey]: 'reason text' } for missing mandatory docs
  const [docReasons, setDocReasons] = useState({})

  // ── Fetch dropdown options ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [deptRes, desigRes, branchRes, docRes] = await Promise.allSettled([
          apiClient.get('/departments',   { params: { page: 0, size: 200 } }),
          apiClient.get('/designations',  { params: { page: 0, size: 200 } }),
          apiClient.get('/branches',      { params: { page: 0, size: 200 } }),
          // Fetch document types applicable to EMPLOYEE only
          apiClient.get('/document-types', { params: { applicableType: 'EMPLOYEE', page: 0, size: 100 } }),
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

  // ── Fetch existing employee data and pre-fill ──────────────────────────────
  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const res  = await employeeService.getById(id)
        const emp  = res?.data?.data ?? res?.data ?? {}

        setPersonalInfoId(emp.personalInformationId ?? null)

        setPersonal(p => ({
          ...p,
          firstName:     emp.firstName     ?? '',
          middleName:    emp.middleName     ?? '',
          lastName:      emp.lastName       ?? '',
          gender:        emp.gender         ?? '',
          dob:           emp.dateOfBirth    ?? '',
          personalPhone: emp.personalPhone  ?? '',
          emergencyPhone:emp.emergencyPhone ?? '',
          personalEmail: emp.personalEmail  ?? '',
          maritalStatus: emp.maritalStatus  ?? '',
          spouseName:    emp.spouseOrParentName ?? '',
        }))

        setOffice(o => ({
          ...o,
          employeeId:    emp.employeeCode   ?? '',
          officeEmail:   emp.officeEmail    ?? '',
          joiningDate:   emp.employment?.dateOfJoining ?? '',
          experience:    emp.employment?.yearOfExperience != null ? String(emp.employment.yearOfExperience) : '',
          prevCompanyNames: emp.employment?.previousCompanyNames?.length > 0
            ? emp.employment.previousCompanyNames
            : [''],
          designation:   emp.designationName ?? '',
          department:    emp.departmentName  ?? '',
          workLocation:  emp.branchName      ?? '',
          role:          emp.role            ?? '',
        }))

        setEmpDetails(e => ({
          ...e,
          salary:      emp.employment?.ctc        != null ? String(emp.employment.ctc)         : '',
          noticePeriod:emp.employment?.noticePeriod != null ? String(emp.employment.noticePeriod) : '',
          workMode:    API_TO_WMODE[emp.workMode]  ?? 'Remote',
          workingMode: API_TO_WTYPE[emp.workingType] ?? 'Full-time',
          status:      API_TO_STATUS[emp.status]   ?? 'Active',
        }))
      } catch (err) {
        toast.error('Failed to load employee data')
      } finally {
        setPageLoading(false)
      }
    }
    load()
  }, [id])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const up  = (f) => (e) => setPersonal(p  => ({ ...p, [f]: e.target?.value ?? e }))
  const upo = (f) => (e) => setOffice(o   => ({ ...o, [f]: e.target?.value ?? e }))
  const upe = (f) => (e) => setEmpDetails(d => ({ ...d, [f]: e.target?.value ?? e }))
  const upa = (f) => (e) => setAddress(a  => ({ ...a, [f]: e.target?.value ?? e }))
  const upb = (f) => (e) => setBank(b     => ({ ...b, [f]: e.target?.value ?? e }))

  const clearError  = (k)    => setErrors(p => { const n = { ...p }; delete n[k]; return n })
  const clearErrors = (...ks) => setErrors(p => { const n = { ...p }; ks.forEach(k => delete n[k]); return n })

  const handleSameAsCurrent = (checked) => {
    setAddress(p => ({
      ...p, sameAsCurrent: checked,
      ...(checked ? {
        permAddress: p.currentAddress, permCity: p.city, permDistrict: p.district,
        permLandmark: p.landmark, permState: p.state, permPinCode: p.pinCode, permCountry: p.country,
      } : {}),
    }))
    if (checked) clearErrors('permAddress', 'permCity', 'permDistrict', 'permState', 'permPinCode', 'permCountry')
  }

  const addPrevCompany    = () => setOffice(p => ({ ...p, prevCompanyNames: [...p.prevCompanyNames, ''] }))
  const updatePrevCompany = (i, v) => setOffice(p => ({
    ...p, prevCompanyNames: p.prevCompanyNames.map((x, idx) => idx === i ? v : x),
  }))

  // ── Build FormData ─────────────────────────────────────────────────────────
  const buildPayload = useCallback((isDraft) => {
    const personalInfo = {
      status:             isDraft ? 'DRAFT' : 'SUBMITTED',
      firstName:          personal.firstName.trim(),
      middleName:         personal.middleName.trim(),
      lastName:           personal.lastName.trim(),
      gender:             personal.gender?.toUpperCase() || null,
      dateOfBirth:        personal.dob || null,
      employmentType:     'EMPLOYEE',
      maritalStatus:      personal.maritalStatus?.toUpperCase() || null,
      spouseOrParentName: personal.spouseName.trim() || null,
      personalPhone:      personal.personalPhone || null,
      emergencyPhone:     personal.emergencyPhone || null,
      personalEmail:      personal.personalEmail.trim() || null,
      officeEmail:        office.officeEmail.trim() || null,
      workProfile: {
        designationName:    office.designation.trim() || null,
        departmentName:     office.department.trim()  || null,
        branchName:         office.workLocation.trim()|| null,
        workMode:           empDetails.workMode.toUpperCase().replace(/[\s-]+/g, '_'),
        workingType:        empDetails.workingMode.toUpperCase().replace(/[\s-]+/g, '_'),
        status:             STATUS_TO_API[empDetails.status] ?? 'ACTIVE',
      },
      address: {
        currentAddress: {
          addressLine: address.currentAddress.trim() || null,
          city:        address.city.trim()     || null,
          district:    address.district.trim() || null,
          landmark:    address.landmark.trim() || null,
          state:       address.state.trim()    || null,
          pinCode:     address.pinCode.trim()  || null,
          country:     address.country.trim()  || null,
        },
        sameAsCurrent: address.sameAsCurrent,
        permanentAddress: address.sameAsCurrent ? null : {
          addressLine: address.permAddress.trim()  || null,
          city:        address.permCity.trim()     || null,
          district:    address.permDistrict.trim() || null,
          landmark:    address.permLandmark.trim() || null,
          state:       address.permState.trim()    || null,
          pinCode:     address.permPinCode.trim()  || null,
          country:     address.permCountry.trim()  || null,
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
      role:         office.role?.toUpperCase() || 'EMPLOYEE',
      employeeCode: office.employeeId.trim()   || null,
      employment: {
        dateOfJoining:        office.joiningDate  || null,
        yearOfExperience:     office.experience !== ''    ? Number(office.experience)    : null,
        ctc:                  empDetails.salary !== ''    ? Number(empDetails.salary)    : null,
        previousCompanyNames: office.prevCompanyNames.filter(Boolean),
        noticePeriod:         empDetails.noticePeriod !== '' ? Number(empDetails.noticePeriod) : null,
      },
    }

    const fd = new FormData()
    fd.append('personalInformation', JSON.stringify(personalInfo))
    fd.append('employee',            JSON.stringify(employeeData))

    if (personal.profilePhoto instanceof File) fd.append('profileImage', personal.profilePhoto)

    // Dynamic documents: use docKey as FormData field name
    Object.entries(documents).forEach(([docKey, file]) => {
      if (file instanceof File) fd.append(docKey, file)
    })
    // Reasons for missing docs
    Object.entries(docReasons).forEach(([docKey, reason]) => {
      if (reason?.trim()) fd.append(docKey, reason.trim())
    })

    return fd
  }, [personal, office, empDetails, address, bank, documents, docReasons])

  // ── Save as Draft ──────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setSubmitting(true)
    try {
      const fd = buildPayload(true)
      await employeeService.update(id, fd)
      toast.success('Draft saved successfully')
      navigate('/employees')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save draft')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmitClick = () => {
    const errs = {}
    if (!personal.firstName.trim())  errs.firstName     = 'First name is required'
    if (!personal.middleName.trim()) errs.middleName    = 'Middle name is required'
    if (!personal.lastName.trim())   errs.lastName      = 'Last name is required'
    if (!personal.gender)            errs.gender        = 'Gender is required'
    if (!personal.dob)               errs.dob           = 'Date of birth is required'
    if (!personal.maritalStatus)     errs.maritalStatus = 'Marital status is required'
    if (!personal.spouseName.trim()) errs.spouseName    = 'Spouse/Parent name is required'
    if (!personal.personalPhone)     errs.personalPhone = 'Personal phone is required'
    if (!personal.personalEmail)     errs.personalEmail = 'Personal email is required'
    if (!office.designation.trim())  errs.designation   = 'Designation is required'
    if (!office.department.trim())   errs.department    = 'Department is required'
    if (!office.officeEmail.trim())  errs.officeEmail   = 'Office email is required'
    if (!office.joiningDate)         errs.joiningDate   = 'Date of joining is required'
    if (!office.workLocation.trim()) errs.workLocation  = 'Branch is required'
    if (!empDetails.salary)          errs.salary        = 'CTC is required'
    if (!address.currentAddress.trim()) errs.currentAddress = 'Address line is required'
    if (!address.city.trim())        errs.city    = 'City is required'
    if (!address.state.trim())       errs.state   = 'State is required'
    if (!address.pinCode.trim())     errs.pinCode = 'PIN code is required'

    // Mandatory documents
    docTypes.forEach(dt => {
      if (dt.mandatory) {
        const hasFile   = documents[dt.docKey] instanceof File
        const hasReason = docReasons[dt.docKey]?.trim()
        if (!hasFile && !hasReason) errs[`doc_${dt.docKey}`] = `${dt.name} is required`
      }
    })

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.warning('Please fix the highlighted fields')
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
      await employeeService.update(id, fd)
      toast.success('Employee submitted successfully! Credentials sent via email.')
      setShowConfirm(false)
      navigate('/employees')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit employee')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" size={32} color={PRIMARY} />
          <p className="text-sm text-gray-500">Loading employee data…</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-full pb-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <button onClick={() => navigate('/employees')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-xl font-bold text-gray-900">Edit Employee Draft</h1>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
            Draft
          </span>
        </div>

        <div className="flex flex-col gap-5">

          {/* ── Personal Information ── */}
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                { key: 'firstName',  label: 'First Name',   ph: 'First Name' },
                { key: 'middleName', label: 'Middle Name',  ph: 'Middle Name' },
                { key: 'lastName',   label: 'Last Name',    ph: 'Last Name' },
              ].map(({ key, label, ph }) => (
                <div key={key} data-error={!!errors[key]}>
                  <FieldLabel required>{label}</FieldLabel>
                  <TextInput placeholder={ph} value={personal[key]} error={errors[key]}
                    onChange={e => { up(key)(e); clearError(key) }} />
                </div>
              ))}
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <div>
                <FieldLabel>Profile Photo</FieldLabel>
                <FileUpload file={personal.profilePhoto} accept="image/*"
                  error={errors.profilePhoto}
                  onChange={f => { setPersonal(p => ({ ...p, profilePhoto: f })); clearError('profilePhoto') }} />
              </div>
            </div>
          </SectionCard>

          {/* ── Office Information (searchable dropdowns) ── */}
          <SectionCard title="Office Information">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <FieldLabel>Employee ID</FieldLabel>
                <TextInput placeholder="GMEP001" value={office.employeeId} onChange={upo('employeeId')} />
              </div>

              {/* ── Designation dropdown ── */}
              <div data-error={!!errors.designation}>
                <FieldLabel required>Designation</FieldLabel>
                <SearchableSelect
                  value={office.designation}
                  options={designations}
                  labelKey="name"
                  valueKey="name"
                  placeholder="Select designation…"
                  loading={desigLoading}
                  error={errors.designation}
                  onChange={opt => {
                    setOffice(o => ({ ...o, designation: opt.name, designationId: opt.id }))
                    clearError('designation')
                  }}
                />
              </div>

              {/* ── Department dropdown ── */}
              <div data-error={!!errors.department}>
                <FieldLabel required>Department</FieldLabel>
                <SearchableSelect
                  value={office.department}
                  options={departments}
                  labelKey="name"
                  valueKey="name"
                  placeholder="Select department…"
                  loading={deptLoading}
                  error={errors.department}
                  onChange={opt => {
                    setOffice(o => ({ ...o, department: opt.name, departmentId: opt.id }))
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
              <div data-error={!!errors.joiningDate}>
                <FieldLabel required>Date of Joining</FieldLabel>
                <TextInput type="date" value={office.joiningDate} error={errors.joiningDate}
                  onChange={e => { upo('joiningDate')(e); clearError('joiningDate') }} />
              </div>
              <div data-error={!!errors.experience}>
                <FieldLabel>Years of Experience</FieldLabel>
                <TextInput placeholder="2" value={office.experience} numericOnly error={errors.experience}
                  onChange={e => { upo('experience')(e); clearError('experience') }} />
              </div>

              {/* ── Branch / Work Location dropdown ── */}
              <div data-error={!!errors.workLocation}>
                <FieldLabel required>Branch / Work Location</FieldLabel>
                <SearchableSelect
                  value={office.workLocation}
                  options={branches}
                  labelKey="branchName"
                  valueKey="branchName"
                  placeholder="Select branch…"
                  loading={branchLoading}
                  error={errors.workLocation}
                  onChange={opt => {
                    setOffice(o => ({ ...o, workLocation: opt.branchName, workLocationId: opt.id }))
                    clearError('workLocation')
                  }}
                />
              </div>
            </div>

            <div className="mb-3">
              <FieldLabel>Previous Company Name(s)</FieldLabel>
              <div className="flex flex-col gap-2">
                {office.prevCompanyNames.map((name, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" placeholder={`Company ${idx + 1}`} value={name}
                      onChange={e => updatePrevCompany(idx, e.target.value)}
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

            <div className="grid grid-cols-2 gap-3">
              <div data-error={!!errors.reportingManager}>
                <FieldLabel>Reporting Manager</FieldLabel>
                <TextInput placeholder="Manager Name" value={office.reportingManager}
                  onChange={upo('reportingManager')} />
              </div>
              <div data-error={!!errors.role}>
                <FieldLabel>Role</FieldLabel>
                <TextInput placeholder="Employee" value={office.role}
                  onChange={upo('role')} />
              </div>
            </div>
          </SectionCard>

          {/* ── Employment Details ── */}
          <SectionCard title="Employment Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div data-error={!!errors.salary}>
                  <FieldLabel required>Salary / CTC (₹)</FieldLabel>
                  <TextInput placeholder="500000" value={empDetails.salary} numericOnly error={errors.salary}
                    onChange={e => { upe('salary')(e); clearError('salary') }} />
                </div>
                <div>
                  <FieldLabel required>Work Mode</FieldLabel>
                  <div className="flex items-center gap-4 mt-1">
                    {['Remote', 'Hybrid', 'On site'].map(m => (
                      <RadioOption key={m} name="workMode_edit" value={m}
                        checked={empDetails.workMode === m} onChange={upe('workMode')} label={m} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <FieldLabel required>Employee Status</FieldLabel>
                  <div className="flex items-center gap-4 mt-1">
                    {['Active', 'Inactive', 'On Hold'].map(s => (
                      <RadioOption key={s} name="empStatus_edit" value={s}
                        checked={empDetails.status === s} onChange={upe('status')} label={s} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Working Type</FieldLabel>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {['Part-time', 'Full-time', 'Contractual'].map(m => (
                        <RadioOption key={m} name="workingMode_edit" value={m}
                          checked={empDetails.workingMode === m} onChange={upe('workingMode')} label={m} />
                      ))}
                    </div>
                  </div>
                  <div data-error={!!errors.noticePeriod}>
                    <FieldLabel>Notice Period (days)</FieldLabel>
                    <TextInput placeholder="30" value={empDetails.noticePeriod} numericOnly
                      error={errors.noticePeriod}
                      onChange={e => { upe('noticePeriod')(e); clearError('noticePeriod') }} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Current Address ── */}
          <SectionCard title="Current Address">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                { key: 'currentAddress', label: 'Address Line', ph: 'Street / House No.' },
                { key: 'city',    label: 'City',     ph: 'Kolhapur' },
                { key: 'district',label: 'District', ph: 'Kolhapur' },
              ].map(({ key, label, ph }) => (
                <div key={key} data-error={!!errors[key]}>
                  <FieldLabel required={key !== 'landmark'}>{label}</FieldLabel>
                  <TextInput placeholder={ph} value={address[key]} error={errors[key]}
                    onChange={e => {
                      upa(key)(e); clearError(key)
                      if (address.sameAsCurrent) {
                        const permKey = key === 'currentAddress' ? 'permAddress' : `perm${key.charAt(0).toUpperCase() + key.slice(1)}`
                        upa(permKey)(e)
                      }
                    }} />
                </div>
              ))}
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near…" value={address.landmark}
                  onChange={e => { upa('landmark')(e); if (address.sameAsCurrent) upa('permLandmark')(e) }} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'state',   label: 'State',    ph: 'Maharashtra' },
                { key: 'pinCode', label: 'PIN Code', ph: '416001', numeric: true },
                { key: 'country', label: 'Country',  ph: 'India' },
              ].map(({ key, label, ph, numeric }) => (
                <div key={key} data-error={!!errors[key]}>
                  <FieldLabel required>{label}</FieldLabel>
                  <TextInput placeholder={ph} value={address[key]} numericOnly={numeric} error={errors[key]}
                    onChange={e => {
                      upa(key)(e); clearError(key)
                      if (address.sameAsCurrent) {
                        const permKey = `perm${key.charAt(0).toUpperCase() + key.slice(1)}`
                        upa(permKey)(e)
                      }
                    }} />
                </div>
              ))}
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
              <span className="text-xs text-gray-600 font-medium select-none"
                onClick={() => handleSameAsCurrent(!address.sameAsCurrent)}>
                Permanent address is same as current address
              </span>
            </label>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                { key: 'permAddress', label: 'Address Line', ph: 'Street / House No.' },
                { key: 'permCity',    label: 'City',     ph: 'Kolhapur' },
                { key: 'permDistrict',label: 'District', ph: 'Kolhapur' },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <FieldLabel required={!address.sameAsCurrent}>{label}</FieldLabel>
                  <TextInput placeholder={ph}
                    value={address.sameAsCurrent ? address[key.replace('perm','').replace(/^(.)/, c => c.toLowerCase())] || address[key] : address[key]}
                    error={errors[key]}
                    onChange={e => { upa(key)(e); clearError(key) }}
                    className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
                </div>
              ))}
              <div>
                <FieldLabel>Landmark</FieldLabel>
                <TextInput placeholder="Near…" value={address.sameAsCurrent ? address.landmark : address.permLandmark}
                  onChange={e => upa('permLandmark')(e)}
                  className={address.sameAsCurrent ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'permState',   curKey: 'state',   label: 'State',    ph: 'Maharashtra' },
                { key: 'permPinCode', curKey: 'pinCode', label: 'PIN Code', ph: '416001', numeric: true },
                { key: 'permCountry', curKey: 'country', label: 'Country',  ph: 'India' },
              ].map(({ key, curKey, label, ph, numeric }) => (
                <div key={key}>
                  <FieldLabel required={!address.sameAsCurrent}>{label}</FieldLabel>
                  <TextInput placeholder={ph} numericOnly={numeric}
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
              {[
                { key: 'bankName',      label: 'Bank Name',       ph: 'HDFC Bank',    req: true  },
                { key: 'accountNumber', label: 'Account Number',  ph: '••••••••••••', type: 'password', numeric: true, req: true },
                { key: 'ifscCode',      label: 'IFSC Code',       ph: 'HDFC0001234',  upper: true, req: true },
              ].map(({ key, label, ph, type, numeric, upper, req }) => (
                <div key={key} data-error={!!errors[key]}>
                  <FieldLabel required={req}>{label}</FieldLabel>
                  <TextInput placeholder={ph} type={type || 'text'} value={bank[key]}
                    numericOnly={numeric} error={errors[key]}
                    onChange={e => {
                      const v = upper ? { target: { value: e.target.value.toUpperCase() } } : e
                      upb(key)(v); clearError(key)
                    }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              {[
                { key: 'panNumber',     label: 'PAN Number',       ph: 'ABCDE1234F', upper: true, req: true },
                { key: 'aadhaarNumber', label: 'Aadhaar Number',   ph: '123456789012', numeric: true, req: true },
                { key: 'esicNumber',    label: 'ESIC Number',      ph: 'ESIC number',  numeric: true },
              ].map(({ key, label, ph, numeric, upper, req }) => (
                <div key={key} data-error={!!errors[key]}>
                  <FieldLabel required={req}>{label}</FieldLabel>
                  <TextInput placeholder={ph} value={bank[key]} numericOnly={numeric} error={errors[key]}
                    onChange={e => {
                      const v = upper ? { target: { value: e.target.value.toUpperCase() } } : e
                      upb(key)(v); clearError(key)
                    }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><FieldLabel>PF Number</FieldLabel><TextInput placeholder="PF number" value={bank.pfNumber} onChange={upb('pfNumber')} /></div>
              <div><FieldLabel>UAN Number</FieldLabel><TextInput placeholder="UAN number" value={bank.uanNumber} numericOnly onChange={upb('uanNumber')} /></div>
            </div>
          </SectionCard>

          {/* ── Documents — dynamic, filtered by EMPLOYEE type ── */}
          <SectionCard title="Documents">
            {docLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <Loader2 size={16} className="animate-spin" color={PRIMARY} />
                Loading required documents…
              </div>
            ) : docTypes.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No documents required for this employment type.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {docTypes.map(dt => {
                  const errKey = `doc_${dt.docKey}`
                  const file   = documents[dt.docKey]
                  const reason = docReasons[dt.docKey] ?? ''
                  return (
                    <div key={dt.docKey} className="flex flex-col gap-1.5">
                      <FieldLabel required={dt.mandatory}>
                        {dt.name}
                        {dt.mandatory && <span className="ml-1.5 text-[10px] font-normal text-gray-400">(mandatory)</span>}
                      </FieldLabel>
                      <FileUpload
                        file={file}
                        accept=".pdf,.jpg,.jpeg,.png"
                        error={errors[errKey]}
                        onChange={f => {
                          setDocuments(d => ({ ...d, [dt.docKey]: f }))
                          // Clear reason when a file is uploaded
                          setDocReasons(d => ({ ...d, [dt.docKey]: '' }))
                          clearError(errKey)
                        }}
                      />
                      {/* Reason input (shown when no file, for non-mandatory or as alternative) */}
                      {!file && (
                        <input
                          type="text"
                          placeholder={`Reason if not available`}
                          value={reason}
                          onChange={e => {
                            setDocReasons(d => ({ ...d, [dt.docKey]: e.target.value }))
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

          {/* ── Actions ── */}
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
              {submitting ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : <Save size={15} />}
              Save Draft
            </button>

            <button type="button" onClick={handleSubmitClick} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#111827' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}>
              <UserPlus size={15} /> Submit Employee
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