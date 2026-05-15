// src/pages/employee/AddIntern.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PRIMARY = '#C35E33'

const EMPLOYMENT_TYPE_ROUTES = {
  Internship: '/employees/add-intern',
  Training:   '/employees/add-trainee',
  Employee:   '/employees/add',
}

// ─── Shared primitives ─────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>
  )
}

function TextInput({ placeholder, type = 'text', value, onChange, className = '' }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C35E33] focus:bg-white transition-colors placeholder:text-gray-400 ${className}`}
    />
  )
}

function TextArea({ placeholder, value, onChange, rows = 3 }) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C35E33] focus:bg-white transition-colors placeholder:text-gray-400 resize-none"
    />
  )
}

function SelectInput({ children, value, onChange }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C35E33] focus:bg-white transition-colors appearance-none cursor-pointer"
    >
      {children}
    </select>
  )
}

function PhoneInput({ placeholder, value, onChange }) {
  return (
    <div className="flex h-9">
      <span className="flex items-center px-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-xs text-gray-500 whitespace-nowrap">
        + 91
      </span>
      <input
        type="tel"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 min-w-0 px-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-r-lg outline-none focus:border-[#C35E33] transition-colors placeholder:text-gray-400"
      />
    </div>
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

function FileUpload() {
  return (
    <div className="flex items-center h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
      <span className="text-sm text-gray-400 flex-1">Choose File</span>
      <button
        type="button"
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: PRIMARY }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </button>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border-2 p-5" style={{ borderColor: '#E8C5A8' }}>
      <h2 className="text-sm font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AddIntern() {
  const navigate = useNavigate()

  // Personal Info
  const [personal, setPersonal] = useState({
    firstName: '', middleName: '', lastName: '', gender: '',
    dob: '', personalPhone: '', emergencyPhone: '', personalEmail: '',
    maritalStatus: '', spouseName: '',
  })

  // College Info
  const [college, setCollege] = useState({
    courseName: '', semester: '', academicYear: '',
    enrollmentNumber: '1054258962', collegeName: '',
    collegeAddress: '',
    universityName: '', degreeStatus: '', year: '2024',
  })

  // Internship Details
  const [internship, setInternship] = useState({
    courseDomain: '', workLocation: 'Ahmedabad', internshipPeriod: '',
    stipend: '', designation: '', department: '', shiftTiming: '',
    internshipType: 'Paid',
    internshipMode: 'Remote',
    startDate: '', endDate: '',
  })

  // Bank & Legal
  const [bank, setBank] = useState({
    bankName: 'HPbank.pvt.ltd', accountNumber: '', ifscCode: 'Demo',
    panNumber: 'Demo', aadhaarNumber: '585885214585', esicNumber: '',
    pfNumber: '585885214585', uanNumber: '1245889585',
  })

  // Address
  const [address, setAddress] = useState({
    currentAddress: 'Demo', city: 'Demo', district: 'Demo', landmark: 'Demo',
    state: '854256', pinCode: 'Demo', country: 'Demo',
    sameAsCurrent: true,
    permAddress: 'Demo', permCity: 'Demo', permDistrict: 'Demo', permLandmark: 'Demo',
    permState: '854256', permPinCode: 'Demo', permCountry: 'Demo',
  })

  // Mentor & Supervisor
  const [mentor, setMentor] = useState({
    mentorId: '', mentorName: '',
    supervisorId: '', supervisorName: '', supervisorDesignation: '',
  })

  const up = (setter) => (field) => (e) =>
    setter((prev) => ({ ...prev, [field]: e.target.value }))

  const upPersonal = up(setPersonal)
  const upCollege  = up(setCollege)
  const upIntern   = up(setInternship)
  const upBank     = up(setBank)
  const upAddress  = up(setAddress)
  const upMentor   = up(setMentor)

  return (
    <div className="min-h-full pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <h1 className="text-xl font-bold text-gray-900">Add Intern</h1>
      {/* Employment Type */}
<div className="flex flex-col items-end gap-1.5">
  <span className="text-xs font-semibold text-gray-700">Employment Type</span>
  <div className="flex items-center gap-4">
    {['Internship', 'Training', 'Employee'].map((type) => (
      <RadioOption
        key={type}
        name="employmentType"
        value={type}
        checked={type === 'Internship'}
        onChange={() => navigate(EMPLOYMENT_TYPE_ROUTES[type])}
        label={type}
      />
    ))}
  </div>
</div>
      </div>

      <div className="flex flex-col gap-5">

        {/* ── Personal Information ───────────────────────────── */}
        <SectionCard title="Personal Information">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><FieldLabel>First Name</FieldLabel><TextInput placeholder="Enter your First Name" value={personal.firstName} onChange={upPersonal('firstName')} /></div>
            <div><FieldLabel>Middle Name</FieldLabel><TextInput placeholder="Enter your Middle Name" value={personal.middleName} onChange={upPersonal('middleName')} /></div>
            <div><FieldLabel>Last Name</FieldLabel><TextInput placeholder="Enter your Last Name" value={personal.lastName} onChange={upPersonal('lastName')} /></div>
            <div>
              <FieldLabel>Gender</FieldLabel>
              <SelectInput value={personal.gender} onChange={upPersonal('gender')}>
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </SelectInput>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><FieldLabel>Date of Birth</FieldLabel><TextInput type="date" placeholder="DD-MM-YYYY" value={personal.dob} onChange={upPersonal('dob')} /></div>
            <div><FieldLabel>Personal Phone Number</FieldLabel><PhoneInput placeholder="8547526584" value={personal.personalPhone} onChange={upPersonal('personalPhone')} /></div>
            <div><FieldLabel>Emergency phone number</FieldLabel><PhoneInput placeholder="8547526584" value={personal.emergencyPhone} onChange={upPersonal('emergencyPhone')} /></div>
            <div><FieldLabel>Personal Email</FieldLabel><TextInput type="email" placeholder="Demo@gmail.com" value={personal.personalEmail} onChange={upPersonal('personalEmail')} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <FieldLabel>Marital Status</FieldLabel>
              <SelectInput value={personal.maritalStatus} onChange={upPersonal('maritalStatus')}>
                <option value="">Status</option>
                <option>Single</option><option>Married</option><option>Divorced</option>
              </SelectInput>
            </div>
            <div><FieldLabel>Spouse Name OR Parents Name</FieldLabel><TextInput placeholder="Name" value={personal.spouseName} onChange={upPersonal('spouseName')} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><FieldLabel>Upload photo</FieldLabel><FileUpload /></div>
          </div>
        </SectionCard>

        {/* ── College Information ────────────────────────────── */}
        <SectionCard title="Collage Information">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-1"><FieldLabel>Current Course Name</FieldLabel><TextInput placeholder="Course Name" value={college.courseName} onChange={upCollege('courseName')} /></div>
            <div><FieldLabel>Semester</FieldLabel><TextInput placeholder="Sem-1*" value={college.semester} onChange={upCollege('semester')} /></div>
            <div><FieldLabel>Academic Year</FieldLabel><TextInput placeholder="Eg:- 2020-25" value={college.academicYear} onChange={upCollege('academicYear')} /></div>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><FieldLabel>Enrollment Number</FieldLabel><TextInput placeholder="1054258962" value={college.enrollmentNumber} onChange={upCollege('enrollmentNumber')} /></div>
            <div><FieldLabel>College Name</FieldLabel><TextInput placeholder="Name" value={college.collegeName} onChange={upCollege('collegeName')} /></div>
          </div>
          {/* College Address */}
          <div className="mb-3">
            <FieldLabel>College Address</FieldLabel>
            <TextArea placeholder="Address" value={college.collegeAddress} onChange={upCollege('collegeAddress')} rows={3} />
          </div>
          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><FieldLabel>University Name</FieldLabel><TextInput placeholder="Name" value={college.universityName} onChange={upCollege('universityName')} /></div>
            <div>
              <FieldLabel>Degree Completion Status</FieldLabel>
              <SelectInput value={college.degreeStatus} onChange={upCollege('degreeStatus')}>
                <option value="">Month</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m}>{m}</option>)}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Year</FieldLabel>
              <SelectInput value={college.year} onChange={upCollege('year')}>
                {['2020','2021','2022','2023','2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
              </SelectInput>
            </div>
          </div>
        </SectionCard>

        {/* ── Internship Details ────────────────────────────── */}
        <SectionCard title="Internship Details">
          {/* Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><FieldLabel>Internship Course / Domain</FieldLabel><TextInput placeholder="Name" value={internship.courseDomain} onChange={upIntern('courseDomain')} /></div>
            <div><FieldLabel>Work Location / Branch</FieldLabel><TextInput placeholder="Ahmedabad" value={internship.workLocation} onChange={upIntern('workLocation')} /></div>
            <div>
              <FieldLabel>Internship Period</FieldLabel>
              <SelectInput value={internship.internshipPeriod} onChange={upIntern('internshipPeriod')}>
                <option value="">Select Period</option>
                <option>1 month</option><option>2 months</option><option>3 months</option>
                <option>6 months</option><option>1 year</option>
              </SelectInput>
            </div>
            <div><FieldLabel>Stipend</FieldLabel><TextInput type="password" placeholder="$•••••" value={internship.stipend} onChange={upIntern('stipend')} /></div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div><FieldLabel>Designation</FieldLabel><TextInput placeholder="Type" value={internship.designation} onChange={upIntern('designation')} /></div>
            <div><FieldLabel>Department</FieldLabel><TextInput placeholder="Type" value={internship.department} onChange={upIntern('department')} /></div>
            <div>
              <FieldLabel>Internship Shift Timing</FieldLabel>
              <SelectInput value={internship.shiftTiming} onChange={upIntern('shiftTiming')}>
                <option value="">Select •</option>
                <option>Morning</option><option>Afternoon</option><option>Evening</option><option>Night</option>
              </SelectInput>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Internship Type */}
            <div>
              <FieldLabel>Internship Type</FieldLabel>
              <div className="flex items-center gap-4 mt-1">
                {['Paid', 'Unpaid'].map((t) => (
                  <RadioOption key={t} name="internType" value={t} checked={internship.internshipType === t} onChange={upIntern('internshipType')} label={t} />
                ))}
              </div>
            </div>
            {/* Internship Mode */}
            <div>
              <FieldLabel>Internship Mode</FieldLabel>
              <div className="flex items-center gap-3 mt-1">
                {['Remote', 'Hybrid', 'On site'].map((m) => (
                  <RadioOption key={m} name="internMode" value={m} checked={internship.internshipMode === m} onChange={upIntern('internshipMode')} label={m} />
                ))}
              </div>
            </div>
            <div><FieldLabel>Internship Start Date</FieldLabel><TextInput type="date" placeholder="DD-MM-YYYY" value={internship.startDate} onChange={upIntern('startDate')} /></div>
            <div><FieldLabel>Internship End Date</FieldLabel><TextInput type="date" placeholder="DD-MM-YYYY" value={internship.endDate} onChange={upIntern('endDate')} /></div>
          </div>
        </SectionCard>

        {/* ── Bank & Legal Details */}
        <SectionCard title="Bank & Legal Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div><FieldLabel>Bank Name</FieldLabel><TextInput placeholder="HPbank.pvt.ltd" value={bank.bankName} onChange={upBank('bankName')} /></div>
            <div><FieldLabel>Account Number</FieldLabel><TextInput type="password" placeholder="••••••••" value={bank.accountNumber} onChange={upBank('accountNumber')} /></div>
            <div><FieldLabel>IFSC Code</FieldLabel><TextInput placeholder="Demo" value={bank.ifscCode} onChange={upBank('ifscCode')} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div><FieldLabel>PAN Number</FieldLabel><TextInput placeholder="Demo" value={bank.panNumber} onChange={upBank('panNumber')} /></div>
            <div><FieldLabel>Aadhaar Card Number</FieldLabel><TextInput placeholder="585885214585" value={bank.aadhaarNumber} onChange={upBank('aadhaarNumber')} /></div>
            <div><FieldLabel>ESIC Number</FieldLabel><TextInput type="password" placeholder="••••••••••" value={bank.esicNumber} onChange={upBank('esicNumber')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>PF Number</FieldLabel><TextInput placeholder="585885214585" value={bank.pfNumber} onChange={upBank('pfNumber')} /></div>
            <div><FieldLabel>UAN Number</FieldLabel><TextInput placeholder="1245889585" value={bank.uanNumber} onChange={upBank('uanNumber')} /></div>
          </div>
        </SectionCard>

        {/* ── Address Details  */}
        <SectionCard title="Address Details">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><FieldLabel>Current Address</FieldLabel><TextInput placeholder="Demo" value={address.currentAddress} onChange={upAddress('currentAddress')} /></div>
            <div><FieldLabel>City</FieldLabel><TextInput placeholder="Demo" value={address.city} onChange={upAddress('city')} /></div>
            <div><FieldLabel>District</FieldLabel><TextInput placeholder="Demo" value={address.district} onChange={upAddress('district')} /></div>
            <div><FieldLabel>Landmark</FieldLabel><TextInput placeholder="Demo" value={address.landmark} onChange={upAddress('landmark')} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><FieldLabel>State</FieldLabel><TextInput placeholder="854256" value={address.state} onChange={upAddress('state')} /></div>
            <div><FieldLabel>PIN Code</FieldLabel><TextInput placeholder="Demo" value={address.pinCode} onChange={upAddress('pinCode')} /></div>
            <div><FieldLabel>Country</FieldLabel><TextInput placeholder="Demo" value={address.country} onChange={upAddress('country')} /></div>
          </div>
        </SectionCard>

        {/* ── Permanent Address (same-as checkbox) ─────────── */}
        <div className="rounded-xl border-2 p-5" style={{ borderColor: PRIMARY }}>
          <label className="flex items-start gap-2.5 cursor-pointer mb-4">
            <div
              className="w-4 h-4 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 mt-0.5"
              style={{ backgroundColor: address.sameAsCurrent ? PRIMARY : 'white', borderColor: address.sameAsCurrent ? PRIMARY : '#D1D5DB' }}
              onClick={() => setAddress(p => ({ ...p, sameAsCurrent: !p.sameAsCurrent }))}
            >
              {address.sameAsCurrent && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-xs text-gray-600 leading-relaxed">
              If the current address and permanent address are the same, then check the check mark, as the permanent address is the same as the current address.
            </span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><FieldLabel>Permanent Address</FieldLabel><TextInput placeholder="Demo" value={address.sameAsCurrent ? address.currentAddress : address.permAddress} onChange={upAddress('permAddress')} /></div>
            <div><FieldLabel>City</FieldLabel><TextInput placeholder="Demo" value={address.sameAsCurrent ? address.city : address.permCity} onChange={upAddress('permCity')} /></div>
            <div><FieldLabel>District</FieldLabel><TextInput placeholder="Demo" value={address.sameAsCurrent ? address.district : address.permDistrict} onChange={upAddress('permDistrict')} /></div>
            <div><FieldLabel>Landmark</FieldLabel><TextInput placeholder="Demo" value={address.sameAsCurrent ? address.landmark : address.permLandmark} onChange={upAddress('permLandmark')} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><FieldLabel>State</FieldLabel><TextInput placeholder="854256" value={address.sameAsCurrent ? address.state : address.permState} onChange={upAddress('permState')} /></div>
            <div><FieldLabel>PIN Code</FieldLabel><TextInput placeholder="Demo" value={address.sameAsCurrent ? address.pinCode : address.permPinCode} onChange={upAddress('permPinCode')} /></div>
            <div><FieldLabel>Country</FieldLabel><TextInput placeholder="Demo" value={address.sameAsCurrent ? address.country : address.permCountry} onChange={upAddress('permCountry')} /></div>
          </div>
        </div>

        {/* ── Mentor & Supervisor Details  */}
        <SectionCard title="Mentor & Supervisor Details">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><FieldLabel>Mentor ID</FieldLabel><TextInput placeholder="Name" value={mentor.mentorId} onChange={upMentor('mentorId')} /></div>
            <div><FieldLabel>Mentor Name</FieldLabel><TextInput placeholder="Name" value={mentor.mentorName} onChange={upMentor('mentorName')} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><FieldLabel>Supervisor ID</FieldLabel><TextInput placeholder="Name" value={mentor.supervisorId} onChange={upMentor('supervisorId')} /></div>
            <div><FieldLabel>Supervisor Name</FieldLabel><TextInput placeholder="Name" value={mentor.supervisorName} onChange={upMentor('supervisorName')} /></div>
            <div><FieldLabel>Supervisor Designation</FieldLabel><TextInput placeholder="Role" value={mentor.supervisorDesignation} onChange={upMentor('supervisorDesignation')} /></div>
          </div>
        </SectionCard>

        {/* ── Document Uploads */}
        <SectionCard title="Document Uploads">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Aadhar Card</FieldLabel><FileUpload /></div>
            <div><FieldLabel>College ID <span className="text-gray-400 font-normal">(Provide by College)</span></FieldLabel><FileUpload /></div>
            <div><FieldLabel>Address Proof</FieldLabel><FileUpload /></div>
            <div><FieldLabel>College Internship Letter</FieldLabel><FileUpload /></div>
            <div><FieldLabel>Intern Joining Documentation</FieldLabel><FileUpload /></div>
            <div><FieldLabel>Intern Relieving Documentation</FieldLabel><FileUpload /></div>
            <div><FieldLabel>Feedback Document for GM Technosys</FieldLabel><FileUpload /></div>
          </div>
        </SectionCard>

        {/* ── Action Buttons ────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/employee')}
            className="px-6 py-2.5 text-sm font-medium rounded-lg border transition-colors"
            style={{ color: PRIMARY, borderColor: PRIMARY, background: 'white' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(195,94,51,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
          >
            Save as a Draft
          </button>
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            Save & Send Email
          </button>
        </div>

      </div>
    </div>
  )
}