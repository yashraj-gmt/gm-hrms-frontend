// src/pages/attendance/AttendanceOverview.jsx
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, Eye,
  ChevronLeft, ChevronRight,
  Clock, Users, AlertTriangle, TrendingUp, CheckCircle, XCircle,
} from 'lucide-react'
import FilterModal        from '@/components/shared/FilterModal'
import { useToast }       from '@/components/shared/toast/ToastProvider'
import attendanceService  from '@/services/attendanceService'
import AttendanceDetailModal from './AttendanceDetailModal'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'
const PAGE_SIZE    = 8

// ── FIX 1: fmt12 helper (check-in/out were hardcoded AM/PM) ──────────────────
const fmt12 = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

const FILTER_CONFIG = [
  { key: 'status',   label: 'Status',     type: 'multi',  options: ['PRESENT','ABSENT','HALF_DAY','LEAVE'] },
  { key: 'dept',     label: 'Department', type: 'select', options: ['Engineering','Sales','IT-Based','Marketing','HR','Finance','Design','Data'] },
  { key: 'dateFrom', label: 'Date From',  type: 'date' },
  { key: 'dateTo',   label: 'Date To',    type: 'date' },
]

const STATUS_MAP = {
  PRESENT:  { label: 'Present',   bg: '#DCFCE7', color: '#15803D' },
  ABSENT:   { label: 'Absent',    bg: '#FEE2E2', color: '#B91C1C' },
  HALF_DAY: { label: 'Half Day',  bg: '#FEF9C3', color: '#854D0E' },
  LEAVE:    { label: 'On Leave',  bg: '#DBEAFE', color: '#1D4ED8' },
}

// ── FIX 2: column → sort-key map for table header sorting ────────────────────
const COL_KEY_MAP = {
  'Employee ID':   'employeeCode',
  'Employee Name': 'name',
  'Check In':      'checkIn',
  'Check Out':     'checkOut',
  'Work Hrs':      'workMinutes',
  'Date':          'date',
}

const COLUMNS = [
  { label: 'Employee ID',   sort: true  },
  { label: 'Employee Name', sort: true  },
  { label: 'Timeline',      sort: false },
  { label: 'Department',    sort: false },
  { label: 'Check In',      sort: true  },
  { label: 'Check Out',     sort: true  },
  { label: 'Work Hrs',      sort: true  },
  { label: 'Late (min)',    sort: false },
  { label: 'OT (min)',      sort: false },
  { label: 'Date',          sort: true  },
  { label: 'Status',        sort: false },
  { label: 'View',          sort: false },
]

// ─── Timeline progress bar ─────────────────────────────────────────────────────
function TimelineBar({ checkIn, checkOut, breakMinutes, lateMinutes, overtimeMinutes }) {
  if (!checkIn || !checkOut) {
    return (
      <div className="flex flex-col items-center" style={{ width: 200 }}>
        <div className="w-full h-4 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-[9px] text-gray-400">—</span>
        </div>
      </div>
    )
  }

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const shiftStart  = toMin('09:30')
  const shiftEnd    = toMin('18:30')
  const shiftTotal  = shiftEnd - shiftStart
  const inMin       = toMin(checkIn)
  const outMin      = toMin(checkOut)
  const total       = outMin - inMin
  const pct         = (v) => Math.max(0, Math.min(100, (v / shiftTotal) * 100))
  const workPct     = pct(total - breakMinutes - lateMinutes - overtimeMinutes)

  return (
    <div style={{ width: 200 }}>
      <div className="relative flex h-4 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
        {lateMinutes > 0 && (
          <div style={{ width: `${pct(lateMinutes)}%`, backgroundColor: PRIMARY, minWidth: 4 }} />
        )}
        <div style={{ flex: 1, backgroundColor: '#22C55E' }} />
        {breakMinutes > 0 && (
          <div style={{ width: `${pct(breakMinutes)}%`, backgroundColor: '#FCA5A5', minWidth: 4 }} />
        )}
        {overtimeMinutes > 0 && (
          <div style={{ width: `${pct(overtimeMinutes)}%`, backgroundColor: '#111827', minWidth: 4 }} />
        )}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-gray-400">{fmt12(checkIn)}</span>
        <span className="text-[8px] text-gray-400">{fmt12(checkOut)}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          <span className="text-[7px] text-gray-400">Work</span>
        </span>
        {lateMinutes > 0 && (
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: PRIMARY }} />
            <span className="text-[7px] text-gray-400">Late</span>
          </span>
        )}
        {breakMinutes > 0 && (
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" />
            <span className="text-[7px] text-gray-400">Break</span>
          </span>
        )}
        {overtimeMinutes > 0 && (
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-800 inline-block" />
            <span className="text-[7px] text-gray-400">OT</span>
          </span>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: '#F3F4F6', color: '#374151' }
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

// ─── Sort icon (active direction dims the inactive arrow) ─────────────────────
function SortIcon({ colLabel, sortConfig }) {
  const key    = COL_KEY_MAP[colLabel]
  const active = sortConfig.key === key
  return (
    <svg
      width="9" height="9" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"
      className="ml-1 inline-block flex-shrink-0"
    >
      <path d="m6 9 6-6 6 6"  style={{ opacity: active && sortConfig.dir === 'desc' ? 0.25 : 1 }} />
      <path d="m6 15 6 6 6-6" style={{ opacity: active && sortConfig.dir === 'asc'  ? 0.25 : 1 }} />
    </svg>
  )
}

function Pagination({ current, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing{' '}
        <span className="font-semibold text-gray-800">
          {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)}
        </span>{' '}
        of <span className="font-semibold text-gray-800">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)} disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p} onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
            style={{
              borderColor:     current === p ? PRIMARY : '#E5E7EB',
              backgroundColor: current === p ? PRIMARY : 'transparent',
              color:           current === p ? '#fff'  : '#6B7280',
            }}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(current + 1)} disabled={current === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendanceOverview() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [activeTab,     setActiveTab]     = useState('All')
  const [search,        setSearch]        = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [page,          setPage]          = useState(1)
  const [detailRecord,  setDetailRecord]  = useState(null)

  // ── FIX 3: controlled date state (was defaultValue → no reactivity) ────────
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  // API state
  const [attendance,    setAttendance]    = useState([])
  const [summary,       setSummary]       = useState(null)
  const [totalElements, setTotalElements] = useState(0)
  const [loading,       setLoading]       = useState(false)

  // ── FIX 4: real pending approvals count (was hardcoded 3) ─────────────────
  const [pendingCount, setPendingCount] = useState(0)

  // ── FIX 5: sort state ─────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' })

  const handleSort = (colLabel) => {
    const key = COL_KEY_MAP[colLabel]
    if (!key) return
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  const tabs = [
    { key: 'All',      label: 'All',      count: attendance.length },
    { key: 'PRESENT',  label: 'Present',  count: attendance.filter((e) => e.status === 'PRESENT').length },
    { key: 'ABSENT',   label: 'Absent',   count: attendance.filter((e) => e.status === 'ABSENT').length },
    { key: 'HALF_DAY', label: 'Half Day', count: attendance.filter((e) => e.status === 'HALF_DAY').length },
    { key: 'LEAVE',    label: 'On Leave', count: attendance.filter((e) => e.status === 'LEAVE').length },
  ]

  // ── FIX 6: normalizeRecord — add attendanceDate (raw) + breakLogs ─────────
  const normalizeRecord = (r) => ({
    id:              r.id,
    employeeCode:    r.employeeCode   || 'N/A',
    name:            r.employeeName   || 'Unknown',
    department:      r.department     || '—',
    designation:     r.designation    || '—',
    shift:           r.shift          || '—',
    checkIn:         r.checkIn  ? r.checkIn.split('T')[1]?.substring(0, 5) : null,
    checkOut:        r.checkOut ? r.checkOut.split('T')[1]?.substring(0, 5) : null,
    workMinutes:     r.workMinutes     || 0,
    lateMinutes:     r.lateMinutes     || 0,
    overtimeMinutes: r.overtimeMinutes || 0,
    breakMinutes:    r.breakMinutes    || 0,
    status:          r.status,
    // raw "YYYY-MM-DD" needed by the correction form
    attendanceDate:  r.attendanceDate || '',
    date:            r.attendanceDate
      ? new Date(r.attendanceDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—',
    // real break logs for the detail modal
    breakLogs: (r.breakLogs || []).map((b) => ({
      start:    b.breakStart ? b.breakStart.split('T')[1]?.substring(0, 5) : null,
      end:      b.breakEnd   ? b.breakEnd.split('T')[1]?.substring(0, 5)   : null,
      duration: b.durationMinutes || 0,
    })),
  })

  // ── FIX 7: fetchData — also fetches pending correction count ──────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { date: selectedDate }
      if (activeFilters.status?.length) params.status = activeFilters.status[0]
      if (activeFilters.dept)           params.department = activeFilters.dept

      const [attRes, sumRes, corrRes] = await Promise.all([
        attendanceService.getAll(page - 1, PAGE_SIZE, params),
        attendanceService.getDailySummary(selectedDate),
        attendanceService.getCorrectionRequests(0, 1, 'PENDING'),
      ])

      if (attRes?.success) {
        setAttendance((attRes.data?.content || []).map(normalizeRecord))
        setTotalElements(attRes.data?.totalElements || 0)
      }
      if (sumRes?.success) setSummary(sumRes.data)
      if (corrRes?.success) setPendingCount(corrRes.data?.totalElements || 0)
    } catch (err) {
      toast.error(err?.message || 'Failed to load attendance data.', 'Error')
    } finally {
      setLoading(false)
    }
  }, [page, selectedDate, activeFilters, toast])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { setPage(1) }, [selectedDate, activeFilters, activeTab, search])

  // Client-side tab + search filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return attendance.filter((e) => {
      const tabMatch    = activeTab === 'All' || e.status === activeTab
      const searchMatch = !q
        || e.name.toLowerCase().includes(q)
        || e.employeeCode.toLowerCase().includes(q)
        || e.department.toLowerCase().includes(q)
      return tabMatch && searchMatch
    })
  }, [attendance, activeTab, search])

  // ── FIX 8: sorted → paginated (sort is now functional) ───────────────────
  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered
    const NUMERIC = ['workMinutes', 'lateMinutes', 'overtimeMinutes', 'breakMinutes']
    return [...filtered].sort((a, b) => {
      let av = a[sortConfig.key] ?? ''
      let bv = b[sortConfig.key] ?? ''
      if (NUMERIC.includes(sortConfig.key)) {
        return sortConfig.dir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      }
      return sortConfig.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortConfig])

  const paginated = useMemo(
    () => sortedFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedFiltered, page],
  )

  const statsData = summary ? [
    { label: 'Total Today',   value: summary.total,        color: '#111827', bg: '#F3F4F6', icon: <Users size={17}        color="#111827" strokeWidth={1.8} /> },
    { label: 'Present',       value: summary.present,      color: '#15803D', bg: '#DCFCE7', icon: <CheckCircle size={17}  color="#15803D" strokeWidth={1.8} /> },
    { label: 'Absent',        value: summary.absent,       color: '#B91C1C', bg: '#FEE2E2', icon: <XCircle size={17}      color="#B91C1C" strokeWidth={1.8} /> },
    { label: 'Half Day',      value: summary.halfDay,      color: '#854D0E', bg: '#FEF9C3', icon: <AlertTriangle size={17} color="#854D0E" strokeWidth={1.8} /> },
    { label: 'On Leave',      value: summary.onLeave,      color: '#1D4ED8', bg: '#DBEAFE', icon: <Clock size={17}        color="#1D4ED8" strokeWidth={1.8} /> },
    { label: 'Late Arrivals', value: summary.lateArrivals, color: PRIMARY,   bg: '#FDE8DD', icon: <TrendingUp size={17}   color={PRIMARY} strokeWidth={1.8} /> },
  ] : []

  const filterCount = Object.values(activeFilters)
    .filter((v) => (Array.isArray(v) ? v.length > 0 : !!v)).length

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Attendance Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Monitor daily employee attendance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ── FIX 3: controlled date input ─────────────────────────────── */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C35E33] cursor-pointer"
          />
          {/* ── FIX 4: dynamic pending count ─────────────────────────────── */}
          <button
            onClick={() => navigate('/attendance/pending')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer transition-colors whitespace-nowrap"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            <Clock size={14} strokeWidth={2} />
            Pending Approvals
            {pendingCount > 0 && (
              <span
                className="w-5 h-5 rounded-full bg-white text-[10px] font-bold flex items-center justify-center"
                style={{ color: PRIMARY }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {statsData.map(({ label, value, color, bg, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key} onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border cursor-pointer transition-all whitespace-nowrap"
              style={{
                borderColor:     activeTab === key ? '#111827' : '#E5E7EB',
                color:           activeTab === key ? '#111827' : '#6B7280',
                backgroundColor: activeTab === key ? '#F9FAFB' : '#fff',
                fontWeight:      activeTab === key ? 600 : 500,
              }}
            >
              {label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  backgroundColor: activeTab === key ? '#111827' : '#F3F4F6',
                  color:           activeTab === key ? '#fff'    : '#6B7280',
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text">
            <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-36 sm:w-44"
            />
          </label>
          <button
            onClick={() => setShowFilter(true)}
            className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-9 text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB', color: filterCount > 0 ? PRIMARY : '#374151' }}
          >
            <Filter size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Filter</span>
            {filterCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: PRIMARY }}
              >
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {/* ── FIX 5: clickable sortable headers ──────────────────── */}
                {COLUMNS.map(({ label, sort }) => (
                  <th
                    key={label}
                    onClick={() => sort && handleSort(label)}
                    className={`px-3.5 py-3.5 text-left text-xs font-semibold whitespace-nowrap text-white ${sort && COL_KEY_MAP[label] ? 'cursor-pointer select-none hover:opacity-80 transition-opacity' : ''}`}
                  >
                    <span className="inline-flex items-center">
                      {label}
                      {sort && COL_KEY_MAP[label] && (
                        <SortIcon colLabel={label} sortConfig={sortConfig} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-14 text-center text-sm text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Loading attendance…
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-14 text-center text-sm text-gray-400">
                    No records match your filters.
                  </td>
                </tr>
              ) : paginated.map((emp, idx) => (
                <tr
                  key={emp.id}
                  className="hover:bg-orange-50 transition-colors"
                  style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                >
                  <td className="px-3.5 py-4 text-[11px] font-bold border-b border-gray-50 whitespace-nowrap" style={{ color: PRIMARY }}>
                    {emp.employeeCode}
                  </td>
                  <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        {emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-900 leading-none">{emp.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{emp.designation}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-4 border-b border-gray-50">
                    <TimelineBar
                      checkIn={emp.checkIn}   checkOut={emp.checkOut}
                      breakMinutes={emp.breakMinutes} lateMinutes={emp.lateMinutes}
                      overtimeMinutes={emp.overtimeMinutes}
                    />
                  </td>
                  <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">{emp.department}</td>
                  {/* ── FIX 6: use fmt12 instead of hardcoded AM/PM ──────── */}
                  <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                    <span className={`text-[12px] font-medium ${emp.checkIn ? 'text-green-600' : 'text-gray-300'}`}>
                      {emp.checkIn ? fmt12(emp.checkIn) : '—'}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                    <span className={`text-[12px] font-medium ${emp.checkOut ? 'text-red-500' : 'text-gray-300'}`}>
                      {emp.checkOut ? fmt12(emp.checkOut) : '—'}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                    <span className="text-[12px] font-bold text-gray-800">
                      {emp.workMinutes > 0 ? `${(emp.workMinutes / 60).toFixed(2)}h` : '—'}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                    <span className={`text-[12px] font-medium ${emp.lateMinutes > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {emp.lateMinutes > 0 ? `+${emp.lateMinutes}` : '0'}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                    <span className={`text-[12px] font-medium ${emp.overtimeMinutes > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {emp.overtimeMinutes > 0 ? `+${emp.overtimeMinutes}` : '0'}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 text-[12px] text-gray-500 border-b border-gray-50 whitespace-nowrap">{emp.date}</td>
                  <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                    <StatusBadge status={emp.status} />
                  </td>
                  <td className="px-3.5 py-4 border-b border-gray-50">
                    <button
                      onClick={() => setDetailRecord(emp)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] hover:bg-orange-50 transition-all"
                    >
                      <Eye size={14} strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          current={page} total={sortedFiltered.length}
          pageSize={PAGE_SIZE} onChange={setPage}
        />
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {detailRecord && (
        <AttendanceDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          // FIX 7: refresh table after a correction is saved
          onCorrect={fetchData}
        />
      )}

      {/* ── Filter Modal ──────────────────────────────────────────────────── */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(f) => setActiveFilters(f)}
        onReset={() => setActiveFilters({})}
        config={FILTER_CONFIG}
      />
    </>
  )
}