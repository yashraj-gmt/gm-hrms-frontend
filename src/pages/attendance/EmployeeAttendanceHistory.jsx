// src/pages/attendance/EmployeeAttendanceHistory.jsx
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, LayoutList, CalendarRange,
  Download, Activity, CheckCircle2, XCircle, TrendingUp,
} from 'lucide-react'
import DateFilter       from '@/components/shared/DateFilter'
import { useToast }     from '@/components/shared/toast/ToastProvider'
import attendanceService from '@/services/attendanceService'

const PRIMARY       = '#C35E33'
const PRIMARY_LIGHT = '#FDE8DD'
const PAGE_SIZE     = 8

const STATUS_CONFIG = {
  PRESENT:  { label: 'Present',  bg: '#DCFCE7', color: '#15803D', dot: '#22C55E' },
  ABSENT:   { label: 'Absent',   bg: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
  HALF_DAY: { label: 'Half Day', bg: '#FEF9C3', color: '#854D0E', dot: '#F59E0B' },
  LEAVE: { label: 'On Leave', bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt12 = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtMins = (m) => {
  if (!m) return '—'
  const h = Math.floor(m / 60), min = m % 60
  if (h === 0) return `${min}m`
  if (min === 0) return `${h}h`
  return `${h}h ${min}m`
}

const getDayStr = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }) : ''

const parseTime = (dt) => (dt ? dt.split('T')[1]?.substring(0, 5) ?? null : null)

// ─── Mini timeline ────────────────────────────────────────────────────────────
function MiniTimeline({ checkIn, checkOut, lateMinutes, breakMinutes, overtimeMinutes }) {
  if (!checkIn || !checkOut) return <div className="w-32 h-3 rounded-full bg-gray-100" />
  const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m }
  const total = 9 * 60
  const pct = (v) => Math.max(0, Math.min(100, (v / total) * 100))
  const inM = toMin(checkIn), outM = toMin(checkOut)
  const workM = outM - inM - breakMinutes

  return (
    <div className="w-32">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
        {lateMinutes > 0 && <div style={{ width:`${pct(lateMinutes)}%`, backgroundColor:PRIMARY, minWidth:3 }} />}
        <div style={{ width:`${pct(workM)}%`, backgroundColor:'#22C55E' }} />
        {breakMinutes > 0 && <div style={{ width:`${pct(breakMinutes)}%`, backgroundColor:'#FCA5A5', minWidth:2 }} />}
        {overtimeMinutes > 0 && <div style={{ width:`${pct(overtimeMinutes)}%`, backgroundColor:'#7C3AED', minWidth:2 }} />}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-gray-400">{fmt12(checkIn)}</span>
        <span className="text-[8px] text-gray-400">{fmt12(checkOut)}</span>
      </div>
    </div>
  )
}

function Badge({ status }) {
  const c = STATUS_CONFIG[status] ?? { label: status, bg: '#F3F4F6', color: '#374151' }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.color }}>{c.label}</span>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ records }) {
  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year  = month.getFullYear()
  const mon   = month.getMonth()
  const first = new Date(year, mon, 1).getDay()
  const days  = new Date(year, mon + 1, 0).getDate()

  const map = {}
  records.forEach((r) => { if (r.attendanceDate) map[r.attendanceDate] = r })

  const cells = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]

  const monthName = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={() => setMonth(new Date(year, mon - 1, 1))}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
          <ChevronLeft size={14} />
        </button>
        <p className="text-sm font-bold text-gray-900">{monthName}</p>
        <button onClick={() => setMonth(new Date(year, mon + 1, 1))}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 px-4 pt-3 pb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-center text-[9px] font-bold text-gray-400 uppercase pb-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = `${year}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const rec = map[dateStr]
          const isToday = dateStr === today.toISOString().slice(0,10)
          const cfg = rec ? STATUS_CONFIG[rec.status] : null

          return (
            <div key={day}
              className="aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-default relative group"
              style={{
                backgroundColor: cfg ? cfg.bg : isToday ? '#F1F5F9' : 'transparent',
                color: cfg ? cfg.color : isToday ? '#0F172A' : '#6B7280',
                border: isToday && !cfg ? '1.5px solid #CBD5E1' : '1.5px solid transparent',
              }}>
              {day}
              {cfg && <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: cfg.dot }} />}
              {rec && (
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10
                  bg-gray-900 text-white text-[9px] rounded-lg px-2 py-1 whitespace-nowrap pointer-events-none">
                  {cfg?.label}{rec.workMinutes > 0 ? ` · ${fmtMins(rec.workMinutes)}` : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-50 flex-wrap">
        {Object.values(STATUS_CONFIG).map((c) => (
          <span key={c.label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.dot }} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Pagination({ current, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold">{(current-1)*pageSize+1}–{Math.min(current*pageSize,total)}</span> of <span className="font-semibold">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(current-1)} disabled={current===1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30">
          <ChevronLeft size={14} />
        </button>
        {Array.from({length:totalPages},(_,i)=>i+1).map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
            style={{ borderColor:current===p?PRIMARY:'#E5E7EB', backgroundColor:current===p?PRIMARY:'transparent', color:current===p?'#fff':'#6B7280' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(current+1)} disabled={current===totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EmployeeAttendanceHistory() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [viewMode,     setViewMode]     = useState('list')
  const [filterStatus, setFilterStatus] = useState('All')
  const [page,         setPage]         = useState(1)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [history,      setHistory]      = useState([])
  const [totalElements,setTotalElements]= useState(0)
  const [loading,      setLoading]      = useState(false)
  const [summaryStats, setSummaryStats] = useState({
    present: 0, absent: 0, halfDay: 0, onLeave: 0, lateCount: 0, totalOT: 0, totalWork: 0,
  })

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateFrom)              params.from   = dateFrom
      if (dateTo)                params.to     = dateTo
      if (filterStatus !== 'All') params.status = filterStatus

      const res = await attendanceService.getMyHistory(page - 1, PAGE_SIZE, params)
      if (res?.success && res?.data) {
        setHistory(res.data.content || [])
        setTotalElements(res.data.totalElements || 0)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load attendance history.', 'Error')
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, dateFrom, dateTo, toast])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ── Derive stats from loaded history (approximate — for display) ──────────
  useEffect(() => {
    if (!history.length) return
    setSummaryStats({
      present:    history.filter((r) => r.status === 'PRESENT').length,
      absent:     history.filter((r) => r.status === 'ABSENT').length,
      halfDay:    history.filter((r) => r.status === 'HALF_DAY').length,
      onLeave:    history.filter((r) => r.status === 'LEAVE').length,
      lateCount:  history.filter((r) => (r.lateMinutes || 0) > 0).length,
      totalOT:    history.reduce((a, r) => a + (r.overtimeMinutes || 0), 0),
      totalWork:  history.reduce((a, r) => a + (r.workMinutes    || 0), 0),
    })
  }, [history])

  const handleDateFilter = ({ start, end }) => {
    setDateFrom(start ? start.toISOString().slice(0, 10) : '')
    setDateTo(end   ? end.toISOString().slice(0, 10)   : '')
    setPage(1)
  }

  const tabs = [
    { key: 'All',      label: 'All',      count: totalElements },
    { key: 'PRESENT',  label: 'Present',  count: summaryStats.present  },
    { key: 'ABSENT',   label: 'Absent',   count: summaryStats.absent   },
    { key: 'HALF_DAY', label: 'Half Day', count: summaryStats.halfDay  },
    { key: 'LEAVE', label: 'On Leave', count: summaryStats.onLeave  },
  ]

  const avgWork = summaryStats.present > 0
    ? Math.round(summaryStats.totalWork / summaryStats.present) : 0

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/my-attendance')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendance History</h1>
            <p className="text-xs text-gray-400 mt-0.5">Your complete attendance record</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {[{ mode: 'list', icon: LayoutList }, { mode: 'calendar', icon: CalendarRange }].map(
              ({ mode, icon: Icon }) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="flex items-center justify-center w-8 h-7 rounded-lg transition-all"
                  style={{
                    backgroundColor: viewMode===mode ? '#fff' : 'transparent',
                    color: viewMode===mode ? PRIMARY : '#6B7280',
                    boxShadow: viewMode===mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}>
                  <Icon size={14} />
                </button>
              )
            )}
          </div>
          {/* <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
            <Download size={14} /> Export
          </button> */}
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { icon: <CheckCircle2 size={17} color="#15803D" strokeWidth={1.8}/>, bg:'#DCFCE7', label:'Present Days',  value: summaryStats.present,        color:'#15803D', sub:`${totalElements} total` },
          { icon: <XCircle      size={17} color="#B91C1C" strokeWidth={1.8}/>, bg:'#FEE2E2', label:'Absent Days',   value: summaryStats.absent,         color:'#B91C1C', sub:`${summaryStats.halfDay} half-day` },
          { icon: <Activity     size={17} color={PRIMARY} strokeWidth={1.8}/>, bg:PRIMARY_LIGHT, label:'Avg Work', value: fmtMins(avgWork),            color:PRIMARY,   sub:'per day' },
          { icon: <TrendingUp   size={17} color="#7C3AED" strokeWidth={1.8}/>, bg:'#F5F3FF', label:'Total OT',     value: fmtMins(summaryStats.totalOT), color:'#7C3AED', sub:`${summaryStats.lateCount} late arrivals` },
        ].map(({ icon, bg, label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor:bg }}>{icon}</div>
            <div>
              <p className="text-lg font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><CalendarView records={history} /></div>
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Period Summary</p>
              </div>
              <div className="px-5 py-2 space-y-0">
                {[
                  ['Working Days',  history.length,          '#374151'],
                  ['Present',       summaryStats.present,    '#15803D'],
                  ['Absent',        summaryStats.absent,     '#B91C1C'],
                  ['Half Days',     summaryStats.halfDay,    '#854D0E'],
                  ['On Leave',      summaryStats.onLeave,    '#1D4ED8'],
                  ['Late Arrivals', summaryStats.lateCount,  PRIMARY  ],
                  ['Total OT',      fmtMins(summaryStats.totalOT), '#7C3AED'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-700 mb-3">Attendance Rate</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold" style={{ color: PRIMARY }}>
                  {history.length > 0
                    ? Math.round((summaryStats.present / history.length) * 100) : 0}%
                </span>
                <span className="text-xs text-gray-400 mb-1">{summaryStats.present}/{history.length} days</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: history.length > 0
                    ? `${(summaryStats.present / history.length) * 100}%` : '0%',
                  backgroundColor: PRIMARY,
                }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Toolbar ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {/* Status tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {tabs.map(({ key, label, count }) => (
                <button key={key} onClick={() => { setFilterStatus(key); setPage(1) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    borderColor:     filterStatus===key ? PRIMARY : '#E5E7EB',
                    color:           filterStatus===key ? '#fff'  : '#6B7280',
                    backgroundColor: filterStatus===key ? PRIMARY : '#fff',
                    fontWeight:      filterStatus===key ? 600     : 500,
                  }}>
                  {label}
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      backgroundColor: filterStatus===key ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                      color: filterStatus===key ? '#fff' : '#6B7280',
                    }}>{count}</span>
                </button>
              ))}
            </div>

            {/* ── DateFilter (replaces two date inputs) ── */}
            <div className="ml-auto">
              <DateFilter onChange={handleDateFilter} />
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 780 }}>
                  <thead>
                    <tr style={{ backgroundColor: PRIMARY }}>
                      {['Date','Day','Check In','Check Out','Timeline','Work Time','Break','Late (min)','OT (min)','Status']
                        .map((h) => (
                          <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold text-white whitespace-nowrap">{h}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-14 text-center text-sm text-gray-400">
                          No records found.
                        </td>
                      </tr>
                    ) : history.map((r, idx) => {
                      const ci = parseTime(r.checkIn)
                      const co = parseTime(r.checkOut)
                      return (
                        <tr key={r.id} className="hover:bg-orange-50 transition-colors border-b border-gray-50"
                          style={{ backgroundColor: idx%2===0 ? '#fff' : '#FAFAFA' }}>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-[12px] font-semibold text-gray-800">{fmtDate(r.attendanceDate)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {getDayStr(r.attendanceDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`text-[12px] font-semibold ${ci ? 'text-green-600' : 'text-gray-300'}`}>
                              {ci ? fmt12(ci) : '—'}
                            </span>
                            {(r.lateMinutes||0) > 0 && (
                              <div className="text-[9px] font-bold mt-0.5" style={{ color: PRIMARY }}>
                                +{r.lateMinutes}m late
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`text-[12px] font-semibold ${co ? 'text-red-500' : 'text-gray-300'}`}>
                              {co ? fmt12(co) : '—'}
                            </span>
                            {(r.overtimeMinutes||0) > 0 && (
                              <div className="text-[9px] font-bold text-purple-600 mt-0.5">
                                +{r.overtimeMinutes}m OT
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <MiniTimeline
                              checkIn={ci} checkOut={co}
                              lateMinutes={r.lateMinutes||0}
                              breakMinutes={r.breakMinutes||0}
                              overtimeMinutes={r.overtimeMinutes||0}
                            />
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-[12px] font-bold text-gray-800">
                              {r.workMinutes > 0 ? fmtMins(r.workMinutes) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-[12px] text-gray-500">
                              {r.breakMinutes > 0 ? fmtMins(r.breakMinutes) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`text-[12px] font-medium ${(r.lateMinutes||0)>0 ? '' : 'text-gray-400'}`}
                              style={{ color:(r.lateMinutes||0)>0 ? PRIMARY : undefined }}>
                              {(r.lateMinutes||0)>0 ? `+${r.lateMinutes}` : '0'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`text-[12px] font-medium ${(r.overtimeMinutes||0)>0 ? 'text-purple-600' : 'text-gray-400'}`}>
                              {(r.overtimeMinutes||0)>0 ? `+${r.overtimeMinutes}` : '0'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Badge status={r.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              current={page} total={totalElements}
              pageSize={PAGE_SIZE} onChange={setPage}
            />
          </div>
        </>
      )}
    </>
  )
}