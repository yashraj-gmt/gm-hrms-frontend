// ─────────────────────────────────────────────────────────────────────────────
// Part 5: src/pages/leave/tabs/LeaveBalanceTab.jsx
// Leave Balance – API-integrated, filterable, paginated
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react'
import {
  Search, Filter, ChevronLeft, ChevronRight,
  RefreshCw, TrendingDown, TrendingUp, BarChart2,
} from 'lucide-react'
import { useLeaveBalance } from '@/hooks/leave/useLeaveBalance'
import FilterModal         from '@/components/shared/FilterModal'

const PRIMARY = '#C35E33'

// ─── Filter config ────────────────────────────────────────────────────────────
const FILTER_CONFIG = [
  {
    key: 'leaveTypeCode', label: 'Leave Type', type: 'multi',
    options: ['CL', 'SL', 'EL', 'AL', 'CO'],
  },
  {
    key: 'departmentId', label: 'Department', type: 'select',
    options: ['Engineering', 'Sales', 'IT', 'Marketing', 'HR', 'Finance'],
  },
  { key: 'year', label: 'Year', type: 'select', options: ['2026', '2025', '2024'] },
]

// ─── Usage bar ───────────────────────────────────────────────────────────────
function UsageBar({ used, total }) {
  const pct   = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const color = pct >= 90 ? '#DC2626' : pct >= 60 ? PRIMARY : '#16A34A'
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color }}>
        {Math.round(pct)}%
      </span>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, totalElements, pageSize, onChange }) {
  if (totalPages <= 1) return null
  const start = page * pageSize + 1
  const end   = Math.min((page + 1) * pageSize, totalElements)

  const pages = useMemo(() => {
    const arr = []
    const max = Math.min(totalPages, 5)
    let s     = Math.max(0, Math.min(page - 2, totalPages - max))
    for (let i = 0; i < max; i++) arr.push(s + i)
    return arr
  }, [page, totalPages])

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-800">{start}–{end}</span>{' '}
        of <span className="font-semibold text-gray-800">{totalElements}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"
        ><ChevronLeft size={14} /></button>
        {pages.map((p) => (
          <button
            key={p} onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
            style={{
              borderColor:     page === p ? PRIMARY : '#E5E7EB',
              backgroundColor: page === p ? PRIMARY : 'transparent',
              color:           page === p ? '#fff'  : '#6B7280',
            }}
          >{p + 1}</button>
        ))}
        <button
          onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"
        ><ChevronRight size={14} /></button>
      </div>
    </div>
  )
}

// ─── Summary stats ────────────────────────────────────────────────────────────
function BalanceSummary({ balances }) {
  const stats = useMemo(() => {
    const total     = balances.reduce((s, b) => s + (b.totalLeaves     ?? 0), 0)
    const used      = balances.reduce((s, b) => s + (b.usedLeaves      ?? 0), 0)
    const remaining = balances.reduce((s, b) => s + (b.remainingLeaves ?? 0), 0)
    return { total, used, remaining }
  }, [balances])

  const cards = [
    { label: 'Total Allocated', value: stats.total,     icon: BarChart2,   color: '#111827', bg: '#F3F4F6' },
    { label: 'Total Used',      value: stats.used,      icon: TrendingDown,color: PRIMARY,   bg: '#F5EBE5' },
    { label: 'Total Remaining', value: stats.remaining, icon: TrendingUp,  color: '#15803D', bg: '#DCFCE7' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
            <Icon size={16} color={color} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────
export default function LeaveBalanceTab() {
  const {
    balances, loading, totalElements, totalPages, page,
    setPage, applyFilter, refresh,
  } = useLeaveBalance()

  const [search,        setSearch]        = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})

  // Client-side search on top of API results
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return balances
    return balances.filter(
      (b) =>
        b.employeeName?.toLowerCase().includes(q) ||
        b.employeeCode?.toLowerCase().includes(q) ||
        b.leaveTypeCode?.toLowerCase().includes(q),
    )
  }, [balances, search])

  const filterCount = Object.values(activeFilters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v,
  ).length

  const handleApplyFilter = useCallback((f) => {
    setActiveFilters(f)
    // Map UI filter keys → backend DTO keys
    const dto = {}
    if (f.leaveTypeCode?.length) dto.leaveTypeCodes = f.leaveTypeCode
    if (f.departmentId)          dto.departmentName  = f.departmentId
    if (f.year)                  dto.year            = Number(f.year)
    applyFilter(dto)
  }, [applyFilter])

  const handleReset = useCallback(() => {
    setActiveFilters({})
    applyFilter({})
  }, [applyFilter])

  return (
    <>
      {/* Summary */}
      <BalanceSummary balances={filtered} />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text flex-1 max-w-xs">
          <Search size={13} color="#9CA3AF" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or leave type…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full"
          />
        </label>

        <button
          onClick={() => setShowFilter(true)}
          className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-9 text-[13px] font-medium hover:bg-gray-50 transition-colors"
          style={{ borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB', color: filterCount > 0 ? PRIMARY : '#374151' }}
        >
          <Filter size={13} strokeWidth={2} />
          Filter
          {filterCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}
            >{filterCount}</span>
          )}
        </button>

        <button
          onClick={refresh}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-[#C35E33] hover:border-[#C35E33] transition-all"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 820 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Employee Name', 'Employee ID', 'Designation', 'Department', 'Leave Type', 'Total', 'Used', 'Remaining', 'Year', 'Usage'].map((h) => (
                  <th key={h} className="px-3.5 py-3.5 text-left text-xs font-semibold whitespace-nowrap text-white">{h}</th>
                ))}
              </tr>
            </thead>

            {loading ? (
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-3.5 py-3.5 border-b border-gray-50">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : filtered.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm text-gray-400">
                    No leave balance records found.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {filtered.map((b, idx) => {
                  const remaining = b.remainingLeaves ?? 0
                  const total     = b.totalLeaves ?? 0
                  const isLow     = total > 0 && remaining / total < 0.2

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-orange-50 transition-colors"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                    >
                      {/* Employee Name */}
                      <td className="px-3.5 py-3.5 border-b border-gray-50 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: PRIMARY }}
                          >
                            {(b.employeeName ?? b.personalName ?? '?')[0]}
                          </div>
                          <span className="text-[13px] font-semibold text-gray-900">
                            {b.employeeName ?? b.personalName ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 text-[11px] font-bold border-b border-gray-50 whitespace-nowrap" style={{ color: PRIMARY }}>
                        {b.employeeCode ?? '—'}
                      </td>
                      <td className="px-3.5 py-3.5 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">
                        {b.designation ?? '—'}
                      </td>
                      <td className="px-3.5 py-3.5 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">
                        {b.department ?? '—'}
                      </td>
                      {/* Leave type badge */}
                      <td className="px-3.5 py-3.5 border-b border-gray-50">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#F5EBE5', color: PRIMARY }}
                        >
                          {b.leaveTypeCode ?? b.leaveTypeName ?? '—'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5 text-[12px] font-bold text-gray-800 border-b border-gray-50">{total}</td>
                      <td className="px-3.5 py-3.5 text-[12px] font-bold border-b border-gray-50" style={{ color: PRIMARY }}>
                        {b.usedLeaves ?? 0}
                      </td>
                      <td className="px-3.5 py-3.5 text-[12px] font-bold border-b border-gray-50" style={{ color: isLow ? '#DC2626' : '#15803D' }}>
                        {remaining}
                        {isLow && <span className="ml-1 text-[9px] font-normal text-red-400">(Low)</span>}
                      </td>
                      <td className="px-3.5 py-3.5 text-[12px] text-gray-500 border-b border-gray-50">{b.year}</td>
                      <td className="px-3.5 py-3.5 border-b border-gray-50" style={{ minWidth: 110 }}>
                        <UsageBar used={b.usedLeaves ?? 0} total={total} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={10}
          onChange={setPage}
        />
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilter}
        onReset={handleReset}
        config={FILTER_CONFIG}
      />
    </>
  )
}