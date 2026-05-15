// src/pages/leave/tabs/LeaveOverviewTab.jsx
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search, Filter, Eye, ChevronLeft, ChevronRight,
  Check, X, Clock, Users, CalendarCheck, CalendarX,
} from 'lucide-react'
import FilterModal from '@/components/shared/FilterModal'
import ConfirmModal from '@/components/shared/ConfirmModal'
import LeaveRequestDetailModal from '../modals/LeaveRequestDetailModal'
import RejectReasonModal from '../modals/RejectReasonModal'
import { useLeaveRequests } from '@/hooks/leave/useLeave'
import { useAuthStore } from '@/store/authStore'

const PRIMARY   = '#C35E33'
const PAGE_SIZE = 10

const FILTER_CONFIG = [
  { key: 'status',    label: 'Status',     type: 'multi',  options: ['PENDING', 'APPROVED', 'REJECTED'] },
  { key: 'leaveType', label: 'Leave Type', type: 'select', options: ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Annual Leave'] },
  { key: 'dept',      label: 'Department', type: 'select', options: ['IT Department', 'HR Department', 'Engineering', 'Marketing', 'Finance'] },
  { key: 'dateFrom',  label: 'Date From',  type: 'date' },
  { key: 'dateTo',    label: 'Date To',    type: 'date' },
]

const STATUS_MAP = {
  APPROVED:             { label: 'Approved',            bg: '#DCFCE7', color: '#15803D' },
  REJECTED:             { label: 'Rejected',            bg: '#FEE2E2', color: '#DC2626' },
  PENDING:              { label: 'Pending',             bg: '#F3F4F6', color: '#374151' },
  CANCELLED:            { label: 'Cancelled',           bg: '#FEF9C3', color: '#854D0E' },
  WAITING_FOR_DOCUMENT: { label: 'Waiting for Docs',   bg: '#EFF6FF', color: '#1D4ED8' },
}

// ── Format ISO datetime → "13 May 2026, 05:28 PM" ─────────────────────────────
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
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

function Pagination({ current, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1)
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
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
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
          onClick={() => onChange(current + 1)}
          disabled={current === Math.ceil(total / pageSize)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {Array.from({ length: 9 }).map((_, j) => (
        <td key={j} className="px-3.5 py-4 border-b border-gray-50">
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </td>
      ))}
    </tr>
  ))
}

export default function LeaveOverviewTab() {
  const { records, loading, totalElements, fetchAll, approve, reject } = useLeaveRequests()
  const { id: currentUserId, role } = useAuthStore((s) => s)
  const isAdmin = role === 'ADMIN'
  const isHR    = role === 'HR'

  const [search,          setSearch]          = useState('')
  const [activeTab,       setActiveTab]       = useState('All')
  const [showFilter,      setShowFilter]      = useState(false)
  const [activeFilters,   setActiveFilters]   = useState({})
  const [currentPage,     setCurrentPage]     = useState(1)
  const [detailRecord,    setDetailRecord]    = useState(null)
  const [confirmApprove,  setConfirmApprove]  = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(null)
  const [actionLoading,   setActionLoading]   = useState(false)

  // Re-fetch when page changes
  useEffect(() => { fetchAll(currentPage - 1, PAGE_SIZE) }, [currentPage]) // eslint-disable-line

  // ── Tabs with live counts ────────────────────────────────────────────────────
  const tabs = useMemo(() => {
    const counts = records.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {})
    return [
      { key: 'All',      label: 'All',      count: records.length        },
      { key: 'PENDING',  label: 'Pending',  count: counts.PENDING  || 0 },
      { key: 'APPROVED', label: 'Approved', count: counts.APPROVED || 0 },
      { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED || 0 },
    ]
  }, [records])

  // ── Stats cards ──────────────────────────────────────────────────────────────
  const statsData = useMemo(() => [
    {
      label: 'Total Requests',
      value: totalElements,
      color: '#111827', bg: '#F3F4F6',
      icon: <Users size={16} color="#111827" strokeWidth={1.8} />,
    },
    {
      label: 'Pending',
      value: records.filter((r) => r.status === 'PENDING').length,
      color: '#374151', bg: '#F3F4F6',
      icon: <Clock size={16} color="#374151" strokeWidth={1.8} />,
    },
    {
      label: 'Approved',
      value: records.filter((r) => r.status === 'APPROVED').length,
      color: '#15803D', bg: '#DCFCE7',
      icon: <CalendarCheck size={16} color="#15803D" strokeWidth={1.8} />,
    },
    {
      label: 'Rejected',
      value: records.filter((r) => r.status === 'REJECTED').length,
      color: '#DC2626', bg: '#FEE2E2',
      icon: <CalendarX size={16} color="#DC2626" strokeWidth={1.8} />,
    },
  ], [records, totalElements])

  // ── Client-side filter (search + tab + filters) ───────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records.filter((r) => {
      const tabMatch    = activeTab === 'All' || r.status === activeTab
      // ✅ FIX: use r.employeeName (not r.name)
      const searchMatch = !q
        || r.employeeName?.toLowerCase().includes(q)
        || r.employeeCode?.toLowerCase().includes(q)
      const statusMatch = !activeFilters.status?.length || activeFilters.status.includes(r.status)
      const typeMatch   = !activeFilters.leaveType || r.leaveType === activeFilters.leaveType
      return tabMatch && searchMatch && statusMatch && typeMatch
    })
  }, [activeTab, search, activeFilters, records])

  const filterCount = Object.values(activeFilters)
    .filter((v) => (Array.isArray(v) ? v.length > 0 : !!v)).length

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = useCallback(async (id) => {
    setActionLoading(true)
    try {
      await approve(id, currentUserId)
      setConfirmApprove(null)
      if (detailRecord?.id === id) setDetailRecord((p) => ({ ...p, status: 'APPROVED' }))
    } finally {
      setActionLoading(false)
    }
  }, [approve, currentUserId, detailRecord])

  const handleReject = useCallback(async (id, reason) => {
    setActionLoading(true)
    try {
      await reject(id, reason)
      setShowRejectModal(null)
      if (detailRecord?.id === id) setDetailRecord((p) => ({ ...p, status: 'REJECTED' }))
    } finally {
      setActionLoading(false)
    }
  }, [reject, detailRecord])

  return (
    <>
      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statsData.map(({ label, value, color, bg, icon }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-2.5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: bg }}
            >
              {icon}
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setCurrentPage(1) }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border transition-all whitespace-nowrap"
              style={{
                borderColor:     activeTab === key ? '#111827' : '#E5E7EB',
                color:           activeTab === key ? '#111827' : '#6B7280',
                backgroundColor: activeTab === key ? '#F9FAFB' : '#fff',
                fontWeight:      activeTab === key ? 600       : 500,
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

        {/* Search + Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text">
            <Search size={13} color="#9CA3AF" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-36 sm:w-44"
            />
          </label>
          <button
            onClick={() => setShowFilter(true)}
            className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-9 text-[13px] font-medium cursor-pointer hover:bg-gray-50"
            style={{
              borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB',
              color:       filterCount > 0 ? PRIMARY : '#374151',
            }}
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
          <table className="w-full border-collapse" style={{ minWidth: 920 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {[
                  'Employee ID', 'Employee Name', 'Designation',
                  'Department', 'Leave Type', 'Days',
                  'Applied On', 'Status', 'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3.5 py-3.5 text-left text-xs font-semibold whitespace-nowrap text-white"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                  >
                    {/* Employee ID */}
                    <td
                      className="px-3.5 py-4 text-[11px] font-bold border-b border-gray-50 whitespace-nowrap"
                      style={{ color: PRIMARY }}
                    >
                      {rec.employeeCode || '—'}
                    </td>

                    {/* Employee Name + Avatar */}
                    <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: PRIMARY }}
                        >
                          {/* ✅ FIX: rec.employeeName (was rec.name) */}
                          {rec.employeeName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="text-[13px] font-semibold text-gray-900">
                          {/* ✅ FIX: rec.employeeName (was rec.name) */}
                          {rec.employeeName || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">
                      {rec.designation || '—'}
                    </td>

                    {/* Department */}
                    <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">
                      {rec.department || '—'}
                    </td>

                    {/* Leave Type */}
                    <td className="px-3.5 py-4 text-[12px] font-medium text-gray-800 border-b border-gray-50 whitespace-nowrap">
                      {rec.leaveType || '—'}
                    </td>

                    {/* Days */}
                    <td
                      className="px-3.5 py-4 text-[12px] font-bold border-b border-gray-50 whitespace-nowrap"
                      style={{ color: PRIMARY }}
                    >
                      {/* ✅ FIX: rec.totalDays (was rec.days) */}
                      {rec.totalDays ?? '—'}
                    </td>

                    {/* Applied On */}
                    <td className="px-3.5 py-4 text-[12px] text-gray-500 border-b border-gray-50 whitespace-nowrap">
                      {/* ✅ FIX: formatted ISO datetime (was raw string) */}
                      {formatDate(rec.appliedOn)}
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-4 border-b border-gray-50 whitespace-nowrap">
                      <StatusBadge status={rec.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5">
                        {rec.status === 'PENDING' && (isAdmin || isHR) && (
                          <>
                            <button
                              onClick={() => setConfirmApprove(rec)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-all"
                              title="Approve"
                            >
                              <Check size={13} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => setShowRejectModal(rec)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                              title="Reject"
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDetailRecord(rec)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] hover:bg-orange-50 transition-all"
                          title="View Details"
                        >
                          <Eye size={13} strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          current={currentPage}
          total={totalElements}
          pageSize={PAGE_SIZE}
          onChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {detailRecord && (
        <LeaveRequestDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onApprove={
            (isAdmin || isHR)
              ? (id) => setConfirmApprove(records.find((r) => r.id === id))
              : undefined
          }
          onReject={
            (isAdmin || isHR)
              ? (id) => setShowRejectModal(records.find((r) => r.id === id))
              : undefined
          }
        />
      )}

      {/* ── Approve Confirm Modal ──────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!confirmApprove}
        onClose={() => setConfirmApprove(null)}
        onConfirm={() => handleApprove(confirmApprove?.id)}
        title="Approve Leave"
        description={
          <>
            {/* ✅ FIX: confirmApprove?.employeeName (was confirmApprove?.name) */}
            Approve leave request for <strong>{confirmApprove?.employeeName}</strong>?
            <br />
            <span className="text-xs text-gray-400 mt-1 inline-block">
              {/* ✅ FIX: confirmApprove?.totalDays (was confirmApprove?.days) */}
              {confirmApprove?.leaveType} · {confirmApprove?.totalDays} day(s)
            </span>
          </>
        }
        confirmLabel="Approve"
        variant="info"
        loading={actionLoading}
      />

      {/* ── Reject Reason Modal ────────────────────────────────────────────── */}
      {showRejectModal && (
        <RejectReasonModal
          record={showRejectModal}
          onClose={() => setShowRejectModal(null)}
          onConfirm={(reason) => handleReject(showRejectModal.id, reason)}
          loading={actionLoading}
        />
      )}

      {/* ── Filter Modal ───────────────────────────────────────────────────── */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(f) => { setActiveFilters(f); setCurrentPage(1) }}
        onReset={() => { setActiveFilters({}); setCurrentPage(1) }}
        config={FILTER_CONFIG}
      />
    </>
  )
}