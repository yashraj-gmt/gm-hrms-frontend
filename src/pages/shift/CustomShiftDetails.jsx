import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, RotateCcw, Loader2 } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import shiftService from '@/services/shiftService'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'

const ALL_DAYS = [
  { key: 'MON', label: 'Mon', backendKey: 'MONDAY'    },
  { key: 'TUE', label: 'Tue', backendKey: 'TUESDAY'   },
  { key: 'WED', label: 'Wed', backendKey: 'WEDNESDAY' },
  { key: 'THU', label: 'Thu', backendKey: 'THURSDAY'  },
  { key: 'FRI', label: 'Fri', backendKey: 'FRIDAY'    },
  { key: 'SAT', label: 'Sat', backendKey: 'SATURDAY'  },
  { key: 'SUN', label: 'Sun', backendKey: 'SUNDAY'    },
]

const defaultDay = (weekOff = false) => ({
  startTime:         '09:00',
  endTime:           '18:00',
  checkInEarliest:   '08:30',
  checkInLatest:     '09:30',
  checkOutEarliest:  '17:30',
  checkOutLatest:    '18:30',
  weekOff,
})

const defaultSchedule = {
  MON: defaultDay(false),
  TUE: defaultDay(false),
  WED: defaultDay(false),
  THU: defaultDay(false),
  FRI: defaultDay(false),
  SAT: defaultDay(true),
  SUN: defaultDay(true),
}

function TimeInput({ value, onChange, disabled }) {
  return (
    <div className="relative">
      <input
        type="time"
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full h-10 px-3 pr-9 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400"
        onFocus={e => !disabled && (e.target.style.borderColor = PRIMARY)}
        onBlur={e  => (e.target.style.borderColor = '#E5E7EB')}
      />
      <Clock size={13} color="#9CA3AF"
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </p>
  )
}

export default function CustomShiftDetails() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const { toast } = useToast()

  const [selectedDay, setSelectedDay] = useState('MON')
  const [schedule,    setSchedule]    = useState(defaultSchedule)
  const [shiftName,   setShiftName]   = useState('Custom Shift')
  const [loading,     setLoading]     = useState(Boolean(id))
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // ── Load existing shift if editing ────────────────────────────────────
  useEffect(() => {
    if (!id) return
    shiftService.getById(id)
      .then(res => {
        const s = res.data
        setShiftName(s.shiftName ?? 'Custom Shift')
        if (s.dayConfigs?.length) {
          const loaded = { ...defaultSchedule }
          s.dayConfigs.forEach(dc => {
            const dayEntry = ALL_DAYS.find(d => d.backendKey === dc.dayOfWeek)
            if (!dayEntry) return
            loaded[dayEntry.key] = {
              startTime:        dc.startTime?.slice(0, 5)        ?? '09:00',
              endTime:          dc.endTime?.slice(0, 5)          ?? '18:00',
              checkInEarliest:  dc.checkinStartWindow?.slice(0, 5)  ?? '08:30',
              checkInLatest:    dc.checkinEndWindow?.slice(0, 5)    ?? '09:30',
              checkOutEarliest: dc.checkoutStartWindow?.slice(0, 5) ?? '17:30',
              checkOutLatest:   dc.checkoutEndWindow?.slice(0, 5)   ?? '18:30',
              weekOff:          dc.isWeekOff ?? false,
            }
          })
          setSchedule(loaded)
        }
      })
      .catch(err => {
        toast.error(err?.message || 'Failed to load shift', 'Error')
        navigate('/shifts')
      })
      .finally(() => setLoading(false))
  }, [id])

  const updateDay = (day, key, val) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [key]: val } }))
  }

  const applyForAll = () => {
    const template = schedule[selectedDay]
    const updated  = {}
    ALL_DAYS.forEach(({ key }) => { updated[key] = { ...template } })
    setSchedule(updated)
    toast.info(`Settings from ${selectedDay} applied to all days`, 'Applied to All')
  }

  const resetDay = () => {
    setSchedule(prev => ({
      ...prev,
      [selectedDay]: defaultDay(defaultSchedule[selectedDay]?.weekOff ?? false),
    }))
    toast.info(`${selectedDay} reset to defaults`, 'Day Reset')
  }

  // ── Build the payload for the API ─────────────────────────────────────
  const buildPayload = () => ({
    shiftName,
    shiftType: 'CUSTOM',
    dayConfigs: ALL_DAYS.map(({ key, backendKey }) => {
      const d = schedule[key]
      return {
        dayOfWeek:            backendKey,
        startTime:            d.weekOff ? null : d.startTime,
        endTime:              d.weekOff ? null : d.endTime,
        checkinStartWindow:   d.weekOff ? null : d.checkInEarliest,
        checkinEndWindow:     d.weekOff ? null : d.checkInLatest,
        checkoutStartWindow:  d.weekOff ? null : d.checkOutEarliest,
        checkoutEndWindow:    d.weekOff ? null : d.checkOutLatest,
        isWeekOff:            d.weekOff,
      }
    }),
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      if (id) {
        await shiftService.update(id, buildPayload())
        toast.success('Custom shift updated successfully', 'Shift Updated')
      } else {
        await shiftService.create(buildPayload())
        toast.success('Custom shift created successfully', 'Shift Created')
      }
      navigate('/shifts')
    } catch (err) {
      toast.error(err?.message || 'Failed to save shift', 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm(`Delete "${shiftName}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await shiftService.delete(id)
      toast.success(`${shiftName} deleted`, 'Shift Deleted')
      navigate('/shifts')
    } catch (err) {
      toast.error(err?.message || 'Failed to delete shift', 'Error')
      setDeleting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!id) return
    try {
      const res = await shiftService.toggleStatus(id)
      toast.success(
        `${shiftName} ${res.data.isActive ? 'activated' : 'deactivated'}`,
        'Status Updated'
      )
    } catch (err) {
      toast.error(err?.message || 'Failed to update status', 'Error')
    }
  }

  // ── Summary helpers ───────────────────────────────────────────────────
  const workingDays = ALL_DAYS.filter(d => !schedule[d.key].weekOff)
  const weekOffDays = ALL_DAYS.filter(d =>  schedule[d.key].weekOff)
  const selectedData = schedule[selectedDay]

  const fmt = (t) => {
    if (!t) return '—'
    const [h, m] = t.split(':').map(Number)
    const hh = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hh}:${String(m).padStart(2,'0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 size={28} color={PRIMARY} className="animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/shifts')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">
            {id ? `Edit: ${shiftName}` : 'New Custom Shift'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure timing for each day individually
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

        {/* LEFT — day-wise grid */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Day-wise schedule</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Click a day card to edit its timing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white"
                style={{ backgroundColor: '#111827' }}>
                CUSTOM
              </span>
              <button onClick={applyForAll}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: PRIMARY }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = PRIMARY_DARK}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}>
                Apply for All
              </button>
            </div>
          </div>

          {/* Day selector cards */}
          <div className="grid grid-cols-7 gap-2 mt-4">
            {ALL_DAYS.map(({ key }) => {
              const d        = schedule[key]
              const isActive = selectedDay === key
              return (
                <button key={key} onClick={() => setSelectedDay(key)}
                  className="flex flex-col items-center py-3 px-1 rounded-xl border-2 transition-all cursor-pointer"
                  style={{
                    borderColor:     isActive ? PRIMARY : (d.weekOff ? '#374151' : '#E5E7EB'),
                    backgroundColor: d.weekOff ? '#111827' : (isActive ? '#FDE8DD' : '#F9FAFB'),
                  }}>
                  <span className={`text-[11px] font-bold ${d.weekOff ? 'text-white' : isActive ? 'text-[#C35E33]' : 'text-gray-600'}`}>
                    {key}
                  </span>
                  {d.weekOff
                    ? <span className="text-[9px] text-gray-400 mt-1">Off</span>
                    : <>
                        <span className={`text-[9px] mt-1 ${isActive ? 'text-[#C35E33]' : 'text-gray-400'}`}>
                          {fmt(d.startTime)}
                        </span>
                        <span className={`text-[9px] ${isActive ? 'text-[#C35E33]' : 'text-gray-400'}`}>
                          {fmt(d.endTime)}
                        </span>
                      </>
                  }
                </button>
              )
            })}
          </div>

          {/* Summary */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Schedule Summary
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Working days</span>
                <span className="text-sm font-bold text-gray-900">{workingDays.length} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Week offs</span>
                <div className="flex items-center gap-1">
                  {weekOffDays.map(d => (
                    <span key={d.key} className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: '#374151' }}>
                      {d.key}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Working days</span>
                <div className="flex items-center gap-1">
                  {workingDays.map(d => (
                    <span key={d.key} className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ color: PRIMARY, backgroundColor: '#FDE8DD' }}>
                      {d.key}
                    </span>
                  ))}
                </div>
              </div>
              {workingDays.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Typical hours</span>
                  <span className="text-sm font-bold text-gray-900">
                    {fmt(schedule[workingDays[0]?.key]?.startTime)} – {fmt(schedule[workingDays[0]?.key]?.endTime)}
                  </span>
                </div>
              )}
            </div>

            <button onClick={handleSave} disabled={saving}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = PRIMARY_DARK }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save &amp; continue
            </button>
          </div>
        </div>

        {/* RIGHT — day editor panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          {/* Day header + working toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {ALL_DAYS.find(d => d.key === selectedDay)?.label}
              </p>
              <p className="text-[11px] text-gray-400">
                {selectedData.weekOff ? 'Week off' : 'Working day'}
              </p>
            </div>
            <button type="button"
              onClick={() => updateDay(selectedDay, 'weekOff', !selectedData.weekOff)}
              className="relative flex-shrink-0 rounded-full transition-colors duration-200"
              style={{ width: 40, height: 22,
                       backgroundColor: !selectedData.weekOff ? '#3B82F6' : '#D1D5DB' }}>
              <span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm transition-transform duration-200"
                style={{ width: 18, height: 18,
                         transform: !selectedData.weekOff ? 'translateX(18px)' : 'translateX(0)' }} />
            </button>
          </div>

          {!selectedData.weekOff && (
            <>
              <div>
                <FieldLabel>Start time</FieldLabel>
                <TimeInput value={selectedData.startTime}
                  onChange={v => updateDay(selectedDay, 'startTime', v)} />
              </div>
              <div>
                <FieldLabel>End time</FieldLabel>
                <TimeInput value={selectedData.endTime}
                  onChange={v => updateDay(selectedDay, 'endTime', v)} />
              </div>
              <div>
                <FieldLabel>Check-in Window</FieldLabel>
                <p className="text-[10px] text-gray-400 mb-2">Earliest → Latest</p>
                <div className="grid grid-cols-2 gap-2">
                  <TimeInput value={selectedData.checkInEarliest}
                    onChange={v => updateDay(selectedDay, 'checkInEarliest', v)} />
                  <TimeInput value={selectedData.checkInLatest}
                    onChange={v => updateDay(selectedDay, 'checkInLatest', v)} />
                </div>
              </div>
              <div>
                <FieldLabel>Check-out Window</FieldLabel>
                <p className="text-[10px] text-gray-400 mb-2">Earliest → Latest</p>
                <div className="grid grid-cols-2 gap-2">
                  <TimeInput value={selectedData.checkOutEarliest}
                    onChange={v => updateDay(selectedDay, 'checkOutEarliest', v)} />
                  <TimeInput value={selectedData.checkOutLatest}
                    onChange={v => updateDay(selectedDay, 'checkOutLatest', v)} />
                </div>
              </div>
            </>
          )}

          {/* Mark week off row */}
          <div className="pt-2 border-t border-gray-100">
            <button onClick={() => updateDay(selectedDay, 'weekOff', !selectedData.weekOff)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-700 text-left">Mark as week off</p>
                <p className="text-[10px] text-gray-400 text-left">No attendance for this day</p>
              </div>
              <input type="checkbox" checked={selectedData.weekOff} onChange={() => {}}
                className="w-4 h-4 rounded" style={{ accentColor: PRIMARY }} />
            </button>
          </div>

          {/* Reset / Apply buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={resetDay}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <RotateCcw size={13} />Reset
            </button>
            <button onClick={applyForAll}
              className="py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = PRIMARY_DARK}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}>
              Apply All
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-6 pb-6">
        {id && (
          <>
            <button onClick={handleDeactivate}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Deactivate
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: '#111827' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#111827'}>
              {deleting && <Loader2 size={13} className="animate-spin" />}
              Delete shift
            </button>
          </>
        )}
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = PRIMARY_DARK }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}>
          {saving && <Loader2 size={13} className="animate-spin" />}
          {id ? 'Update Shift' : 'Save Shift'}
        </button>
      </div>
    </>
  )
}