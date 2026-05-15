// src/pages/leave/employee/tabs/ApplyLeaveTab.jsx
import { useState, useMemo } from 'react'
import {
  Calendar, ChevronDown, Upload, X, Search,
  AlertCircle, CheckCircle2, Info,
} from 'lucide-react'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'

const DAY_TYPES = [
  { value: 'FULL',        label: 'Full Day'    },
  { value: 'FIRST_HALF',  label: 'First Half'  },
  { value: 'SECOND_HALF', label: 'Second Half' },
]

const NOTIFY_EMPLOYEES = [
  { id: 1, name: 'Jaxson Workman',  designation: 'Front-End Developer' },
  { id: 2, name: 'Gretchen Gouse',  designation: 'HR Manager' },
  { id: 3, name: 'Maria Stanton',   designation: 'HR Lead' },
]

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {children}{required && <span style={{ color: PRIMARY }}> *</span>}
    </label>
  )
}

function InputField({ label, required, error, children }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] mt-1" style={{ color: '#DC2626' }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

function RadioRow({ label, options, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-4 flex-wrap">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => onChange(opt.value)}
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
              style={{
                borderColor:     value === opt.value ? PRIMARY : '#D1D5DB',
                backgroundColor: value === opt.value ? PRIMARY : 'transparent',
              }}>
              {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm text-gray-600">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// Leave type card skeleton
function TypeCardSkeleton() {
  return (
    <div className="rounded-xl border-2 border-gray-100 p-3 space-y-2 animate-pulse">
      <div className="h-4 w-8 bg-gray-200 rounded" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  )
}

export default function ApplyLeaveTab({
  leaveTypes, balances, leaveTypesLoading, onApply,
}) {
  const [form, setForm] = useState({
    leaveTypeId:  null,
    startDate:    '',
    endDate:      '',
    startDayType: 'FULL',
    endDayType:   'FULL',
    reason:       '',
    notifyIds:    [],
    attachment:   null,
  })

  const [errors,       setErrors]       = useState({})
  const [notifySearch, setNotifySearch] = useState('')
  const [notifyOpen,   setNotifyOpen]   = useState(false)
  const [submitting,   setSubmitting]   = useState(false)

  const set = (key) => (val) => {
    setForm((p) => ({ ...p, [key]: val }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  // Enrich leave types with balance info
  const enrichedTypes = useMemo(() => {
    return leaveTypes.map((t) => {
      const bal = balances.find((b) => b.leaveTypeId === t.id)
      return {
        ...t,
        balance:   bal?.remainingLeaves ?? 0,
        totalAllocated: bal?.totalLeaves ?? 0,
      }
    })
  }, [leaveTypes, balances])

  const selectedType = enrichedTypes.find((t) => t.id === form.leaveTypeId)

  // Calculate working days
  const workingDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return null
    const start = new Date(form.startDate)
    const end   = new Date(form.endDate)
    if (end < start) return null
    let days = 0
    const cur = new Date(start)
    while (cur <= end) {
      const dow = cur.getDay()
      if (dow !== 0 && dow !== 6) days++
      cur.setDate(cur.getDate() + 1)
    }
    if (form.startDayType !== 'FULL') days -= 0.5
    if (form.endDayType !== 'FULL' && form.startDate !== form.endDate) days -= 0.5
    return Math.max(0.5, days)
  }, [form.startDate, form.endDate, form.startDayType, form.endDayType])

  const validate = () => {
    const e = {}
    if (!form.leaveTypeId)   e.leaveTypeId = 'Please select a leave type'
    if (!form.startDate)     e.startDate   = 'Start date is required'
    if (!form.endDate)       e.endDate     = 'End date is required'
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate))
      e.endDate = 'End date cannot be before start date'
    if (!form.reason.trim()) e.reason = 'Please provide a reason'
    if (form.reason.trim().length < 10) e.reason = 'Reason must be at least 10 characters'

    if (selectedType && workingDays !== null
        && !selectedType.isCompOff && selectedType.isPaid
        && selectedType.balance < workingDays) {
      e.leaveTypeId = `Insufficient balance. Available: ${selectedType.balance} day(s)`
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const result = await onApply({ ...form })
    setSubmitting(false)
    if (result?.success) {
      setForm({
        leaveTypeId: null, startDate: '', endDate: '',
        startDayType: 'FULL', endDayType: 'FULL',
        reason: '', notifyIds: [], attachment: null,
      })
      setErrors({})
    }
  }

  const filteredNotify = NOTIFY_EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(notifySearch.toLowerCase()))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100"
          style={{ background: `linear-gradient(135deg, ${PRIMARY}08, #fff 60%)` }}>
          <h2 className="text-base font-bold text-gray-900">Leave Request</h2>
          <p className="text-xs text-gray-500 mt-0.5">Fill in the details to submit your leave application</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Leave Type Grid */}
          <InputField label="Leave Type" required error={errors.leaveTypeId}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {leaveTypesLoading
                ? [...Array(6)].map((_, i) => <TypeCardSkeleton key={i} />)
                : enrichedTypes.map((t) => {
                    const active = form.leaveTypeId === t.id
                    const isUnlimited = !t.isPaid || t.isCompOff
                    return (
                      <button key={t.id} type="button"
                        onClick={() => { set('leaveTypeId')(t.id); setErrors((e) => ({ ...e, leaveTypeId: '' })) }}
                        className="relative flex flex-col items-start gap-0.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all"
                        style={{
                          borderColor:     active ? PRIMARY : '#E5E7EB',
                          backgroundColor: active ? PRIMARY + '0D' : '#FAFAFA',
                        }}>
                        {active && (
                          <div className="absolute top-2 left-2">
                            <CheckCircle2 size={12} color={PRIMARY} />
                          </div>
                        )}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-3"
                          style={{ backgroundColor: active ? PRIMARY : '#E5E7EB', color: active ? '#fff' : '#6B7280' }}>
                          {t.code}
                        </span>
                        <span className="text-[12px] font-semibold mt-0.5"
                          style={{ color: active ? PRIMARY : '#374151' }}>
                          {t.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {isUnlimited ? 'Unlimited' : `${t.balance} day(s) left`}
                        </span>
                        <span className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: t.isPaid ? '#DCFCE7' : '#FEE2E2',
                            color:           t.isPaid ? '#15803D' : '#DC2626',
                          }}>
                          {t.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </button>
                    )
                  })
              }
            </div>
            {selectedType && !selectedType.allowDuringProbation && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg border"
                style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
                <AlertCircle size={13} color="#854D0E" />
                <span className="text-[11px] text-yellow-800 font-medium">
                  This leave may not be available during probation.
                </span>
              </div>
            )}
          </InputField>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Start Date" required error={errors.startDate}>
              <div className="relative">
                <input type="date" value={form.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => set('startDate')(e.target.value)}
                  className="w-full h-11 px-3 pr-9 text-sm border rounded-xl outline-none bg-gray-50"
                  style={{ borderColor: errors.startDate ? '#DC2626' : '#E5E7EB' }}
                  onFocus={(e) => { if (!errors.startDate) e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { if (!errors.startDate) e.target.style.borderColor = '#E5E7EB' }} />
                <Calendar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </InputField>
            <InputField label="End Date" required error={errors.endDate}>
              <div className="relative">
                <input type="date" value={form.endDate}
                  min={form.startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => set('endDate')(e.target.value)}
                  className="w-full h-11 px-3 pr-9 text-sm border rounded-xl outline-none bg-gray-50"
                  style={{ borderColor: errors.endDate ? '#DC2626' : '#E5E7EB' }}
                  onFocus={(e) => { if (!errors.endDate) e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { if (!errors.endDate) e.target.style.borderColor = '#E5E7EB' }} />
                <Calendar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </InputField>
          </div>

          {/* Day types */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RadioRow label="Start Day Type" options={DAY_TYPES} value={form.startDayType} onChange={set('startDayType')} />
            <RadioRow label="End Day Type"   options={DAY_TYPES} value={form.endDayType}   onChange={set('endDayType')} />
          </div>

          {/* Duration summary */}
          {workingDays !== null && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ borderColor: PRIMARY + '40', backgroundColor: PRIMARY + '08' }}>
              <Info size={16} color={PRIMARY} className="flex-shrink-0" />
              <div>
                <span className="text-sm font-bold" style={{ color: PRIMARY }}>
                  {workingDays} working day{workingDays !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {form.startDate} → {form.endDate}
                </span>
              </div>
              {selectedType && !selectedType.isCompOff && selectedType.isPaid && (
                <span className="ml-auto text-xs text-gray-500">
                  Balance after:{' '}
                  <span className="font-bold"
                    style={{ color: (selectedType.balance - workingDays) >= 0 ? '#16A34A' : '#DC2626' }}>
                    {Math.max(0, selectedType.balance - workingDays)}d
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Reason */}
          <InputField label="Reason" required error={errors.reason}>
            <textarea value={form.reason}
              onChange={(e) => set('reason')(e.target.value)}
              placeholder="Briefly describe the reason…"
              rows={4} maxLength={500}
              className="w-full px-3 py-2.5 text-sm border rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300"
              style={{ borderColor: errors.reason ? '#DC2626' : '#E5E7EB' }}
              onFocus={(e) => { if (!errors.reason) e.target.style.borderColor = PRIMARY }}
              onBlur={(e)  => { if (!errors.reason) e.target.style.borderColor = '#E5E7EB' }} />
            <p className="text-[11px] text-gray-400 text-right mt-1">{form.reason.length}/500</p>
          </InputField>

          {/* Notify Employees */}
          <div>
            <Label>Notify Employee</Label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap px-3 py-2 min-h-[44px] bg-gray-50">
                {form.notifyIds.map((id) => {
                  const emp = NOTIFY_EMPLOYEES.find((e) => e.id === id)
                  if (!emp) return null
                  return (
                    <span key={id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200">
                      {emp.name}
                      <button onClick={() => set('notifyIds')(form.notifyIds.filter((n) => n !== id))}
                        className="hover:text-red-500 transition-colors"><X size={11} /></button>
                    </span>
                  )
                })}
                <button onClick={() => setNotifyOpen(!notifyOpen)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto">
                  <ChevronDown size={14} className={`transition-transform ${notifyOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {notifyOpen && (
                <div className="border-t border-gray-200">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <label className="flex items-center gap-2">
                      <Search size={13} color="#9CA3AF" />
                      <input value={notifySearch} onChange={(e) => setNotifySearch(e.target.value)}
                        placeholder="Search employees…"
                        className="flex-1 border-none outline-none text-[12px] bg-transparent" />
                    </label>
                  </div>
                  {filteredNotify.map((emp) => (
                    <label key={emp.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox"
                        checked={form.notifyIds.includes(emp.id)}
                        onChange={() => set('notifyIds')(
                          form.notifyIds.includes(emp.id)
                            ? form.notifyIds.filter((id) => id !== emp.id)
                            : [...form.notifyIds, emp.id]
                        )}
                        className="w-4 h-4 rounded" style={{ accentColor: PRIMARY }} />
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: PRIMARY }}>{emp.name[0]}</div>
                      <div>
                        <p className="text-[12px] font-semibold text-gray-800">{emp.name}</p>
                        <p className="text-[10px] text-gray-400">{emp.designation}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attachment */}
          <div>
            <Label>Attachment</Label>
            <label
              className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all"
              style={{ borderColor: form.attachment ? PRIMARY : '#D1D5DB', backgroundColor: form.attachment ? PRIMARY + '08' : '#FAFAFA' }}>
              <Upload size={16} color={form.attachment ? PRIMARY : '#9CA3AF'} />
              <div>
                <p className="text-sm font-medium" style={{ color: form.attachment ? PRIMARY : '#374151' }}>
                  {form.attachment ? form.attachment.name : 'Choose File'}
                </p>
                {!form.attachment && <p className="text-[11px] text-gray-400">PDF, JPG, PNG up to 5 MB</p>}
              </div>
              {form.attachment && (
                <button type="button"
                  onClick={(e) => { e.preventDefault(); set('attachment')(null) }}
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              )}
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && f.size <= 5 * 1024 * 1024) set('attachment')(f)
                }} />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap"
          style={{ backgroundColor: '#FAFAFA' }}>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Info size={12} />
            Approval takes 1–2 working days. A confirmation email will be sent.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setForm({ leaveTypeId: null, startDate: '', endDate: '', startDayType: 'FULL',
                          endDayType: 'FULL', reason: '', notifyIds: [], attachment: null })
                setErrors({})
              }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Clear
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}>
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
                : 'Submit Application'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}