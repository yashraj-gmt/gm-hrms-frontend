import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Clock, Info, Loader2 } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import shiftService from '@/services/shiftService'
 
const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'
const DAYS         = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
const DAY_LABELS   = { MONDAY:'Mon', TUESDAY:'Tue', WEDNESDAY:'Wed', THURSDAY:'Thu', FRIDAY:'Fri', SATURDAY:'Sat', SUNDAY:'Sun' }
// DayOfWeek enum used by backend
const DAY_OF_WEEK  = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
 
function Label({ children, hint }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-sm font-semibold text-gray-700">{children}</span>
      {hint && <Info size={12} color="#9CA3AF" />}
    </div>
  )
}
 
function TextInput({ placeholder, value, onChange, type = 'text' }) {
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={e => onChange?.(e.target.value)}
      className="w-full h-11 px-4 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl outline-none transition-colors placeholder:text-gray-400"
      onFocus={e => (e.target.style.borderColor = PRIMARY)}
      onBlur={e  => (e.target.style.borderColor = '#E5E7EB')} />
  )
}
 
function TimeInput({ value, onChange }) {
  return (
    <div className="relative">
      <input type="time" value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        className="w-full h-11 px-4 pr-10 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl outline-none transition-colors appearance-none"
        onFocus={e => (e.target.style.borderColor = PRIMARY)}
        onBlur={e  => (e.target.style.borderColor = '#E5E7EB')} />
      <Clock size={15} color="#9CA3AF" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}
 
function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange?.(!checked)}
        className="relative flex-shrink-0 rounded-full transition-colors duration-200"
        style={{ width: 40, height: 22, backgroundColor: checked ? '#22C55E' : '#D1D5DB' }}>
        <span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm transition-transform duration-200"
          style={{ width: 18, height: 18, transform: checked ? 'translateX(18px)' : 'translateX(0)' }} />
      </button>
      <div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {sublabel && <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  )
}
 
const defaultDayConfig = (day, idx) => ({
  dayOfWeek: day,
  startTime: '09:00',
  endTime: '18:00',
  checkinStartWindow: '08:30',
  checkinEndWindow: '09:30',
  checkoutStartWindow: '17:30',
  checkoutEndWindow: '18:30',
  isWeekOff: idx >= 5,
})
 
export default function ShiftForm() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = Boolean(id)
  const { toast } = useToast()
 
  const [mode,          setMode]          = useState('NORMAL')
  const [submitting,    setSubmitting]    = useState(false)
  const [loadingEdit,   setLoadingEdit]   = useState(isEdit)
 
  // Common fields
  const [shiftName,        setShiftName]        = useState('')
  const [graceMinutes,     setGraceMinutes]      = useState('10')
  const [lateMarkLimit,    setLateMarkLimit]     = useState('3')
  const [lateMarkAfter,    setLateMarkAfter]     = useState('15')
  const [minWorkHours,     setMinWorkHours]      = useState('8')
  const [overtimeAllowed,  setOvertimeAllowed]   = useState(true)
  const [autoCheckout,     setAutoCheckout]      = useState(true)
  const [overtimeAfterMin, setOvertimeAfterMin]  = useState('30')
 
  // Normal shift
  const [startTime,          setStartTime]          = useState('09:00')
  const [endTime,            setEndTime]            = useState('18:00')
  const [checkInStart,       setCheckInStart]       = useState('08:30')
  const [checkInEnd,         setCheckInEnd]         = useState('09:30')
  const [checkOutStart,      setCheckOutStart]      = useState('17:30')
  const [checkOutEnd,        setCheckOutEnd]        = useState('18:30')
  const [saturdayOff,        setSaturdayOff]        = useState(true)
  const [sundayOff,          setSundayOff]          = useState(true)
 
  // Custom shift
  const [days, setDays] = useState(DAY_OF_WEEK.map((d, i) => defaultDayConfig(d, i)))
 
  // Load existing shift for edit
  useEffect(() => {
    if (!isEdit) return
    shiftService.getById(id)
      .then(res => {
        const s = res.data
        setShiftName(s.shiftName ?? '')
        setMode(s.shiftType ?? 'NORMAL')
        setGraceMinutes(String(s.graceMinutes ?? 10))
        setLateMarkAfter(String(s.lateMarkAfterMinutes ?? 15))
        setLateMarkLimit(String(s.lateMarkLimit ?? 3))
        setMinWorkHours(String(s.minimumWorkHours ?? 8))
        setOvertimeAllowed(s.overtimeAllowed ?? true)
        setAutoCheckout(s.autoCheckout ?? true)
        setOvertimeAfterMin(String(s.overtimeAfterMinutes ?? 30))
 
        if (s.shiftType === 'NORMAL' && s.normalTiming) {
          const t = s.normalTiming
          setStartTime(t.startTime ?? '09:00')
          setEndTime(t.endTime ?? '18:00')
          setCheckInStart(t.checkinStartWindow ?? '08:30')
          setCheckInEnd(t.checkinEndWindow ?? '09:30')
          setCheckOutStart(t.checkoutStartWindow ?? '17:30')
          setCheckOutEnd(t.checkoutEndWindow ?? '18:30')
          setSaturdayOff(t.saturdayOff ?? true)
          setSundayOff(t.sundayOff ?? true)
        }
 
        if (s.shiftType === 'CUSTOM' && s.dayConfigs?.length) {
          setDays(DAY_OF_WEEK.map(day => {
            const found = s.dayConfigs.find(d => d.dayOfWeek === day)
            return found
              ? { ...found, dayOfWeek: day }
              : defaultDayConfig(day, DAY_OF_WEEK.indexOf(day))
          }))
        }
      })
      .catch(err => toast.error(err?.message || 'Failed to load shift', 'Error'))
      .finally(() => setLoadingEdit(false))
  }, [id, isEdit])
 
  const updateDay = (idx, key, val) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, [key]: val } : d))
  }
 
  const buildPayload = () => ({
    shiftName,
    shiftType: mode,
    graceMinutes: Number(graceMinutes) || 0,
    lateMarkAfterMinutes: Number(lateMarkAfter) || 0,
    lateMarkLimit: Number(lateMarkLimit) || 0,
    minimumWorkHours: Number(minWorkHours) || 0,
    overtimeAllowed,
    overtimeAfterMinutes: overtimeAllowed ? Number(overtimeAfterMin) || 0 : null,
    autoCheckout,
    normalTiming: mode === 'NORMAL' ? {
      startTime, endTime,
      checkinStartWindow: checkInStart,
      checkinEndWindow: checkInEnd,
      checkoutStartWindow: checkOutStart,
      checkoutEndWindow: checkOutEnd,
      saturdayOff, sundayOff,
    } : null,
    dayConfigs: mode === 'CUSTOM' ? days : null,
    breakIds: [],
  })
 
  const handleSubmit = async () => {
    if (!shiftName.trim()) {
      toast.warning('Please enter a shift name', 'Validation')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit) {
        await shiftService.update(id, buildPayload())
        toast.success('Shift updated successfully', 'Shift Updated')
      } else {
        await shiftService.create(buildPayload())
        toast.success('Shift created successfully', 'Shift Created')
      }
      navigate('/shifts')
    } catch (err) {
      toast.error(err?.message || 'Something went wrong', 'Error')
    } finally {
      setSubmitting(false)
    }
  }
 
  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 size={28} color={PRIMARY} className="animate-spin" />
      </div>
    )
  }
 
  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">{isEdit ? 'Edit Shift' : 'New Shift'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{isEdit ? 'Update shift configuration' : 'Create a new shift'}</p>
        </div>
        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
          {['NORMAL','CUSTOM'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ backgroundColor: mode === m ? (m === 'NORMAL' ? PRIMARY : '#111827') : 'transparent', color: mode === m ? '#fff' : '#6B7280' }}>
              {m.charAt(0) + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
 
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="max-w-md">
          <Label>Shift Name <span style={{ color: PRIMARY }}>*</span></Label>
          <TextInput placeholder="e.g. Morning Shift" value={shiftName} onChange={setShiftName} />
        </div>
 
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
          <div><Label hint>Grace Minutes</Label><TextInput placeholder="10" value={graceMinutes} onChange={setGraceMinutes} type="number" /></div>
          <div><Label>Late Mark After (min)</Label><TextInput placeholder="15" value={lateMarkAfter} onChange={setLateMarkAfter} type="number" /></div>
          <div><Label>Late Mark Limit</Label><TextInput placeholder="3" value={lateMarkLimit} onChange={setLateMarkLimit} type="number" /></div>
        </div>
 
        <div className="max-w-xs">
          <Label>Minimum Work Hours</Label>
          <TextInput placeholder="8" value={minWorkHours} onChange={setMinWorkHours} type="number" />
        </div>
 
        <div className="flex items-center gap-10 flex-wrap">
          <Toggle checked={overtimeAllowed} onChange={setOvertimeAllowed} label="Overtime Allowed" sublabel="Allow extra hours beyond shift end" />
          <Toggle checked={autoCheckout} onChange={setAutoCheckout} label="Auto Checkout" sublabel="Auto mark checkout at shift end" />
        </div>
 
        {overtimeAllowed && (
          <div className="max-w-sm">
            <Label>Overtime After (minutes)</Label>
            <TextInput placeholder="30" value={overtimeAfterMin} onChange={setOvertimeAfterMin} type="number" />
          </div>
        )}
 
        <div className="h-px bg-gray-100" />
 
        {/* NORMAL MODE */}
        {mode === 'NORMAL' && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Shift Timing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div><Label>Start Time</Label><TimeInput value={startTime} onChange={setStartTime} /></div>
              <div><Label>End Time</Label><TimeInput value={endTime} onChange={setEndTime} /></div>
            </div>
            <div>
              <Label hint>Check-in Window</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div><p className="text-xs text-gray-500 mb-1.5">Earliest</p><TimeInput value={checkInStart} onChange={setCheckInStart} /></div>
                <div><p className="text-xs text-gray-500 mb-1.5">Latest</p><TimeInput value={checkInEnd} onChange={setCheckInEnd} /></div>
              </div>
            </div>
            <div>
              <Label hint>Check-out Window</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div><p className="text-xs text-gray-500 mb-1.5">Earliest</p><TimeInput value={checkOutStart} onChange={setCheckOutStart} /></div>
                <div><p className="text-xs text-gray-500 mb-1.5">Latest</p><TimeInput value={checkOutEnd} onChange={setCheckOutEnd} /></div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3">Weekly Off</h3>
              <div className="flex items-center gap-8 flex-wrap">
                <Toggle checked={saturdayOff} onChange={setSaturdayOff} label="Saturday Off" />
                <Toggle checked={sundayOff} onChange={setSundayOff} label="Sunday Off" />
              </div>
            </div>
          </div>
        )}
 
        {/* CUSTOM MODE */}
        {mode === 'CUSTOM' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900">Day-wise Schedule</h2>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-9 bg-gray-900 text-white">
                {['Day','Start','End','Check-in From','Check-in To','Check-out From','Check-out To','Week Off'].map((h, i) => (
                  <div key={h} className={`px-3 py-3 text-[11px] font-semibold ${i === 0 ? 'col-span-1' : 'col-span-1'}`}>{h}</div>
                ))}
              </div>
              <table className="w-full">
                <tbody>
                  {days.map((d, idx) => (
                    <tr key={d.dayOfWeek} className="border-b border-gray-100 last:border-0"
                      style={{ backgroundColor: d.isWeekOff ? '#F9FAFB' : '#fff' }}>
                      <td className="px-4 py-3 text-sm font-semibold w-24"
                        style={{ color: d.isWeekOff ? '#9CA3AF' : '#111827' }}>
                        {DAY_LABELS[d.dayOfWeek]}
                      </td>
                      {['startTime','endTime','checkinStartWindow','checkinEndWindow','checkoutStartWindow','checkoutEndWindow'].map(field => (
                        <td key={field} className="px-2 py-2">
                          {d.isWeekOff
                            ? <div className="h-11 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-400">—</div>
                            : <TimeInput value={d[field]} onChange={v => updateDay(idx, field, v)} />
                          }
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={d.isWeekOff}
                          onChange={e => updateDay(idx, 'isWeekOff', e.target.checked)}
                          className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: PRIMARY }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
 
      <div className="flex items-center justify-end gap-3 mt-6 pb-6">
        <button onClick={() => navigate('/shifts')}
          className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={submitting}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = PRIMARY_DARK }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Update Shift' : 'Create Shift'}
        </button>
      </div>
    </>
  )
}