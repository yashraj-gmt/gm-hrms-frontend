import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Calendar, Clock,
  ChevronLeft, ChevronRight, TrendingUp,
  CalendarDays, BarChart2, X, Loader2,
} from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import shiftService from '@/services/shiftService'
 
const PRIMARY   = '#C35E33'
const PAGE_SIZE = 8
 
const fmt12 = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}
 
function Pagination({ current, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-800">{(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)}</span> of <span className="font-semibold text-gray-800">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(current - 1)} disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-400 transition-colors">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
            style={{ borderColor: current === p ? PRIMARY : '#E5E7EB', backgroundColor: current === p ? PRIMARY : 'transparent', color: current === p ? '#fff' : '#6B7280' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(current + 1)} disabled={current === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-400 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
 
export default function EmployeeShiftHistory() {
  const navigate = useNavigate()
  const { toast } = useToast()
 
  const [assignments,   setAssignments]   = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [page,          setPage]          = useState(1)
  const [search,        setSearch]        = useState('')
  const [shiftFilter,   setShiftFilter]   = useState('')
 
  useEffect(() => {
    setLoading(true)
    shiftService.getMyShiftHistory(page - 1, PAGE_SIZE)
      .then(res => {
        setAssignments(res.data?.content ?? [])
        setTotalElements(res.data?.totalElements ?? 0)
      })
      .catch(err => toast.error(err?.message || 'Failed to load shift history', 'Error'))
      .finally(() => setLoading(false))
  }, [page])
 
  const shiftNames = [...new Set(assignments.map(a => a.shiftName))]
 
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return assignments.filter(a =>
      (!q || a.shiftName?.toLowerCase().includes(q) || a.effectiveFrom?.includes(q)) &&
      (!shiftFilter || a.shiftName === shiftFilter)
    )
  }, [assignments, search, shiftFilter])
 
  const totalShifts  = assignments.length
  const uniqueShifts = new Set(assignments.map(a => a.shiftName)).size
 
  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/my-shift')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shift History</h1>
          <p className="text-xs text-gray-400 mt-0.5">All your previous shift assignments</p>
        </div>
      </div>
 
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { icon: <BarChart2 size={17} color={PRIMARY} />,     label: 'Total Records',  value: totalShifts,   bg: '#FDE8DD', color: PRIMARY   },
          { icon: <CalendarDays size={17} color="#15803D" />,  label: 'Unique Shifts',  value: uniqueShifts,  bg: '#DCFCE7', color: '#15803D' },
          { icon: <TrendingUp size={17} color="#854D0E" />,    label: 'Total Pages',    value: Math.ceil(totalElements / PAGE_SIZE), bg: '#FEF9C3', color: '#854D0E' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: s.bg }}>
              {s.icon}
            </div>
            <div>
              <p className="text-lg font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
 
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 h-10 border border-gray-200 cursor-text min-w-48 flex-1">
            <Search size={13} color="#9CA3AF" />
            <input type="text" value={search}
              onChange={e => { setSearch(e.target.value) }}
              placeholder="Search by shift name…"
              className="border-none outline-none text-sm text-gray-900 bg-transparent w-full" />
          </label>
          <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}
            className="h-10 px-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none cursor-pointer">
            <option value="">All Shifts</option>
            {shiftNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {(search || shiftFilter) && (
            <button onClick={() => { setSearch(''); setShiftFilter('') }}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
              <X size={12} />Clear
            </button>
          )}
        </div>
      </div>
 
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} color={PRIMARY} className="animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 600 }}>
              <thead>
                <tr style={{ backgroundColor: PRIMARY }}>
                  {['Shift Name', 'Type', 'Timing', 'Effective From', 'Effective To', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold text-white whitespace-nowrap first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarDays size={28} color="#D1D5DB" />
                      <p className="text-sm text-gray-400">No shift records found</p>
                    </div>
                  </td></tr>
                ) : filtered.map((row, idx) => {
                  const isActive   = row.status === 'ACTIVE'
                  const isUpcoming = row.status === 'UPCOMING'
                  const statusBg   = isActive ? '#DCFCE7' : isUpcoming ? '#FEF9C3' : '#F3F4F6'
                  const statusClr  = isActive ? '#15803D' : isUpcoming ? '#854D0E' : '#6B7280'
                  const timingLabel = row.shiftDetails?.normalTiming
                    ? `${fmt12(row.shiftDetails.normalTiming.startTime)} – ${fmt12(row.shiftDetails.normalTiming.endTime)}`
                    : 'Day-wise Config'
                  return (
                    <tr key={row.id} className="hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-4 pl-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isActive ? '#22C55E' : '#9CA3AF' }} />
                          <span className="text-sm font-semibold" style={{ color: PRIMARY }}>{row.shiftName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-white"
                          style={{ backgroundColor: row.shiftType === 'NORMAL' ? PRIMARY : '#111827' }}>
                          {row.shiftType}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">{timingLabel}</td>
                      <td className="px-4 py-4 text-xs font-medium text-gray-700">{row.effectiveFrom}</td>
                      <td className="px-4 py-4 text-xs text-gray-500">{row.effectiveTo ?? '—'}</td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: statusBg, color: statusClr }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination current={page} total={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  )
}