import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Search, Filter, MoreVertical, Plus, Clock, Users,
  CheckCircle, Eye, Edit2, Trash2, ToggleLeft,
  ChevronLeft, ChevronRight, RefreshCw, X,
} from 'lucide-react'
import FilterModal  from '@/components/shared/FilterModal'
import ConfirmModal from '@/components/shared/ConfirmModal'
import DateFilter   from '@/components/shared/DateFilter'      // ← existing component
import { useToast } from '@/components/shared/toast/ToastProvider'
import shiftService  from '@/services/shiftService'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'
const PAGE_SIZE    = 8

const FILTER_CONFIG = [
  { key: 'type',   label: 'Shift Type', type: 'multi', options: ['NORMAL', 'CUSTOM'] },
  { key: 'status', label: 'Status',     type: 'multi', options: ['Active', 'Inactive'] },
]

const STATUS_STYLE = {
  Active:   { bg: '#DCFCE7', color: '#15803D' },
  Inactive: { bg: '#FEE2E2', color: '#B91C1C' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function StatCard({ icon, value, label, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-3xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bg }}>
        {icon}
      </div>
    </div>
  )
}

// ── Portal-based Action Menu ──────────────────────────────────────────────────
function ActionMenu({ shift, onView, onEdit, onDelete, onToggle }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, right: 0 })
  const btnRef          = useRef(null)
  const menuRef         = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target))
        setOpen(false)
    }
    const scroll = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  const handleOpen = (e) => {
    e.stopPropagation()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(o => !o)
  }

  const items = [
    { icon: <Eye size={13} />,        label: 'View Details', action: onView   },
    { icon: <Edit2 size={13} />,       label: 'Edit Shift',   action: onEdit   },
    { icon: <ToggleLeft size={13} />,  label: shift.isActive ? 'Deactivate' : 'Activate', action: onToggle },
    { icon: <Trash2 size={13} />,      label: 'Delete',       action: onDelete, danger: true },
  ]

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition-all">
        <MoreVertical size={14} />
      </button>

      {open && createPortal(
        <div ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999,
                   background: '#fff', border: '1px solid #F3F4F6', borderRadius: 12,
                   boxShadow: '0 8px 24px rgba(0,0,0,0.10)', width: 176, overflow: 'hidden' }}>
          {items.map(({ icon, label, action, danger }) => (
            <button key={label}
              onClick={(e) => { e.stopPropagation(); action?.(); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                       padding: '10px 16px', fontSize: 12, fontWeight: 500, border: 'none',
                       cursor: 'pointer', textAlign: 'left', background: 'transparent',
                       color: danger ? '#B91C1C' : '#374151' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {icon}{label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
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
            style={{ borderColor: current === p ? PRIMARY : '#E5E7EB',
                     backgroundColor: current === p ? PRIMARY : 'transparent',
                     color: current === p ? '#fff' : '#6B7280' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(current + 1)} disabled={current === Math.ceil(total / pageSize)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-400 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ShiftManagement() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [shifts,        setShifts]        = useState([])
  const [loading,       setLoading]       = useState(false)
  const [totalElements, setTotalElements] = useState(0)
  const [page,          setPage]          = useState(1)

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState('')
  const [activeTab,     setActiveTab]     = useState('All')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [dateRange,     setDateRange]     = useState({ start: null, end: null, label: null })

  // ── Confirm modals ────────────────────────────────────────────────────────
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [toggleTarget,  setToggleTarget]  = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchShifts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await shiftService.getAll(page - 1, PAGE_SIZE)
      setShifts(res.data?.content ?? [])
      setTotalElements(res.data?.totalElements ?? 0)
    } catch (err) {
      toast.error(err?.message || 'Failed to load shifts', 'Error')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = async () => {
    if (!toggleTarget) return
    setActionLoading(true)
    try {
      await shiftService.toggleStatus(toggleTarget.id)
      toast.success(
        `${toggleTarget.shiftName} ${toggleTarget.isActive ? 'deactivated' : 'activated'}`,
        toggleTarget.isActive ? 'Shift Deactivated' : 'Shift Activated'
      )
      fetchShifts()
      setToggleTarget(null)
    } catch (err) {
      toast.error(err?.message || 'Failed to update status', 'Error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await shiftService.delete(deleteTarget.id)
      toast.success(`${deleteTarget.shiftName} deleted`, 'Shift Deleted')
      fetchShifts()
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err?.message || 'Failed to delete shift', 'Error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDateChange = ({ start, end, label }) => {
    setDateRange({ start, end, label })
    setPage(1)
  }

  const clearAllFilters = () => {
    setSearch('')
    setActiveTab('All')
    setActiveFilters({})
    setDateRange({ start: null, end: null, label: null })
    setPage(1)
  }

  // ── Client-side filter (on top of server page) ────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return shifts.filter(s => {
      // Tab
      const tabMatch = activeTab === 'All'
        || s.shiftType === activeTab
        || (activeTab === 'Active'   && s.isActive)
        || (activeTab === 'Inactive' && !s.isActive)

      // Search
      const srchMatch = !q || s.shiftName?.toLowerCase().includes(q)

      // Filter modal
      const typeMatch = !activeFilters.type?.length
        || activeFilters.type.includes(s.shiftType)
      const statMatch = !activeFilters.status?.length
        || activeFilters.status.some(v =>
            (v === 'Active' && s.isActive) || (v === 'Inactive' && !s.isActive))

      // Date range — filter by createdAt
      let dateMatch = true
      if (dateRange.start && s.createdAt) {
        const created = new Date(s.createdAt)
        created.setHours(0, 0, 0, 0)
        const start = new Date(dateRange.start); start.setHours(0, 0, 0, 0)
        const end   = dateRange.end
          ? new Date(dateRange.end)
          : new Date(dateRange.start)
        end.setHours(23, 59, 59, 999)
        dateMatch = created >= start && created <= end
      }

      return tabMatch && srchMatch && typeMatch && statMatch && dateMatch
    })
  }, [shifts, search, activeTab, activeFilters, dateRange])

  const tabs         = ['All', 'NORMAL', 'CUSTOM', 'Active', 'Inactive']
  const filterCount  = Object.values(activeFilters).filter(v =>
    Array.isArray(v) ? v.length > 0 : !!v).length
  const hasDateFilter = Boolean(dateRange.start)
  const totalActive  = shifts.filter(s => s.isActive).length
  const normalCount  = shifts.filter(s => s.shiftType === 'NORMAL').length
  const customCount  = shifts.filter(s => s.shiftType === 'CUSTOM').length
  const hasAnyFilter = search || hasDateFilter || filterCount > 0 || activeTab !== 'All'

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Shift Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Configure and manage all employee shifts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/shifts/assign')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer transition-colors"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = PRIMARY_DARK}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}>
            <Users size={15} />Assign Shift
          </button>
          <button onClick={() => navigate('/shifts/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#111827'}>
            <Plus size={15} strokeWidth={2.5} />New Shift
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon={<Clock size={18} color={PRIMARY} />}        value={shifts.length} label="Total Shifts"  color="#111827" bg="#FDE8DD" />
        <StatCard icon={<Clock size={18} color="#1D4ED8" />}        value={normalCount}   label="Normal Shifts" color="#1D4ED8" bg="#DBEAFE" />
        <StatCard icon={<Users size={18} color="#7C3AED" />}        value={customCount}   label="Custom Shifts" color="#7C3AED" bg="#F5F3FF" />
        <StatCard icon={<CheckCircle size={18} color="#15803D" />}  value={totalActive}   label="Active Shifts" color="#15803D" bg="#DCFCE7" />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map(key => (
            <button key={key} onClick={() => { setActiveTab(key); setPage(1) }}
              className="px-3.5 py-1.5 rounded-full text-xs border cursor-pointer transition-all whitespace-nowrap"
              style={{
                borderColor:     activeTab === key ? '#111827' : '#E5E7EB',
                color:           activeTab === key ? '#111827' : '#6B7280',
                backgroundColor: activeTab === key ? '#F9FAFB' : '#fff',
                fontWeight:      activeTab === key ? 600 : 500,
              }}>
              {key}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Search */}
          <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text">
            <Search size={13} color="#9CA3AF" />
            <input type="text" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search shifts…"
              className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-36 sm:w-44" />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X size={11} />
              </button>
            )}
          </label>

          {/* ── Date Filter (your existing component) ── */}
          <DateFilter onChange={handleDateChange} />

          {/* Refresh */}
          <button onClick={fetchShifts}
            className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
            title="Refresh">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Filter modal trigger */}
          <button onClick={() => setShowFilter(true)}
            className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-9 text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB',
                     color:       filterCount > 0 ? PRIMARY : '#374151' }}>
            <Filter size={13} />
            <span className="hidden sm:inline">Filter</span>
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: PRIMARY }}>{filterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Active filter pills row */}
      {hasAnyFilter && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] text-gray-400 font-medium">Active filters:</span>

          {activeTab !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
              style={{ backgroundColor: '#FDE8DD', color: PRIMARY, borderColor: PRIMARY }}>
              Type: {activeTab}
              <button onClick={() => setActiveTab('All')} className="ml-0.5 hover:opacity-70">
                <X size={9} />
              </button>
            </span>
          )}

          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
              style={{ backgroundColor: '#FDE8DD', color: PRIMARY, borderColor: PRIMARY }}>
              "{search}"
              <button onClick={() => setSearch('')} className="ml-0.5 hover:opacity-70">
                <X size={9} />
              </button>
            </span>
          )}

          {hasDateFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
              style={{ backgroundColor: '#FDE8DD', color: PRIMARY, borderColor: PRIMARY }}>
              {dateRange.label || 'Custom date'}
              <button onClick={() => setDateRange({ start: null, end: null, label: null })}
                className="ml-0.5 hover:opacity-70">
                <X size={9} />
              </button>
            </span>
          )}

          {filterCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
              style={{ backgroundColor: '#FDE8DD', color: PRIMARY, borderColor: PRIMARY }}>
              {filterCount} filter{filterCount > 1 ? 's' : ''} applied
              <button onClick={() => setActiveFilters({})} className="ml-0.5 hover:opacity-70">
                <X size={9} />
              </button>
            </span>
          )}

          <button onClick={clearAllFilters}
            className="text-[11px] text-gray-400 hover:text-red-500 underline transition-colors ml-auto">
            Clear all
          </button>

          <span className="text-[11px] text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} color={PRIMARY} className="animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 820 }}>
              <thead>
                <tr style={{ backgroundColor: PRIMARY }}>
                  {['Shift Name', 'Type', 'Timing', 'Grace / Late', 'Overtime', 'Status', 'Added On', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Clock size={28} color="#D1D5DB" />
                        <p className="text-sm text-gray-400">
                          {hasAnyFilter ? 'No shifts match your filters.' : 'No shifts found.'}
                        </p>
                        {hasAnyFilter && (
                          <button onClick={clearAllFilters}
                            className="text-xs font-semibold mt-1 underline"
                            style={{ color: PRIMARY }}>
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((shift, idx) => {
                  const statusKey = shift.isActive ? 'Active' : 'Inactive'
                  const ss        = STATUS_STYLE[statusKey]
                  const timing    = shift.normalTiming
                    ? `${shift.normalTiming.startTime} – ${shift.normalTiming.endTime}`
                    : 'Day-wise Config'

                  return (
                    <tr key={shift.id}
                      className="hover:bg-orange-50 transition-colors"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>

                      {/* Shift name */}
                      <td className="px-4 pl-5 py-4 border-b border-gray-50">
                        <p className="text-[13px] font-semibold text-gray-900">{shift.shiftName}</p>
                        <p className="text-[10px] mt-0.5 font-medium" style={{ color: PRIMARY }}>
                          #{String(shift.id).padStart(4, '0')}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-4 border-b border-gray-50">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white"
                          style={{ backgroundColor: shift.shiftType === 'NORMAL' ? PRIMARY : '#111827' }}>
                          {shift.shiftType}
                        </span>
                      </td>

                      {/* Timing */}
                      <td className="px-4 py-4 border-b border-gray-50 text-[12px] text-gray-600 whitespace-nowrap">
                        {timing}
                      </td>

                      {/* Grace / Late */}
                      <td className="px-4 py-4 border-b border-gray-50 text-[12px] text-gray-700 whitespace-nowrap font-medium">
                        {shift.graceMinutes ?? '—'}min / {shift.lateMarkAfterMinutes ?? '—'}min
                      </td>

                      {/* Overtime */}
                      <td className="px-4 py-4 border-b border-gray-50">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
                          style={{ backgroundColor: shift.overtimeAllowed ? PRIMARY : '#9CA3AF' }}>
                          {shift.overtimeAllowed ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 border-b border-gray-50">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: ss.bg, color: ss.color }}>
                          {statusKey}
                        </span>
                      </td>

                      {/* ── NEW: Added On column ── */}
                      <td className="px-4 py-4 border-b border-gray-50 whitespace-nowrap">
                        <p className="text-[12px] text-gray-700 font-medium">
                          {fmtDate(shift.createdAt)}
                        </p>
                        {shift.createdBy && (
                          <p className="text-[10px] text-gray-400 mt-0.5">by {shift.createdBy}</p>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4 border-b border-gray-50">
                        <ActionMenu
                          shift={shift}
                          onView={()   => navigate(`/shifts/${shift.id}`)}
                          onEdit={()   => navigate(`/shifts/${shift.id}/edit`)}
                          onToggle={()  => setToggleTarget(shift)}
                          onDelete={()  => setDeleteTarget(shift)}
                        />
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

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={f => { setActiveFilters(f); setPage(1) }}
        onReset={() => { setActiveFilters({}); setPage(1) }}
        config={FILTER_CONFIG}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Shift"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-800">"{deleteTarget?.shiftName}"</span>?
            <br />
            <span className="text-xs text-gray-400 mt-1 block">
              This performs a soft delete and can be reactivated later.
            </span>
          </>
        }
        confirmLabel="Delete Shift"
        variant="danger"
        loading={actionLoading}
      />

      {/* Toggle Status Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={toggleTarget?.isActive ? 'Deactivate Shift' : 'Activate Shift'}
        description={
          <>
            Are you sure you want to{' '}
            <span className="font-semibold text-gray-800">
              {toggleTarget?.isActive ? 'deactivate' : 'activate'}
            </span>{' '}
            <span className="font-semibold text-gray-800">"{toggleTarget?.shiftName}"</span>?
            {toggleTarget?.isActive && (
              <span className="text-xs text-gray-400 mt-1 block">
                Assigned employees will not be affected until their next assignment.
              </span>
            )}
          </>
        }
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.isActive ? 'warning' : 'info'}
        loading={actionLoading}
      />
    </>
  )
}