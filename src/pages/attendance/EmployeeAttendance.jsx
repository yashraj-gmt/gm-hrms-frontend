// src/pages/attendance/EmployeeAttendance.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogIn, LogOut, Coffee, Play, Clock, History, FileText,
  AlertTriangle, CheckCircle2, Timer, ChevronRight, Activity,
} from 'lucide-react'
import { useToast }      from '@/components/shared/toast/ToastProvider'
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
function ActionCard({ title, icon: Icon, iconColor, timerSecs,
                      buttonLabel, buttonDisabled, onAction, active, pulse, loading }) {
  // eslint-disable-next-line no-unused-vars
  const _unused_icon = Icon
  const activeStyles = {
    'Clock-In': {
      border: 'border-emerald-200/80',
      bg: 'bg-emerald-50/10',
      glow: 'shadow-[0_12px_30px_-4px_rgba(34,197,94,0.15)]',
      btn: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-[0_4px_14px_rgba(34,197,94,0.3)]',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    'Break-In': {
      border: 'border-orange-200/80',
      bg: 'bg-orange-50/10',
      glow: 'shadow-[0_12px_30px_-4px_rgba(195,94,51,0.15)]',
      btn: 'bg-gradient-to-r from-[#C35E33] to-[#D4744D] hover:from-[#A34A24] hover:to-[#C35E33] text-white shadow-[0_4px_14px_rgba(195,94,51,0.3)]',
      iconBg: 'bg-orange-50 text-[#C35E33]',
    },
    'Break-Out': {
      border: 'border-slate-300/80',
      bg: 'bg-slate-50/20',
      glow: 'shadow-[0_12px_30px_-4px_rgba(100,116,139,0.15)]',
      btn: 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-[0_4px_14px_rgba(100,116,139,0.3)]',
      iconBg: 'bg-slate-100 text-slate-600',
    },
    'Clock-Out': {
      border: 'border-slate-800/20',
      bg: 'bg-slate-900/5',
      glow: 'shadow-[0_12px_30px_-4px_rgba(15,23,42,0.15)]',
      btn: 'bg-gradient-to-r from-slate-900 to-slate-950 hover:from-black hover:to-slate-900 text-white shadow-[0_4px_14px_rgba(15,23,42,0.3)]',
      iconBg: 'bg-slate-100 text-slate-900',
    }
  }[title] || {
    border: 'border-slate-100',
    bg: 'bg-white',
    glow: 'shadow-sm',
    btn: 'bg-slate-800 text-white',
    iconBg: 'bg-slate-50 text-slate-500',
  }

  return (
    <div
      className={`relative rounded-2xl flex flex-col gap-3.5 p-5 overflow-hidden transition-all duration-300 hover:scale-[1.02] border-2 bg-white ${
        active 
          ? `${activeStyles.border} ${activeStyles.bg} ${activeStyles.glow} z-10` 
          : 'border-slate-100/80 opacity-60 shadow-sm'
      }`}
    >
      {active && (
        <div 
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl transition-all"
          style={{ backgroundColor: iconColor }} 
        />
      )}
      
      <div className="flex items-center justify-between relative z-10">
        <span className="text-sm font-semibold tracking-tight text-slate-800">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${active ? activeStyles.iconBg : 'bg-slate-50 text-slate-400'}`}>
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>

      <div 
        className={`relative flex items-center justify-center rounded-xl py-4 overflow-hidden border transition-all duration-300 ${
          active 
            ? 'bg-slate-900 border-slate-850 shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]' 
            : 'bg-slate-50 border-slate-100'
        }`}
      >
        {pulse && active && (
          <div className="absolute inset-0 opacity-10 animate-pulse bg-emerald-500" />
        )}
        <span className={`font-mono text-2xl font-bold tracking-widest relative z-10 ${
          active ? 'text-white' : 'text-slate-500'
        }`}>
          {fmtTimer(timerSecs)}
        </span>
        {active && (
          <div className={`absolute right-3.5 w-2 h-2 rounded-full animate-ping opacity-75 ${
            title === 'Clock-In' || title === 'Clock-Out' ? 'bg-emerald-500' : 'bg-orange-500'
          }`} />
        )}
      </div>

      <button
        onClick={onAction}
        disabled={buttonDisabled || loading}
        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer ${
          active ? activeStyles.btn : 'bg-slate-100 text-slate-400 border border-slate-200/50'
        }`}
      >
        {loading && (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        <span>{buttonLabel}</span>
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
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-800">Today's Timeline</p>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
            Shift Unstarted
          </span>
        </div>
        <div className="relative h-7 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden mb-3">
          <div className="absolute left-0 top-0 h-full rounded-l-xl opacity-20 bg-amber-400"
            style={{ width: pctW(10) }} />
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 4px,#000 4px,#000 5px)' }} />
        </div>
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-slate-400">{fmt12(shiftStart)}</span>
          <span className="text-blue-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Clock in to begin shift
          </span>
          <span className="text-slate-400">{fmt12(shiftEnd)}</span>
        </div>
      </div>
    )
  }

  const inMin  = toMin(clockInTime.slice(0, 5))
  const outMin = clockOutTime
    ? toMin(clockOutTime.slice(0, 5))
    : Math.min(nowMin, shiftEndMin + 120)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
        <p className="text-sm font-bold text-slate-800">Today's Timeline</p>
        <div className="flex items-center gap-3.5 text-[10px] flex-wrap">
          {[
            ['bg-emerald-500', 'Work'],
            ['bg-rose-400', 'Break'],
            ['bg-amber-300', 'Grace Period'],
            ['bg-blue-400', 'Current Time']
          ].map(([bg, label]) => (
            <span key={label} className="flex items-center gap-1.5 text-slate-550 font-medium">
              <span className={`w-2.5 h-2.5 rounded-sm ${bg}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative h-8 rounded-xl bg-slate-50 border border-slate-100 overflow-visible mb-4">
        {/* Grace period */}
        <div className="absolute top-0 h-full rounded-xl opacity-35 bg-amber-300"
          style={{ left: pct(shiftStartMin), width: pctW(10) }} />
        {/* Work block */}
        <div className="absolute top-0 h-full rounded-xl bg-emerald-500/85"
          style={{ left: pct(inMin), width: pctW(outMin - inMin) }} />
        {/* Break blocks */}
        {breakPeriods.map((bp, i) => {
          if (!bp.start) return null
          const bStart = toMin(bp.start.slice(0, 5))
          const bEnd   = bp.end ? toMin(bp.end.slice(0, 5)) : Math.min(nowMin, outMin)
          return (
            <div key={i} className="absolute top-0 h-full z-10 bg-rose-400 rounded-lg"
              style={{ left: pct(bStart), width: pctW(bEnd - bStart) }} />
          )
        })}
        {/* Now marker */}
        {!clockOutTime && (
          <div className="absolute top-[-6px] bottom-[-6px] w-0.5 bg-blue-500 z-10"
            style={{ left: pct(nowMin) }}>
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
          </div>
        )}
        {/* Check-in dot */}
        <div className="absolute top-[-4px] w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-md ring-2 ring-emerald-100 z-20"
          style={{ left: `calc(${pct(inMin)} - 6px)` }} />
        {/* Check-out dot */}
        {clockOutTime && (
          <div className="absolute top-[-4px] w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-md ring-2 ring-rose-100 z-20"
            style={{ left: `calc(${pct(toMin(clockOutTime.slice(0, 5)))} - 6px)` }} />
        )}
      </div>

      <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
        <span>{fmt12(shiftStart)}</span>
        <div className="flex gap-4">
          <span className="text-emerald-600">In: {fmt12(clockInTime.slice(0, 5))}</span>
          {clockOutTime && (
            <span className="text-rose-500">Out: {fmt12(clockOutTime.slice(0, 5))}</span>
          )}
        </div>
        <span>{fmt12(shiftEnd)}</span>
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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-slate-800">Weekly Tracker</p>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mon – Fri</span>
      </div>
      <div className="grid grid-cols-5 gap-2.5">
        {weekDays.map((d) => {
          let cardStyle = ""
          
          if (d.isToday) {
            cardStyle = "bg-gradient-to-b from-[#C35E33] to-[#A34A24] text-white border-transparent shadow-md shadow-orange-500/20 hover:scale-[1.03]"
          } else if (d.isFuture) {
            cardStyle = "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100/50"
          } else {
            cardStyle = "bg-emerald-50/40 border-emerald-100 text-emerald-800 hover:bg-emerald-50/70 hover:border-emerald-200"
          }

          return (
            <div 
              key={d.day} 
              className={`flex flex-col items-center justify-between rounded-xl py-3 px-1 border transition-all duration-350 ${cardStyle}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${d.isToday ? 'text-orange-100' : d.isFuture ? 'text-slate-400' : 'text-emerald-600'}`}>
                {d.day}
              </span>
              <span className="text-lg font-extrabold mt-1 tracking-tight">{d.date}</span>
              
              {d.isToday ? (
                <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full mt-1.5 font-semibold text-white">
                  Today
                </span>
              ) : d.isFuture ? (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-350 mt-2" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
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
  // eslint-disable-next-line no-unused-vars
  const _unused_id = attendanceId
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
    idle:        { text: 'Not Clocked In', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200/60', dot: 'bg-slate-400' },
    clocked_in:  { text: 'Working',        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200/60', dot: 'bg-emerald-500' },
    on_break:    { text: 'On Break',       color: 'text-[#C35E33]', bg: 'bg-orange-50', border: 'border-orange-200/60', dot: 'bg-orange-500' },
    clocked_out: { text: 'Day Complete',   color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200/60', dot: 'bg-blue-500' },
  }[attState]

  const cards = [
    { title: 'Clock-In',  icon: LogIn,  iconColor: '#22C55E', timerSecs: workSecs,  buttonLabel: 'Clock In',    buttonDisabled: attState !== 'idle',       onAction: handleClockIn,  active: attState === 'idle',       pulse: false },
    { title: 'Break-In',  icon: Coffee, iconColor: PRIMARY,   timerSecs: attState === 'on_break' ? breakSecs : totalBreakSecs, buttonLabel: 'Start Break', buttonDisabled: attState !== 'clocked_in', onAction: handleBreakIn,  active: attState === 'clocked_in', pulse: false },
    { title: 'Break-Out', icon: Play,   iconColor: '#64748B', timerSecs: attState === 'on_break' ? breakSecs : 0, buttonLabel: 'End Break', buttonDisabled: attState !== 'on_break', onAction: handleBreakOut, active: attState === 'on_break',   pulse: attState === 'on_break' },
    { title: 'Clock-Out', icon: LogOut, iconColor: '#0F172A', timerSecs: workSecs,  buttonLabel: 'Clock Out', buttonDisabled: attState !== 'clocked_in', onAction: handleClockOut, active: attState === 'clocked_in', pulse: false },
  ]

  const stats = [
    { icon: <Activity size={18} />, bg: 'bg-orange-50 text-[#C35E33]', label: 'Work Time', value: attState === 'idle' ? '—' : workHrsDisplay, color: 'text-[#C35E33]' },
    { icon: <Coffee size={18} />, bg: 'bg-purple-50 text-purple-600', label: 'Break Taken', value: totalBreakMin > 0 ? `${totalBreakMin} min` : '—', color: 'text-purple-600' },
    { icon: <Timer size={18} />, bg: 'bg-sky-50 text-sky-600', label: 'Time Left', value: attState === 'clocked_in' ? `${Math.floor(minutesLeft/60)}h ${minutesLeft%60}m` : '—', color: 'text-sky-600' },
    { icon: <CheckCircle2 size={18} />, bg: 'bg-emerald-50 text-emerald-600', label: 'Clock-Out', value: clockOutTime ? fmt12(clockOutTime.slice(0, 5)) : '—', color: 'text-emerald-600' },
  ]

  // Construct structured events for chronological Session Log
  const sessionEvents = []
  if (clockInTime) {
    sessionEvents.push({
      type: 'in',
      title: 'Clocked In',
      time: clockInTime,
      color: 'bg-emerald-500 ring-emerald-100 text-emerald-600',
      icon: <LogIn size={11} className="text-white" />,
    })
  }
  breakPeriods.forEach((bp, idx) => {
    if (bp.start) {
      sessionEvents.push({
        type: 'break_start',
        title: `Break ${idx + 1} Started`,
        time: bp.start,
        color: 'bg-orange-500 ring-orange-100 text-orange-650',
        icon: <Coffee size={11} className="text-white" />,
      })
    }
    if (bp.end) {
      sessionEvents.push({
        type: 'break_end',
        title: `Break ${idx + 1} Ended`,
        time: bp.end,
        color: 'bg-slate-500 ring-slate-100 text-slate-650',
        icon: <Play size={11} className="text-white" />,
      })
    }
  })
  if (clockOutTime) {
    sessionEvents.push({
      type: 'out',
      title: 'Clocked Out',
      time: clockOutTime,
      color: 'bg-rose-500 ring-rose-100 text-rose-600',
      icon: <LogOut size={11} className="text-white" />,
    })
  }
  sessionEvents.sort((a, b) => a.time.localeCompare(b.time))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-slate-100/80 shadow-sm gap-4">
        <div className="relative flex items-center justify-center w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
        </div>
        <p className="text-sm font-semibold text-slate-505 animate-pulse">Retrieving your attendance profile...</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">My Attendance</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${attState === 'clocked_in' ? 'animate-pulse' : ''} ${statusMeta.dot}`} />
              <span>{statusMeta.text}</span>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Shift badge */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-100 bg-white text-xs shadow-sm">
            <div className="w-6.5 h-6.5 rounded-lg flex items-center justify-center bg-orange-50">
              <Clock size={13} className="text-[#C35E33]" />
            </div>
            <div>
              <p className="font-bold text-slate-700 leading-tight">{SHIFT.name}</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{fmt12(SHIFT.start)} – {fmt12(SHIFT.end)}</p>
            </div>
          </div>

          {/* ── Correction Request button ── */}
          <button
            onClick={() => navigate(ROUTES.ATTENDANCE_CORRECTION_REQUEST)}
            className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_4px_12px_rgba(124,58,237,0.2)] hover:-translate-y-0.5 cursor-pointer"
          >
            <FileText size={14} strokeWidth={2} />
            Request Correction
          </button>

          {/* History button */}
          <button
            onClick={() => navigate(ROUTES.ATTENDANCE_EMPLOYEE_HISTORY)}
            className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-slate-900 hover:bg-slate-850 shadow-[0_4px_12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 cursor-pointer"
          >
            <History size={14} strokeWidth={2} />
            History
          </button>
        </div>
      </div>

      {/* ── 4 Action Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {cards.map((c) => (
          <ActionCard key={c.title} {...c} loading={actionLoading && !c.buttonDisabled} />
        ))}
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4.5 flex items-center gap-4 hover:shadow-md hover:border-slate-200/80 transition-all duration-300 hover:-translate-y-0.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-semibold shrink-0 ${s.bg}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-xl font-extrabold tracking-tight leading-none truncate ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-5">
          <TodayTimeline
            clockInTime={clockInTime} clockOutTime={clockOutTime}
            breakPeriods={breakPeriods} shiftStart={SHIFT.start} shiftEnd={SHIFT.end}
          />
          <WeekCalendar />

          {/* Session log */}
          {sessionEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4.5">
                <p className="text-sm font-bold text-slate-800">Today's Activity Log</p>
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">Chronological</span>
              </div>
              
              <div className="relative pl-6.5 space-y-5 border-l-2 border-slate-100 ml-3.5 my-2">
                {sessionEvents.map((event, idx) => (
                  <div key={idx} className="relative flex items-center justify-between group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[35px] w-7.5 h-7.5 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${event.color}`}>
                      {event.icon}
                    </div>
                    
                    <div className="flex-1 pl-2.5">
                      <span className="text-xs font-bold text-slate-700">{event.title}</span>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Logged successfully</p>
                    </div>
                    
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {fmt12(event.time.slice(0, 5))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* Shift card */}
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white">
            <div className="px-5 py-4 relative overflow-hidden bg-gradient-to-br from-[#C35E33] to-[#A34A24]">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white blur-sm" />
              <p className="text-[10px] text-orange-200 font-bold uppercase tracking-wider mb-1 relative z-10">
                Today's Shift Details
              </p>
              <p className="text-base font-bold text-white relative z-10">{SHIFT.name}</p>
              
              <div className="mt-3.5 grid grid-cols-2 gap-2.5 relative z-10">
                {[['Start', SHIFT.start], ['End', SHIFT.end]].map(([label, time]) => (
                  <div key={label} className="rounded-xl p-3 bg-white/10 backdrop-blur-sm border border-white/10">
                    <p className="text-[9px] text-orange-200 uppercase font-bold tracking-wider">{label}</p>
                    <p className="text-xl font-extrabold text-white mt-0.5 tracking-tight">{fmt12(time)}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white px-5 py-3 space-y-1">
              {[
                ['Grace period',    `${SHIFT.grace} min`, 'bg-orange-50 text-[#C35E33] border-orange-100/50'],
                ['Late mark after', `${SHIFT.lateAfter} min`, 'bg-red-50 text-red-655 border-red-100/50'],
                ['Check-in window', `${fmt12('08:30')} – ${fmt12('09:30')}`, 'bg-emerald-50 text-emerald-700 border-emerald-100/50'],
                ['Auto checkout',   fmt12('18:30'), 'bg-blue-50 text-blue-700 border-blue-105/50'],
              ].map(([label, val, badgeCls]) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs font-semibold text-slate-500">{label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeCls}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent attendance */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <p className="text-sm font-bold text-slate-800">Recent Attendance</p>
              <button 
                onClick={() => navigate(ROUTES.ATTENDANCE_EMPLOYEE_HISTORY)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#C35E33] hover:text-[#A34A24] transition-colors cursor-pointer"
              >
                View all <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {recentHistory.length === 0 ? (
                <p className="px-5 py-6 text-xs font-medium text-slate-450 text-center">No recent records available.</p>
              ) : recentHistory.map((r) => {
                const s  = STATUS_BADGE[r.status] ?? { bg: 'bg-slate-100', color: 'text-slate-700', label: r.status }
                const ci = r.checkIn  ? fmt12(r.checkIn.split('T')[1]?.substring(0, 5))  : null
                const co = r.checkOut ? fmt12(r.checkOut.split('T')[1]?.substring(0, 5)) : null
                const wh = r.workMinutes > 0
                  ? `${Math.floor(r.workMinutes/60)}h ${r.workMinutes%60}m` : '—'
                const late = (r.lateMinutes || 0) > 0

                const dateObj = r.attendanceDate ? new Date(r.attendanceDate) : null
                const dayStr = dateObj ? dateObj.toLocaleDateString('en-IN', { day: '2-digit' }) : '—'
                const monStr = dateObj ? dateObj.toLocaleDateString('en-IN', { month: 'short' }) : ''

                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/45 transition-colors">
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                      <span className="text-xs font-extrabold text-slate-700 leading-none">{dayStr}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{monStr}</span>
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {ci && co ? `${ci} – ${co}` : ci ? `${ci} – Present` : 'Absent'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Shift Hours</p>
                    </div>
                    
                    <div className="ml-auto flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-extrabold text-slate-700">{wh}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s.bg || ''}`} style={{ backgroundColor: s.bg && s.bg.startsWith('#') ? s.bg : undefined, color: s.color && s.color.startsWith('#') ? s.color : undefined }}>
                        {s.label}
                      </span>
                      {late && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-650 border border-red-100/30">
                          Late
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick action: Request Correction ── */}
          <button
            onClick={() => navigate(ROUTES.ATTENDANCE_CORRECTION_REQUEST)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-dashed text-left transition-all group border-purple-200/60 bg-[#FAFAFE] hover:border-purple-305/70 hover:bg-[#F5F3FF]"
          >   
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-50">
              <FileText size={18} className="text-purple-650" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Request Attendance Correction</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Missed check-in/out? Submit a request to HR</p>
            </div>
            <ChevronRight size={16} className="text-purple-600 ml-auto flex-shrink-0" />
          </button>
        </div>
      </div>
    </>
  )
}