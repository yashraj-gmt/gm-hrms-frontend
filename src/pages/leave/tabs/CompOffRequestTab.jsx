// src/pages/leave/tabs/CompOffRequestTab.jsx

import { useState, useMemo } from 'react'
import {
  Plus, Filter, Search, Eye, Check, X,
  ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react'
import { useCompOff }   from '@/hooks/leave/useCompOff'
import { useAuthStore } from '@/store/authStore'
import { ROLES }        from '@/constants/roles'
import FilterModal      from '@/components/shared/FilterModal'
import ConfirmModal     from '@/components/shared/ConfirmModal'
import CompOffDetailModal from '../modals/CompOffDetailModal'
import ApplyCompOffModal  from '../modals/ApplyCompOffModal'
 
const PRIMARY = '#C35E33'
const PAGE_SIZE = 10
 
const STATUS_MAP = {
  APPROVED: { label: 'Approved', bg: '#DCFCE7', color: '#15803D' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
  PENDING:  { label: 'Pending',  bg: '#F3F4F6', color: '#374151' },
}
 
const FILTER_CONFIG = [
  { key: 'status',   label: 'Status',    type: 'multi', options: ['PENDING', 'APPROVED', 'REJECTED'] },
  { key: 'dateFrom', label: 'Date From', type: 'date' },
  { key: 'dateTo',   label: 'Date To',   type: 'date' },
]
 
function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: '#F3F4F6', color: '#374151' }
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >{s.label}</span>
  )
}
 
function Pagination({ page, totalPages, totalElements, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing{' '}
        <span className="font-semibold text-gray-800">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)}</span>{' '}
        of <span className="font-semibold text-gray-800">{totalElements}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
          return (
            <button key={p} onClick={() => onChange(p)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
              style={{ borderColor: page === p ? PRIMARY : '#E5E7EB', backgroundColor: page === p ? PRIMARY : 'transparent', color: page === p ? '#fff' : '#6B7280' }}>
              {p + 1}
            </button>
          )
        })}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
 
export function CompOffRequestTab() {
  const { user }  = useAuthStore()
  const isAdminHR = user?.role === ROLES.ADMIN || user?.role === ROLES.HR
  const isEmployee= !isAdminHR
 
  const {
    records, loading, saving, actionLoading,
    totalPages, totalElements, page, setPage,
    apply, approve, reject, refresh,
  } = useCompOff()
 
  const [search,        setSearch]        = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [detailRecord,  setDetailRecord]  = useState(null)
  const [showApply,     setShowApply]     = useState(false)
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget,  setRejectTarget]  = useState(null)
 
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records.filter((r) => {
      const searchMatch = !q ||
        r.name?.toLowerCase().includes(q) ||
        r.employeeCode?.toLowerCase().includes(q)
      const statusMatch = !activeFilters.status?.length || activeFilters.status.includes(r.status)
      return searchMatch && statusMatch
    })
  }, [records, search, activeFilters])
 
  const filterCount = Object.values(activeFilters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v).length
 
  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text flex-1 max-w-xs">
          <Search size={13} color="#9CA3AF" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full" />
        </label>
 
        <button onClick={() => setShowFilter(true)}
          className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-9 text-[13px] font-medium hover:bg-gray-50 transition-colors"
          style={{ borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB', color: filterCount > 0 ? PRIMARY : '#374151' }}>
          <Filter size={13} strokeWidth={2} />
          Filter
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}>{filterCount}</span>
          )}
        </button>
 
        <button onClick={refresh}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-[#C35E33] hover:border-[#C35E33] transition-all"
          title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
 
        {/* Employees can apply; Admin/HR can also add on behalf */}
        <button onClick={() => setShowApply(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: PRIMARY }}>
          <Plus size={14} /> {isEmployee ? 'Apply Comp Off' : 'New Comp Off'}
        </button>
      </div>
 
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 760 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Employee ID', 'Employee Name', 'Worked Date', 'Earned Days', 'Total Hours', 'Reason', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-3.5 py-3.5 text-left text-xs font-semibold whitespace-nowrap text-white">{h}</th>
                ))}
              </tr>
            </thead>
 
            {loading ? (
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-3.5 py-4 border-b border-gray-50">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : filtered.length === 0 ? (
              <tbody>
                <tr><td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">No comp-off requests found.</td></tr>
              </tbody>
            ) : (
              <tbody>
                {filtered.map((r, idx) => {
                  const isActing = actionLoading === r.id
                  return (
                    <tr key={r.id}
                      className="hover:bg-orange-50 transition-colors"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-3.5 py-4 text-[11px] font-bold border-b border-gray-50 whitespace-nowrap" style={{ color: PRIMARY }}>
                        {r.employeeCode ?? '—'}
                      </td>
                      <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: PRIMARY }}>
                            {(r.name ?? r.personalName ?? '?')[0]}
                          </div>
                          <span className="text-[13px] font-semibold text-gray-900">{r.name ?? r.personalName}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">
                        {r.workedDate}
                      </td>
                      <td className="px-3.5 py-4 text-[12px] font-bold border-b border-gray-50 whitespace-nowrap" style={{ color: PRIMARY }}>
                        {r.earnedDays} {r.earnedDays === 1 || r.earnedDays === 0.5 ? 'Day' : 'Days'}
                      </td>
                      <td className="px-3.5 py-4 text-[12px] text-gray-700 border-b border-gray-50">
                        {r.totalHours ? `${r.totalHours}h` : '—'}
                      </td>
                      <td className="px-3.5 py-4 text-[12px] text-gray-500 border-b border-gray-50 max-w-[160px] truncate">
                        {r.reason}
                      </td>
                      <td className="px-3.5 py-4 border-b border-gray-50">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3.5 py-4 border-b border-gray-50">
                        <div className="flex items-center gap-1.5">
                          {/* Admin/HR approve/reject for PENDING */}
                          {isAdminHR && r.status === 'PENDING' && (
                            <>
                              <button onClick={() => setApproveTarget(r.id)} disabled={isActing}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-all disabled:opacity-40"
                                title="Approve">
                                {isActing
                                  ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                  : <Check size={13} strokeWidth={2.5} />}
                              </button>
                              <button onClick={() => setRejectTarget(r.id)} disabled={isActing}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                                title="Reject">
                                <X size={13} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                          <button onClick={() => setDetailRecord(r)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] hover:bg-orange-50 transition-all"
                            title="View Details">
                            <Eye size={13} strokeWidth={1.8} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />
      </div>
 
      {/* Apply Modal */}
      <ApplyCompOffModal
        isOpen={showApply}
        onClose={() => setShowApply(false)}
        onSubmit={async (dto) => { const ok = await apply(dto); if (ok) setShowApply(false) }}
        saving={saving}
      />
 
      {/* Detail Modal */}
      {detailRecord && (
        <CompOffDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      )}
 
      {/* Approve confirm */}
      <ConfirmModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => { await approve(approveTarget); setApproveTarget(null) }}
        title="Approve Comp Off"
        description="This will credit the earned days to the employee's comp-off balance."
        confirmLabel="Approve"
        variant="info"
        loading={actionLoading === approveTarget}
      />
 
      {/* Reject confirm */}
      <ConfirmModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={async () => { await reject(rejectTarget); setRejectTarget(null) }}
        title="Reject Comp Off"
        description="Are you sure you want to reject this comp-off request?"
        confirmLabel="Reject"
        variant="danger"
        loading={actionLoading === rejectTarget}
      />
 
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
 
export default CompOffRequestTab