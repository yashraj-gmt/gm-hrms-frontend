// src/pages/attendance/EmployeeAttendance.jsx
// ── Patch: add "Correction Request" button to the header action row ───────────
// Find the existing header action buttons section (~line 310 in the previous version)
// and replace the buttons block with the one below.
//
// CHANGE SUMMARY:
//   1. Import ROUTES (already imported)
//   2. Add a "Correction Request" button next to the "History" button
//
// Only the header JSX fragment is shown — the rest of the file is unchanged.
// ---------------------------------------------------------------------------

// In the header <div className="flex items-center gap-2 flex-wrap"> block,
// REPLACE the existing History button with:

/*
  <div className="flex items-center gap-2 flex-wrap">
    {/* Shift badge *}
    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: PRIMARY_LIGHT }}>
        <Clock size={12} color={PRIMARY} />
      </div>
      <span className="font-semibold text-gray-700">{SHIFT.name}</span>
      <span className="text-gray-400">{fmt12(SHIFT.start)} – {fmt12(SHIFT.end)}</span>
    </div>

    {/* Correction Request button — NEW *}
    <button
      onClick={() => navigate(ROUTES.ATTENDANCE_CORRECTION_REQUEST)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
      style={{ backgroundColor: '#7C3AED', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6D28D9')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7C3AED')}
    >
      <FileText size={14} strokeWidth={2} />
      Request Correction
    </button>

    {/* History button *}
    <button
      onClick={() => navigate(ROUTES.ATTENDANCE_EMPLOYEE_HISTORY)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
      style={{ backgroundColor: '#0F172A', boxShadow: '0 2px 8px rgba(15,23,42,0.25)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
    >
      <History size={14} strokeWidth={2} />
      History
    </button>
  </div>
*/

// ── FULL FILE (complete replacement) ─────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogIn, LogOut, Coffee, Play, Clock, History, FileText,
  TrendingUp, AlertTriangle, CheckCircle2, Timer, ChevronRight, Activity,
} from 'lucide-react'
import { useToast }      from '@/components/shared/toast/ToastProvider'
import { useAuthStore }  from '@/store/authStore'
import attendanceService from '@/services/attendanceService'
import { ROUTES }        from '@/constants/routes'

const PRIMARY       = '#C35E33'
const PRIMARY_DARK  = '#A34A24'
const PRIMARY_LIGHT = '#FDE8DD'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toMin = (t) => {
  if (!t) return 0
  const parts = t.split(':').map(Number)
  return parts[0] * 60 + (parts[1] || 0)
}

const fmt12 = (t) => {
  if (!t) return '—'
  const parts = t.split(':').map(Number)
  const h = parts[0], m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

const fmtTimer = (secs) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const nowHHMM = () => {
  const n = new Date()
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
}

const dtToTime = (dt) => (dt ? dt.split('T')[1]?.substring(0, 8) ?? null : null)

const calcElapsedSecs = (checkInDT, breakSecs) => {
  if (!checkInDT) return 0
  const elapsed = Math.floor((Date.now() - new Date(checkInDT).getTime()) / 1000)
  return Math.max(0, elapsed - breakSecs)
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_BADGE = {
  PRESENT:  { bg: '#DCFCE7', color: '#15803D', label: 'Present'  },
  ABSENT:   { bg: '#FEE2E2', color: '#B91C1C', label: 'Absent'   },
  HALF_DAY: { bg: '#FEF9C3', color: '#854D0E', label: 'Half Day' },
  ON_LEAVE: { bg: '#DBEAFE', color: '#1D4ED8', label: 'On Leave' },
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ title, icon: Icon, iconColor, timerSecs, timerBg,
                      buttonLabel, buttonBg, buttonDisabled, onAction, active, pulse, loading }) {
  return (
    <div
      className="relative bg-white rounded-2xl flex flex-col gap-3 p-4 overflow-hidden transition-all duration-300"
      style={{
        border: `2px solid ${active ? iconColor + '40' : '#F1F5F9'}`,
        boxShadow: active ? `0 8px 32px ${iconColor}20` : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {active && (
        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10"
          style={{ backgroundColor: iconColor, filter: 'blur(12px)' }} />
      )}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[13px] font-bold text-gray-800">{title}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: active ? iconColor + '18' : '#F8FAFC' }}>
          <Icon size={16} color={active ? iconColor : '#94A3B8'} strokeWidth={2} />
        </div>
      </div>
      <div className="relative flex items-center justify-center rounded-xl py-3 overflow-hidden"
        style={{ backgroundColor: active ? timerBg : '#0F172A' }}>
        {pulse && <div className="absolute inset-0 opacity-20 animate-pulse rounded-xl"
          style={{ backgroundColor: timerBg }} />}
        <span className="font-mono text-xl font-bold tracking-widest text-white relative z-10">
          {fmtTimer(timerSecs)}
        </span>
        {active && <div className="absolute right-3 w-2 h-2 rounded-full bg-white animate-pulse opacity-60" />}
      </div>
      <button
        onClick={onAction}
        disabled={buttonDisabled || loading}
        className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          backgroundColor: (buttonDisabled || loading) ? '#F1F5F9' : buttonBg,
          color: (buttonDisabled || loading) ? '#94A3B8' : '#fff',
          boxShadow: (buttonDisabled || loading) ? 'none' : `0 4px 12px ${buttonBg}40`,
        }}
      >
        {loading && (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {buttonLabel}
      </button>
    </div>
  )
}

// ─── Today Timeline ───────────────────────────────────────────────────────────
function TodayTimeline({ clockInTime, clockOutTime, breakPeriods, shiftStart, shiftEnd }) {
  const shiftStartMin = toMin(shiftStart)
  const shiftEndMin   = toMin(shiftEnd)
  const shiftTotal    = shiftEndMin - shiftStartMin

  const pct  = (v) => `${Math.max(0, Math.min(100, ((v - shiftStartMin) / shiftTotal) * 100)).toFixed(2)}%`
  const pctW = (v) => `${Math.max(0, Math.min(100, (v / shiftTotal) * 100)).toFixed(2)}%`

  const nowMin = toMin(nowHHMM())

  if (!clockInTime) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">Today's Timeline</p>
          <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            Not started
          </span>
        </div>
        <div className="relative h-9 rounded-xl bg-gray-100 overflow-hidden mb-2.5">
          <div className="absolute left-0 top-0 h-full rounded-l-xl opacity-30"
            style={{ width: pctW(10), backgroundColor: '#FCD34D' }} />
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 4px,#000 4px,#000 5px)' }} />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-400 font-medium">{fmt12(shiftStart)}</span>
          <span className="font-semibold text-blue-500 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Clock in to begin
          </span>
          <span className="text-gray-400 font-medium">{fmt12(shiftEnd)}</span>
        </div>
      </div>
    )
  }

  const inMin  = toMin(clockInTime.slice(0, 5))
  const outMin = clockOutTime
    ? toMin(clockOutTime.slice(0, 5))
    : Math.min(nowMin, shiftEndMin + 120)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">Today's Timeline</p>
        <div className="flex items-center gap-3 text-[10px]">
          {[['#22C55E','Work'],['#FCA5A5','Break'],['#FCD34D','Grace'],['#60A5FA','Now']].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1 text-gray-500">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }} />{l}
            </span>
          ))}
        </div>
      </div>

      <div className="relative h-9 rounded-xl bg-gray-100 overflow-visible mb-3">
        {/* Grace period */}
        <div className="absolute top-0 h-full rounded-xl opacity-40"
          style={{ left: pct(shiftStartMin), width: pctW(10), backgroundColor: '#FCD34D' }} />
        {/* Work block */}
        <div className="absolute top-0 h-full rounded-xl"
          style={{ left: pct(inMin), width: pctW(outMin - inMin), backgroundColor: '#22C55E', opacity: 0.85 }} />
        {/* Break blocks */}
        {breakPeriods.map((bp, i) => {
          if (!bp.start) return null
          const bStart = toMin(bp.start.slice(0, 5))
          const bEnd   = bp.end ? toMin(bp.end.slice(0, 5)) : Math.min(nowMin, outMin)
          return (
            <div key={i} className="absolute top-0 h-full z-10"
              style={{ left: pct(bStart), width: pctW(bEnd - bStart), backgroundColor: '#FCA5A5' }} />
          )
        })}
        {/* Now marker */}
        {!clockOutTime && (
          <div className="absolute top-[-5px] bottom-[-5px] w-0.5 rounded-full bg-blue-400 z-10"
            style={{ left: pct(nowMin) }} />
        )}
        {/* Check-in dot */}
        <div className="absolute top-[-7px] w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow z-20"
          style={{ left: `calc(${pct(inMin)} - 7px)` }} />
        {/* Check-out dot */}
        {clockOutTime && (
          <div className="absolute top-[-7px] w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow z-20"
            style={{ left: `calc(${pct(toMin(clockOutTime.slice(0, 5)))} - 7px)` }} />
        )}
      </div>

      <div className="flex justify-between text-[10px] text-gray-400">
        <span className="font-medium">{fmt12(shiftStart)}</span>
        <div className="flex gap-3">
          <span className="text-green-600 font-bold">In: {fmt12(clockInTime.slice(0, 5))}</span>
          {clockOutTime && (
            <span className="text-red-500 font-bold">Out: {fmt12(clockOutTime.slice(0, 5))}</span>
          )}
        </div>
        <span className="font-medium">{fmt12(shiftEnd)}</span>
      </div>
    </div>
  )
}

// ─── Week Calendar ────────────────────────────────────────────────────────────
function WeekCalendar() {
  const today  = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      day:      WEEK_DAYS[d.getDay()],
      date:     String(d.getDate()).padStart(2, '0'),
      isToday:  d.toDateString() === today.toDateString(),
      isFuture: d > today,
    }
  })

  const styles = {
    today:  { bg: PRIMARY_LIGHT, border: PRIMARY + '60', color: PRIMARY,   dot: PRIMARY   },
    past:   { bg: '#F0FDF4',     border: '#BBF7D0',      color: '#15803D', dot: '#22C55E' },
    future: { bg: '#F8FAFC',     border: '#E2E8F0',      color: '#94A3B8', dot: '#CBD5E1' },
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <p className="text-xs font-bold text-gray-700 mb-3">This Week</p>
      <div className="flex gap-2">
        {weekDays.map((d) => {
          const s = d.isToday ? styles.today : d.isFuture ? styles.future : styles.past
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center rounded-xl py-3"
              style={{ backgroundColor: s.bg, border: `1.5px solid ${s.border}` }}>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: s.color }}>
                {d.day}
              </span>
              <span className="text-base font-bold mt-0.5" style={{ color: s.color }}>{d.date}</span>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: s.dot }} />
              {d.isToday && (
                <span className="text-[8px] mt-0.5 font-semibold" style={{ color: s.color }}>Today</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EmployeeAttendance() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const SHIFT = { name: 'Morning Shift', start: '09:00', end: '18:00', grace: 10, lateAfter: 15 }

  const [loading,        setLoading]        = useState(true)
  const [actionLoading,  setActionLoading]  = useState(false)
  const [attState,       setAttState]       = useState('idle')
  const [attendanceId,   setAttendanceId]   = useState(null)
  const [clockInTime,    setClockInTime]    = useState(null)
  const [clockOutTime,   setClockOutTime]   = useState(null)
  const [breakPeriods,   setBreakPeriods]   = useState([])
  const [workSecs,       setWorkSecs]       = useState(0)
  const [breakSecs,      setBreakSecs]      = useState(0)
  const [totalBreakSecs, setTotalBreakSecs] = useState(0)
  const [recentHistory,  setRecentHistory]  = useState([])

  const intervalRef = useRef(null)

  // Tick
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (attState === 'clocked_in') setWorkSecs((s) => s + 1)
      if (attState === 'on_break')   setBreakSecs((s) => s + 1)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [attState])

  // Restore state from API
  useEffect(() => {
    const fetchToday = async () => {
      setLoading(true)
      try {
        const res = await attendanceService.getMyToday()
        if (res?.success && res?.data) applyAttendanceState(res.data)
      } catch { /* 404 = not checked in yet */ }
      finally { setLoading(false) }
    }
    const fetchHistory = async () => {
      try {
        const res = await attendanceService.getMyHistory(0, 5)
        if (res?.success && res?.data?.content) setRecentHistory(res.data.content)
      } catch { /* silent */ }
    }
    fetchToday()
    fetchHistory()
  }, [])

  const applyAttendanceState = (att) => {
    setAttendanceId(att.id)
    setClockInTime(dtToTime(att.checkIn))
    setClockOutTime(dtToTime(att.checkOut))
    const breaks = (att.breakLogs || []).map((b) => ({
      start: dtToTime(b.breakStart),
      end:   dtToTime(b.breakEnd),
    }))
    setBreakPeriods(breaks)
    const completedBreakSecs = (att.breakMinutes || 0) * 60
    setTotalBreakSecs(completedBreakSecs)
    if (att.isCheckedOut) {
      setAttState('clocked_out')
      setWorkSecs((att.workMinutes || 0) * 60)
    } else if (att.isOnBreak) {
      setAttState('on_break')
      setWorkSecs(calcElapsedSecs(att.checkIn, completedBreakSecs))
    } else if (att.isCheckedIn) {
      setAttState('clocked_in')
      setWorkSecs(calcElapsedSecs(att.checkIn, completedBreakSecs))
    }
  }

  const handleClockIn = useCallback(async () => {
    setActionLoading(true)
    try {
      const res = await attendanceService.checkIn()
      if (res?.success && res?.data) {
        const ciTime = dtToTime(res.data.checkIn)
        setAttendanceId(res.data.id)
        setClockInTime(ciTime)
        setAttState('clocked_in')
        setWorkSecs(0)
        const nowM = toMin(nowHHMM())
        const isLate = nowM > toMin(SHIFT.start) + SHIFT.lateAfter
        isLate
          ? toast.warning(`You clocked in ${nowM - toMin(SHIFT.start)} min after shift start.`, 'Late Check-In')
          : toast.success(`Clocked in at ${fmt12(ciTime?.slice(0, 5))}. Have a great day!`, 'Clock In')
      }
    } catch (err) {
      toast.error(err?.message || 'Check-in failed. Please try again.', 'Error')
    } finally { setActionLoading(false) }
  }, [toast, SHIFT.start, SHIFT.lateAfter])

  const handleBreakIn = useCallback(async () => {
    setActionLoading(true)
    try {
      const res = await attendanceService.breakStart()
      if (res?.success && res?.data) {
        const now = dtToTime(res.data.breakLogs?.at(-1)?.breakStart ?? new Date().toISOString())
        setAttState('on_break')
        setBreakSecs(0)
        setBreakPeriods((prev) => [...prev, { start: now, end: null }])
        toast.info(`Break started at ${fmt12(now?.slice(0, 5))}.`, 'Break Started')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to start break.', 'Error')
    } finally { setActionLoading(false) }
  }, [toast])

  const handleBreakOut = useCallback(async () => {
    setActionLoading(true)
    try {
      const res = await attendanceService.breakEnd()
      if (res?.success && res?.data) {
        const latestBreak = res.data.breakLogs?.at(-1)
        const endTime = dtToTime(latestBreak?.breakEnd ?? new Date().toISOString())
        const dur = latestBreak?.durationMinutes ?? Math.floor(breakSecs / 60)
        setAttState('clocked_in')
        setTotalBreakSecs((s) => s + breakSecs)
        setBreakPeriods((prev) => {
          const u = [...prev]
          if (u.length) u[u.length - 1] = { ...u[u.length - 1], end: endTime }
          return u
        })
        toast.info(`Break ended. Duration: ${dur} min.`, 'Break Over')
        setBreakSecs(0)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to end break.', 'Error')
    } finally { setActionLoading(false) }
  }, [toast, breakSecs])

  const handleClockOut = useCallback(async () => {
    setActionLoading(true)
    try {
      const res = await attendanceService.checkOut()
      if (res?.success && res?.data) {
        const coTime = dtToTime(res.data.checkOut)
        setClockOutTime(coTime)
        setAttState('clocked_out')
        clearInterval(intervalRef.current)
        const finalWork = res.data.workMinutes || Math.floor(workSecs / 60)
        const ot = res.data.overtimeMinutes || 0
        setWorkSecs(finalWork * 60)
        ot > 0
          ? toast.custom({ type: 'success', title: 'Clocked Out — Overtime!', message: `Work: ${Math.floor(finalWork/60)}h ${finalWork%60}m · OT: ${ot} min`, duration: 6000 })
          : toast.success(`Work: ${Math.floor(finalWork/60)}h ${finalWork%60}m. See you tomorrow!`, 'Clocked Out')
      }
    } catch (err) {
      toast.error(err?.message || 'Check-out failed. Please try again.', 'Error')
    } finally { setActionLoading(false) }
  }, [toast, workSecs])

  const nowMin         = toMin(nowHHMM())
  const minutesLeft    = attState === 'clocked_in' ? Math.max(0, toMin(SHIFT.end) - nowMin) : 0
  const totalBreakMin  = Math.floor(totalBreakSecs / 60)
  const workHrsDisplay = `${Math.floor(workSecs / 3600)}h ${Math.floor((workSecs % 3600) / 60)}m`

  const statusMeta = {
    idle:        { text: 'Not Clocked In', color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' },
    clocked_in:  { text: 'Working',        color: '#15803D', bg: '#DCFCE7', dot: '#22C55E' },
    on_break:    { text: 'On Break',       color: PRIMARY,   bg: PRIMARY_LIGHT, dot: PRIMARY },
    clocked_out: { text: 'Day Complete',   color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  }[attState]

  const cards = [
    { title: 'Clock-In',  icon: LogIn,  iconColor: '#22C55E', timerSecs: workSecs,  timerBg: '#0F172A', buttonLabel: 'Clock In',    buttonBg: '#22C55E', buttonDisabled: attState !== 'idle',       onAction: handleClockIn,  active: attState === 'idle',       pulse: false },
    { title: 'Break-In',  icon: Coffee, iconColor: PRIMARY,   timerSecs: attState === 'on_break' ? breakSecs : totalBreakSecs, timerBg: PRIMARY, buttonLabel: 'Start Break', buttonBg: PRIMARY, buttonDisabled: attState !== 'clocked_in', onAction: handleBreakIn,  active: attState === 'clocked_in', pulse: false },
    { title: 'Break-Out', icon: Play,   iconColor: '#64748B', timerSecs: attState === 'on_break' ? breakSecs : 0, timerBg: attState === 'on_break' ? '#1E293B' : '#94A3B8', buttonLabel: 'End Break', buttonBg: '#1E293B', buttonDisabled: attState !== 'on_break', onAction: handleBreakOut, active: attState === 'on_break',   pulse: attState === 'on_break' },
    { title: 'Clock-Out', icon: LogOut, iconColor: '#0F172A', timerSecs: workSecs,  timerBg: attState === 'clocked_out' ? '#22C55E' : '#0F172A', buttonLabel: 'Clock Out', buttonBg: '#0F172A', buttonDisabled: attState !== 'clocked_in', onAction: handleClockOut, active: attState === 'clocked_in', pulse: false },
  ]

  const stats = [
    { icon: <Activity    size={16} color={PRIMARY} />,     bg: PRIMARY_LIGHT, label: 'Work Time',   value: attState === 'idle' ? '—' : workHrsDisplay,                                              color: PRIMARY   },
    { icon: <Coffee      size={16} color="#7C3AED" />,     bg: '#F5F3FF',     label: 'Break Taken', value: totalBreakMin > 0 ? `${totalBreakMin} min` : '—',                                       color: '#7C3AED' },
    { icon: <Timer       size={16} color="#0EA5E9" />,     bg: '#E0F2FE',     label: 'Time Left',   value: attState === 'clocked_in' ? `${Math.floor(minutesLeft/60)}h ${minutesLeft%60}m` : '—',   color: '#0284C7' },
    { icon: <CheckCircle2 size={16} color="#15803D" />,    bg: '#DCFCE7',     label: 'Clock-Out',   value: clockOutTime ? fmt12(clockOutTime.slice(0, 5)) : '—',                                   color: '#15803D' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Loading today's attendance…
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}>
              <div className={`w-1.5 h-1.5 rounded-full ${attState === 'clocked_in' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: statusMeta.dot }} />
              {statusMeta.text}
            </div>
          </div>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Shift badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: PRIMARY_LIGHT }}>
              <Clock size={12} color={PRIMARY} />
            </div>
            <span className="font-semibold text-gray-700">{SHIFT.name}</span>
            <span className="text-gray-400">{fmt12(SHIFT.start)} – {fmt12(SHIFT.end)}</span>
          </div>

          {/* ── Correction Request button ── */}
          {/* <button
            onClick={() => navigate(ROUTES.ATTENDANCE_CORRECTION_REQUEST)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ backgroundColor: '#7C3AED', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6D28D9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7C3AED')}
          >
            <FileText size={14} strokeWidth={2} />
            Request Correction
          </button> */}

          {/* History button */}
          <button
            onClick={() => navigate(ROUTES.ATTENDANCE_EMPLOYEE_HISTORY)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ backgroundColor: '#0F172A', boxShadow: '0 2px 8px rgba(15,23,42,0.25)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
          >
            <History size={14} strokeWidth={2} />
            History
          </button>
        </div>
      </div>

      {/* ── 4 Action Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <ActionCard key={c.title} {...c} loading={actionLoading && !c.buttonDisabled} />
        ))}
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
              {s.icon}
            </div>
            <div>
              <p className="text-lg font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-4">
          <TodayTimeline
            clockInTime={clockInTime} clockOutTime={clockOutTime}
            breakPeriods={breakPeriods} shiftStart={SHIFT.start} shiftEnd={SHIFT.end}
          />
          <WeekCalendar />

          {/* Session log */}
          {(clockInTime || breakPeriods.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-sm font-bold text-gray-900 mb-3">Today's Session Log</p>
              <div className="space-y-2">
                {clockInTime && (
                  <div className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-green-50 border border-green-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-green-700">Clock In</span>
                    <span className="text-xs text-gray-400 ml-auto">{fmt12(clockInTime.slice(0, 5))}</span>
                  </div>
                )}
                {breakPeriods.map((bp, i) => (
                  <div key={i}>
                    {bp.start && (
                      <div className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl border"
                        style={{ backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY + '30' }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIMARY }} />
                        <span className="text-xs font-semibold" style={{ color: PRIMARY }}>Break {i+1} Start</span>
                        <span className="text-xs text-gray-400 ml-auto">{fmt12(bp.start.slice(0, 5))}</span>
                      </div>
                    )}
                    {bp.end && (
                      <div className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-gray-50 border border-gray-100 mt-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-600">Break {i+1} End</span>
                        <span className="text-xs text-gray-400 ml-auto">{fmt12(bp.end.slice(0, 5))}</span>
                      </div>
                    )}
                  </div>
                ))}
                {clockOutTime && (
                  <div className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-red-50 border border-red-100">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-red-600">Clock Out</span>
                    <span className="text-xs text-gray-400 ml-auto">{fmt12(clockOutTime.slice(0, 5))}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Shift card */}
          <div className="rounded-2xl overflow-hidden border border-gray-100">
            <div className="px-5 py-4 relative overflow-hidden" style={{ backgroundColor: PRIMARY }}>
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
              <p className="text-[10px] text-orange-200 font-bold uppercase tracking-widest mb-1 relative z-10">
                Today's Shift
              </p>
              <p className="text-base font-bold text-white relative z-10">{SHIFT.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 relative z-10">
                {[['Start', SHIFT.start], ['End', SHIFT.end]].map(([label, time]) => (
                  <div key={label} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    <p className="text-[9px] text-orange-200 uppercase font-bold">{label}</p>
                    <p className="text-xl font-bold text-white mt-0.5">{fmt12(time)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white px-5 py-1">
              {[
                ['Grace period',    `${SHIFT.grace} min`],
                ['Late mark after', `${SHIFT.lateAfter} min`],
                ['Check-in window', `${fmt12('08:30')} – ${fmt12('09:30')}`],
                ['Auto checkout',   fmt12('18:30')],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold" style={{ color: PRIMARY }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent attendance */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Recent Attendance</p>
              <button onClick={() => navigate(ROUTES.ATTENDANCE_EMPLOYEE_HISTORY)}
                className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: PRIMARY }}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentHistory.length === 0 ? (
                <p className="px-5 py-4 text-xs text-gray-400">No recent records.</p>
              ) : recentHistory.map((r) => {
                const s  = STATUS_BADGE[r.status] ?? { bg: '#F3F4F6', color: '#374151', label: r.status }
                const ci = r.checkIn  ? fmt12(r.checkIn.split('T')[1]?.substring(0, 5))  : null
                const co = r.checkOut ? fmt12(r.checkOut.split('T')[1]?.substring(0, 5)) : null
                const wh = r.workMinutes > 0
                  ? `${Math.floor(r.workMinutes/60)}h ${r.workMinutes%60}m` : '-'
                const late = (r.lateMinutes || 0) > 0

                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">
                        {r.attendanceDate
                          ? new Date(r.attendanceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                          : '—'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {ci && co ? `${ci} – ${co}` : '—'}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">{wh}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>
                      {late && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: PRIMARY_LIGHT, color: PRIMARY }}>Late</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick action: Request Correction */}
          {/* <button
            onClick={() => navigate(ROUTES.ATTENDANCE_CORRECTION_REQUEST)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-dashed text-left transition-all group"
            style={{ borderColor: '#7C3AED30', backgroundColor: '#FAFAFE' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7C3AED60'; e.currentTarget.style.backgroundColor = '#F5F3FF' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#7C3AED30'; e.currentTarget.style.backgroundColor = '#FAFAFE' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE' }}>
              <FileText size={18} color="#7C3AED" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-800">Request Attendance Correction</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Missed check-in/out? Submit a request to HR</p>
            </div>
            <ChevronRight size={16} color="#7C3AED" className="ml-auto flex-shrink-0" />
          </button> */}
        </div>
      </div>
    </>
  )
}