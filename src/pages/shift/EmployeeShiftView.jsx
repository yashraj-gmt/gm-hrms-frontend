import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun, Clock, Coffee, CalendarDays, AlertCircle,
  ArrowRight, Info, Zap, History, Loader2,
} from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import shiftService from '@/services/shiftService'
 
const PRIMARY = '#C35E33'
 
const fmt12 = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}
 
const DAY_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
const DAY_LABEL = { MONDAY:'MON',TUESDAY:'TUE',WEDNESDAY:'WED',THURSDAY:'THU',FRIDAY:'FRI',SATURDAY:'SAT',SUNDAY:'SUN' }
 
const todayDayIndex = (() => {
  const d = new Date().getDay() // 0=Sun
  const map = [6,0,1,2,3,4,5]  // convert JS day to DAY_ORDER index
  return map[d]
})()
 
function StatTile({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: accent + '18' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none" style={{ color: accent }}>{value}</p>
        <p className="text-xs font-semibold text-gray-700 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
 
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold" style={{ color: PRIMARY }}>{value}</span>
    </div>
  )
}
 
function TodayTimeline({ shiftDetails }) {
  if (!shiftDetails?.normalTiming) return null
  const { startTime, endTime, checkinStartWindow, checkinEndWindow, checkoutStartWindow, checkoutEndWindow } = shiftDetails.normalTiming
 
  const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const now      = new Date()
  const nowMin   = now.getHours() * 60 + now.getMinutes()
  const start    = toMin(startTime)
  const end      = toMin(endTime)
  const total    = end - start
  const elapsed  = Math.max(0, Math.min(nowMin - start, total))
  const pct      = total > 0 ? (elapsed / total) * 100 : 0
  const inShift  = nowMin >= start && nowMin <= end
  const done     = nowMin > end
  const remMin   = end - nowMin
  const remH     = Math.floor(remMin / 60)
  const remM     = remMin % 60
 
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900">Today's Shift Progress</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {inShift ? 'Currently in shift' : done ? 'Shift completed' : 'Shift not started yet'}
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: inShift ? '#DCFCE7' : done ? '#F3F4F6' : '#FEF9C3',
                   color: inShift ? '#15803D' : done ? '#6B7280' : '#854D0E' }}>
          {inShift ? 'In Shift' : done ? 'Completed' : 'Not Started'}
        </div>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden bg-gray-100 mb-1">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${done ? 100 : pct}%`, backgroundColor: done ? '#22C55E' : inShift ? PRIMARY : '#D1D5DB' }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-5">
        <span>{fmt12(startTime)}</span>
        <span className="font-medium" style={{ color: PRIMARY }}>
          {inShift ? `${remH}h ${remM}m remaining` : done ? `Ended at ${fmt12(endTime)}` : `Starts at ${fmt12(startTime)}`}
        </span>
        <span>{fmt12(endTime)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3.5 border border-gray-100 bg-green-50">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Check-in Window</p>
          <p className="text-sm font-bold text-green-700">{fmt12(checkinStartWindow)} – {fmt12(checkinEndWindow)}</p>
        </div>
        <div className="rounded-xl p-3.5 border border-gray-100 bg-red-50">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Check-out Window</p>
          <p className="text-sm font-bold text-red-600">{fmt12(checkoutStartWindow)} – {fmt12(checkoutEndWindow)}</p>
        </div>
      </div>
    </div>
  )
}
 
function WeeklySchedule({ shiftDetails }) {
  const timing = shiftDetails?.normalTiming
  const days   = shiftDetails?.dayConfigs
 
  const schedule = DAY_ORDER.map((day, idx) => {
    if (timing) {
      const isSat = day === 'SATURDAY'
      const isSun = day === 'SUNDAY'
      return {
        day: DAY_LABEL[day],
        startTime: timing.startTime,
        endTime: timing.endTime,
        isOff: (isSat && timing.saturdayOff) || (isSun && timing.sundayOff),
        isToday: idx === todayDayIndex,
      }
    }
    const dc = (days ?? []).find(d => d.dayOfWeek === day)
    return {
      day: DAY_LABEL[day],
      startTime: dc?.startTime,
      endTime: dc?.endTime,
      isOff: dc?.isWeekOff ?? true,
      isToday: idx === todayDayIndex,
    }
  })
 
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">Weekly Schedule</p>
        <span className="text-[11px] text-gray-400 px-2.5 py-1 bg-gray-50 rounded-full border border-gray-100">
          {schedule.filter(d => !d.isOff).length} working days
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {schedule.map(d => (
          <div key={d.day}
            className="flex flex-col items-center rounded-xl py-3 px-1 border-2 transition-all"
            style={{ borderColor: d.isToday ? PRIMARY : d.isOff ? '#E5E7EB' : '#F3F4F6',
                     backgroundColor: d.isOff ? '#F9FAFB' : d.isToday ? '#FDE8DD' : '#fff' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: d.isToday ? PRIMARY : d.isOff ? '#9CA3AF' : '#6B7280' }}>
              {d.day}
            </span>
            {d.isToday && <span className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: PRIMARY }} />}
            {d.isOff
              ? <span className="text-[9px] text-gray-400 mt-2 font-medium">Off</span>
              : <>
                  <span className="text-[9px] font-semibold mt-1.5" style={{ color: d.isToday ? PRIMARY : '#374151' }}>
                    {(d.startTime || '').slice(0, 5)}
                  </span>
                  <span className="text-[8px] text-gray-400">to</span>
                  <span className="text-[9px] font-semibold" style={{ color: d.isToday ? PRIMARY : '#374151' }}>
                    {(d.endTime || '').slice(0, 5)}
                  </span>
                </>
            }
          </div>
        ))}
      </div>
    </div>
  )
}
 
export default function EmployeeShiftView() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
 
  useEffect(() => {
    shiftService.getMyCurrentShift()
      .then(res => setData(res.data))
      .catch(err => toast.error(err?.message || 'Could not load your shift', 'Error'))
      .finally(() => setLoading(false))
  }, [])
 
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 size={28} color={PRIMARY} className="animate-spin" />
      </div>
    )
  }
 
  if (!data?.currentAssignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <CalendarDays size={36} color="#D1D5DB" />
        <p className="text-sm font-semibold text-gray-500">No active shift assigned to your profile.</p>
        <p className="text-xs text-gray-400">Please contact your HR or Admin.</p>
      </div>
    )
  }
 
  const { currentAssignment, upcomingChange } = data
  const shift  = currentAssignment.shiftDetails
  const breaks = shift?.breaks ?? []
  const workingDayCount = shift?.normalTiming
    ? 5 - (shift.normalTiming.saturdayOff ? 1 : 0) - (shift.normalTiming.sundayOff ? 1 : 0)
    : (shift?.dayConfigs ?? []).filter(d => !d.isWeekOff).length
  const totalBreakMin = breaks.reduce((s, b) => s + (b.breakDurationMinutes ?? 0), 0)
 
  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Shift</h1>
          <p className="text-xs text-gray-400 mt-0.5">Your current shift schedule and timing details</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-semibold text-gray-800">{shift?.shiftName}</span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: PRIMARY }}>
              {shift?.shiftType}
            </span>
          </div>
          <button onClick={() => navigate('/my-shift/history')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#111827'}>
            <History size={14} />Shift History
          </button>
        </div>
      </div>
 
      {/* Upcoming change banner */}
      {upcomingChange && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border mb-5"
          style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
          <AlertCircle size={16} color="#854D0E" className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-800">Upcoming Shift Change</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              You will be moved to <strong>{upcomingChange.newShiftName}</strong> effective{' '}
              <strong>{upcomingChange.effectiveDate}</strong>. Assigned by {upcomingChange.assignedBy}.
            </p>
          </div>
          <ArrowRight size={14} color="#854D0E" className="flex-shrink-0 mt-0.5" />
        </div>
      )}
 
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile icon={<Clock size={18} color={PRIMARY} />}         label="Shift Duration" value={`${shift?.minimumWorkHours ?? '?'}h`}     sub="Minimum required" accent={PRIMARY}   />
        <StatTile icon={<CalendarDays size={18} color="#1D4ED8" />}  label="Working Days"   value={`${workingDayCount} days`}                 sub="Per week"         accent="#1D4ED8"  />
        <StatTile icon={<Coffee size={18} color="#7C3AED" />}        label="Total Break"    value={`${totalBreakMin} min`}                    sub={`${breaks.length} breaks`} accent="#7C3AED" />
        <StatTile icon={<Zap size={18} color="#15803D" />}           label="Grace Period"   value={`${shift?.graceMinutes ?? '?'} min`}       sub="Before late mark" accent="#15803D" />
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <TodayTimeline shiftDetails={shift} />
          <WeeklySchedule shiftDetails={shift} />
        </div>
        <div className="space-y-4">
          {/* Shift card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4" style={{ backgroundColor: PRIMARY }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                  <Sun size={16} color={PRIMARY} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{shift?.shiftName}</p>
                  <p className="text-[10px] text-orange-200">Since {currentAssignment.effectiveFrom}</p>
                </div>
              </div>
              {shift?.normalTiming && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-white bg-opacity-15 rounded-xl p-3">
                    <p className="text-[9px] text-orange-200 uppercase font-bold tracking-wider">Start</p>
                    <p className="text-xl font-bold text-white mt-0.5">{fmt12(shift.normalTiming.startTime)}</p>
                  </div>
                  <div className="bg-white bg-opacity-15 rounded-xl p-3">
                    <p className="text-[9px] text-orange-200 uppercase font-bold tracking-wider">End</p>
                    <p className="text-xl font-bold text-white mt-0.5">{fmt12(shift.normalTiming.endTime)}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pb-2">
              {shift?.normalTiming && <>
                <InfoRow label="Check-in window"  value={`${fmt12(shift.normalTiming.checkinStartWindow)} – ${fmt12(shift.normalTiming.checkinEndWindow)}`} />
                <InfoRow label="Check-out window" value={`${fmt12(shift.normalTiming.checkoutStartWindow)} – ${fmt12(shift.normalTiming.checkoutEndWindow)}`} />
              </>}
              <InfoRow label="Grace period"     value={`${shift?.graceMinutes ?? '?'} min`} />
              <InfoRow label="Late mark after"  value={`${shift?.lateMarkAfterMinutes ?? '?'} min`} />
              <InfoRow label="Late mark limit"  value={`${shift?.lateMarkLimit ?? '?'} times`} />
              <InfoRow label="Min work hours"   value={`${shift?.minimumWorkHours ?? '?'} hrs`} />
              <div className="flex items-center justify-between py-3 border-b border-gray-50">
                <span className="text-sm text-gray-500">Overtime</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: '#111827' }}>
                  After {shift?.overtimeAfterMinutes ?? '?'} min
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Auto checkout</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: shift?.autoCheckout ? PRIMARY : '#9CA3AF' }}>
                  {shift?.autoCheckout ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
 
          {/* Break policies */}
          {breaks.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Coffee size={15} color={PRIMARY} />
                <p className="text-sm font-bold text-gray-900">Break Policies</p>
              </div>
              <div className="space-y-2.5">
                {breaks.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ backgroundColor: b.isPaid ? PRIMARY : '#111827' }}>
                    <div className="flex items-center gap-2.5">
                      <Coffee size={14} color="rgba(255,255,255,0.7)" />
                      <span className="text-sm font-semibold text-white">{b.breakName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-200">{b.breakDurationMinutes} min</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: b.isPaid ? '#111827' : '#fff', color: b.isPaid ? '#fff' : '#111827' }}>
                        {b.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Info size={12} color="#9CA3AF" className="flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Unpaid breaks are deducted from total work hours.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}