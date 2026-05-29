// src/pages/employee/EmployeeList.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Filter, Search, UserPlus, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Trash2, ChevronDown,
  Eye, Pencil, RefreshCw, X,
} from 'lucide-react'
import FilterModal   from '@/components/shared/FilterModal'
import ConfirmModal  from '@/components/shared/ConfirmModal'
import { useToast }  from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import profileIcon from '@/assets/images/profile-icon.png'
import { ROUTES } from '@/constants/routes'
import employeeService, {
  STATUS_TO_API, API_TO_STATUS, TYPE_TO_API, API_TO_TYPE,
} from '@/services/employeeService'

const PRIMARY  = '#C35E33'
const ROLES    = { ADMIN: 'ADMIN', HR: 'HR' }
const PAGE_SIZES   = [10, 25, 50, 100]
const FILTER_TABS  = ['All', 'Internship', 'Training', 'Employee', 'Draft']

const FILTER_CONFIG = [
  { key: 'status', label: 'Status',      type: 'multi',  options: ['Active', 'Inactive', 'Hold'] },
  { key: 'type',   label: 'Type',        type: 'multi',  options: ['Employee', 'Internship', 'Training'] },
  { key: 'dept',   label: 'Department',  type: 'select', options: ['IT-Based', 'HR', 'Finance', 'Marketing'] },
  { key: 'from',   label: 'Joined From', type: 'date'  },
  { key: 'to',     label: 'Joined To',   type: 'date'  },
]

// ─── Role-aware navigation helper ─────────────────────────────────────────────
/**
 * Returns the correct route path based on action + employment type.
 * Accepts both raw API values ('TRAINEE', 'INTERN', 'EMPLOYEE')
 * and display labels ('Training', 'Internship', 'Employee').
 *
 * @param {'View'|'Edit'|'Draft'} action
 * @param {string|number} id      — employee record ID
 * @param {string}        type    — raw or display employment type
 * @param {boolean}       isDraft — whether the record is a draft
 * @returns {string} resolved path
 */
function resolveRoute(action, id, type, isDraft = false) {
  const isTrainee = type === 'Training'   || type === 'TRAINEE'
  const isIntern  = type === 'Internship' || type === 'INTERN'

  switch (action) {
    case 'View':
      if (isTrainee) return ROUTES.EMPLOYEE_TRAINEE_VIEW.replace(':id', id)
      // if (isIntern) return ROUTES.EMPLOYEE_INTERN_VIEW.replace(':id', id)
      return ROUTES.EMPLOYEE_VIEW.replace(':id', id)

    case 'Edit':
      if (isTrainee) return ROUTES.EMPLOYEE_TRAINEE_EDIT.replace(':id', id)  // ← FIX
      // if (isIntern) return ROUTES.EMPLOYEE_INTERN_EDIT.replace(':id', id)
      return ROUTES.EMPLOYEE_EDIT.replace(':id', id)

    case 'Draft':
      if (isTrainee) return ROUTES.EMPLOYEE_TRAINEE_DRAFT.replace(':id', id) // ← FIX
      // if (isIntern) return ROUTES.EMPLOYEE_INTERN_DRAFT.replace(':id', id)
      return ROUTES.EMPLOYEE_DRAFT.replace(':id', id)

    default:
      return ROUTES.EMPLOYEE_VIEW.replace(':id', id)
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Active:   { bg: '#DCFCE7', color: '#15803D' },
    Inactive: { bg: '#FEE2E2', color: '#B91C1C' },
    Hold:     { bg: '#1F2937', color: '#FFFFFF' },
  }
  const s = map[status] ?? map.Hold
  return (
    <span
      className="inline-flex px-3 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

// ─── Action dropdown (portal-based to avoid overflow clipping) ────────────────
// Now accepts `employeeType` and forwards it through onView/onEdit/onEditDraft
function ActionDropdown({
  employeeId,
  employeeType,       // ← NEW: raw or display employment type
  currentStatus,
  onStatusChange,
  onDelete,
  canDelete,
  isDraft,
  onView,
  onEdit,
  onEditDraft,
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const btnRef  = useRef(null)
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const h = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  // Close on scroll
  useEffect(() => {
    if (!open) return
    const h = () => setOpen(false)
    window.addEventListener('scroll', h, true)
    return () => window.removeEventListener('scroll', h, true)
  }, [open])

  // Smart viewport-aware positioning — flip menu above button if near bottom
  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuHeight = 260
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      let top
      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        top = rect.top - menuHeight - 4
      } else {
        top = rect.bottom + 4
      }

      setMenuPos({
        top,
        left: rect.right - 160,
      })
    }
    setOpen(v => !v)
  }

  const statusOptions = [
    { label: 'Active',   apiVal: 'ACTIVE',   dot: '#15803D' },
    { label: 'Inactive', apiVal: 'INACTIVE',  dot: '#B91C1C' },
    { label: 'Hold',     apiVal: 'ON_HOLD',   dot: '#1F2937' },
  ]

  // Filter out the current status so it won't appear as an option
  const filteredStatusOptions = statusOptions.filter(opt => opt.label !== currentStatus)

  const menu = open ? createPortal(
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top:      menuPos.top,
        left:     menuPos.left,
        zIndex:   9999,
        minWidth: 160,
      }}
      className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
    >
      {/* ── View / Edit Draft ── */}
      {isDraft ? (
        <button
          onClick={() => { onEditDraft(employeeId, employeeType); setOpen(false) }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-orange-50 transition-colors text-left"
          style={{ color: PRIMARY }}
        >
          <Pencil size={12} />
          Continue Editing
        </button>
      ) : (
        <>
          <button
            onClick={() => { onView(employeeId, employeeType); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors text-left text-gray-700"
          >
            <Eye size={12} />
            View
          </button>
          <button
            onClick={() => { onEdit(employeeId, employeeType); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-orange-50 transition-colors text-left"
            style={{ color: PRIMARY }}
          >
            <Pencil size={12} />
            Edit
          </button>
        </>
      )}

      {/* ── Status section (submitted only) ── */}
      {!isDraft && filteredStatusOptions.length > 0 && (
        <>
          <div className="h-px bg-gray-100 mx-3" />
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Set Status
          </p>
          {filteredStatusOptions.map(({ label, apiVal, dot }) => (
            <button
              key={label}
              onClick={() => { onStatusChange(employeeId, apiVal, label); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors text-left"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
              <span className="text-gray-700">{label}</span>
            </button>
          ))}
        </>
      )}

      {/* ── Delete (admin only) ── */}
      {canDelete && (
        <>
          <div className="h-px bg-gray-100 mx-3 my-1" />
          <button
            onClick={() => { onDelete(employeeId); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div data-action>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center gap-1 border rounded-md px-2.5 py-1 text-xs font-medium transition-all"
        style={{ borderColor: open ? PRIMARY : '#E5E7EB', color: open ? PRIMARY : '#6B7280' }}
      >
        •••
        <ChevronDown
          size={10} strokeWidth={2.5}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
        />
      </button>
      {menu}
    </div>
  )
}

// ─── Sortable column header ────────────────────────────────────────────────────
function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const isActive = sortBy === field
  return (
    <button
      className="inline-flex items-center gap-1 font-semibold transition-opacity hover:opacity-80"
      style={{ color: PRIMARY }}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive
        ? sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
        : <ArrowUpDown size={10} style={{ opacity: 0.4 }} />
      }
    </button>
  )
}

// ─── Pagination bar ───────────────────────────────────────────────────────────
function Pagination({ current, totalElements, pageSize, onPageChange, onSizeChange }) {
  const totalPages = Math.ceil(totalElements / pageSize)
  if (totalPages <= 0) return null

  const pages = useMemo(() => {
    const range = []
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1))
        range.push(i)
      else if (range[range.length - 1] !== '…')
        range.push('…')
    }
    return range
  }, [current, totalPages])

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500">
          Showing{' '}
          <span className="font-semibold text-gray-800">
            {Math.min((current - 1) * pageSize + 1, totalElements)}–{Math.min(current * pageSize, totalElements)}
          </span>{' '}
          of <span className="font-semibold text-gray-800">{totalElements}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="h-7 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#C35E33] cursor-pointer bg-white"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(current - 1)}
          disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor:     current === p ? PRIMARY : '#E5E7EB',
                backgroundColor: current === p ? PRIMARY : 'transparent',
                color:           current === p ? '#fff'  : '#6B7280',
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(current + 1)}
          disabled={current === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Active Filter Chips ──────────────────────────────────────────────────────
function ActiveFilterChips({ activeFilters, onRemoveFilter }) {
  const chips = []

  const FILTER_LABELS = {
    status: 'Status',
    type:   'Type',
    dept:   'Department',
    from:   'From',
    to:     'To',
  }

  Object.entries(activeFilters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => chips.push({ key, value: v, label: `${FILTER_LABELS[key] ?? key}: ${v}`, isArray: true }))
    } else if (value) {
      chips.push({ key, value, label: `${FILTER_LABELS[key] ?? key}: ${value}`, isArray: false })
    }
  })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {chips.map((chip, i) => (
        <span
          key={`${chip.key}-${chip.value}-${i}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
          style={{ backgroundColor: '#FFF7F4', borderColor: '#F4C9B5', color: PRIMARY }}
        >
          {chip.label}
          <button
            onClick={() => onRemoveFilter(chip.key, chip.isArray ? chip.value : null)}
            className="flex items-center justify-center rounded-full hover:bg-orange-100 transition-colors"
            style={{ width: 14, height: 14 }}
            title="Remove filter"
          >
            <X size={9} strokeWidth={3} />
          </button>
        </span>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EmployeeList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user }  = useAuthStore()
  const isAdmin   = user?.role === ROLES.ADMIN

  const [employees,      setEmployees]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [refreshing,     setRefreshing]     = useState(false)
  const [totalElements,  setTotalElements]  = useState(0)
  const [counts,         setCounts]         = useState({
    totalEmployees: 0, activeCount: 0, inactiveCount: 0, onHoldCount: 0, draftCount: 0,
    employeeCount: 0, internCount: 0, traineeCount: 0,
  })

  const [activeTab,     setActiveTab]     = useState('All')
  const [search,        setSearch]        = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [page,          setPage]          = useState(1)
  const [pageSize,      setPageSize]      = useState(10)
  const [sortBy,        setSortBy]        = useState('id')
  const [sortDir,       setSortDir]       = useState('asc')
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleting,      setDeleting]      = useState(false)

  const apiParams = useMemo(() => {
    const p = { page: page - 1, size: pageSize, sortBy, sortDir }
    if (activeTab === 'Draft') {
      p.recordStatus = 'DRAFT'
    } else {
      p.recordStatus = 'SUBMITTED'
      if (activeTab !== 'All') p.employmentType = TYPE_TO_API[activeTab]
    }
    if (search)                p.search       = search
    if (activeFilters.dept)    p.department   = activeFilters.dept
    if (activeFilters.status?.length === 1) p.status = STATUS_TO_API[activeFilters.status[0]]
    if (activeFilters.type?.length === 1)   p.employmentType = TYPE_TO_API[activeFilters.type[0]]
    if (activeFilters.from)    p.dateFrom     = activeFilters.from
    if (activeFilters.to)      p.dateTo       = activeFilters.to
    return p
  }, [page, pageSize, sortBy, sortDir, activeTab, search, activeFilters])

  const fetchEmployees = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res     = await employeeService.getAll(apiParams)
      const payload = res?.data?.data ?? res?.data ?? {}
      const content = payload.content ?? []
      setEmployees(content.map(normaliseEmployee))
      setTotalElements(payload.totalElements ?? 0)
      setCounts({
        totalEmployees: payload.totalEmployees ?? 0,
        activeCount:    payload.activeCount    ?? 0,
        inactiveCount:  payload.inactiveCount  ?? 0,
        onHoldCount:    payload.onHoldCount    ?? 0,
        draftCount:     payload.draftCount     ?? 0,
        employeeCount:  payload.employeeCount  ?? 0,
        internCount:    payload.internCount    ?? 0,
        traineeCount:   payload.traineeCount   ?? 0,
      })
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load employees')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiParams])

  useEffect(() => {
    const id = setTimeout(() => fetchEmployees(false), search ? 350 : 0)
    return () => clearTimeout(id)
  }, [fetchEmployees, search])

  useEffect(() => setPage(1), [activeTab, search, activeFilters, pageSize])

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
    setPage(1)
  }

  const handleStatusChange = async (id, apiStatus, displayLabel) => {
    // Optimistic UI update for the employee row
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: displayLabel } : e))
    try {
      await employeeService.updateStatus(id, apiStatus)
      toast.success(`Status updated to ${displayLabel}`)
      // Re-fetch to update the summary counts (Active/Inactive/Hold cards)
      fetchEmployees(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update status')
      fetchEmployees(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await employeeService.delete(deleteTarget)
      toast.success('Employee deactivated successfully')
      setDeleteTarget(null)
      fetchEmployees(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete employee')
    } finally {
      setDeleting(false)
    }
  }

  const handleRemoveFilter = (key, arrayValue) => {
    setActiveFilters(prev => {
      const updated = { ...prev }
      if (arrayValue !== null && Array.isArray(updated[key])) {
        const newArr = updated[key].filter(v => v !== arrayValue)
        if (newArr.length === 0) delete updated[key]
        else updated[key] = newArr
      } else {
        delete updated[key]
      }
      return updated
    })
    setPage(1)
  }

  const filterCount = Object.values(activeFilters).filter(v =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length

  const tabBadge = {
    All:        counts.totalEmployees,
    Employee:   counts.employeeCount,
    Internship: counts.internCount,
    Training:   counts.traineeCount,
    Draft:      counts.draftCount,
  }

  return (
    <>
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Employee Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage and track all employees</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEmployees(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold cursor-pointer whitespace-nowrap border transition-colors disabled:opacity-60"
            style={{ borderColor: '#E5E7EB', color: '#374151', backgroundColor: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
            title="Refresh list"
          >
            <RefreshCw
              size={14}
              strokeWidth={2}
              style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}
            />
          </button>

          <button
            onClick={() => navigate(ROUTES.EMPLOYEE_ADD)}
            className="flex items-center gap-2 text-white rounded-lg px-4 py-2.5 text-[13px] font-semibold cursor-pointer whitespace-nowrap border-none transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <UserPlus size={15} strokeWidth={2} />
            Add Employee
          </button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Employees', value: counts.totalEmployees, bg: '#F3F4F6', color: '#111827',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { label: 'Active',   value: counts.activeCount,   bg: '#DCFCE7', color: '#15803D',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: 'Inactive', value: counts.inactiveCount, bg: '#FEE2E2', color: '#B91C1C',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
          { label: 'On Hold',  value: counts.onHoldCount,  bg: '#FEF9C3', color: '#854D0E',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#854D0E" strokeWidth="1.8" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> },
        ].map(({ label, value, bg, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-[22px] font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border cursor-pointer transition-all whitespace-nowrap"
              style={{
                borderColor:     activeTab === tab ? '#111827' : '#E5E7EB',
                color:           activeTab === tab ? '#111827' : '#6B7280',
                backgroundColor: activeTab === tab ? '#F9FAFB' : '#fff',
                fontWeight:      activeTab === tab ? 600 : 500,
              }}
            >
              {tab}
              {tabBadge[tab] > 0 && (
                <span
                  className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: tab === 'Draft' ? '#9CA3AF' : PRIMARY }}
                >
                  {tabBadge[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text">
            <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-32 sm:w-40"
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

      {/* ── Active filter chips ── */}
      <ActiveFilterChips
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
      />

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th className="px-3.5 py-3 text-left text-xs bg-gray-50 border-b border-gray-100 whitespace-nowrap rounded-tl-xl">
                  <SortHeader label="ID" field="id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3.5 py-3 text-left text-xs bg-gray-50 border-b border-gray-100 whitespace-nowrap">
                  <SortHeader label="Employee Name" field="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                </th>
                {['Department', 'Designation', 'Email', 'Phone'].map(h => (
                  <th key={h} className="px-3.5 py-3 text-left text-xs font-semibold bg-gray-50 border-b border-gray-100 whitespace-nowrap" style={{ color: PRIMARY }}>
                    {h}
                  </th>
                ))}
                <th className="px-3.5 py-3 text-left text-xs bg-gray-50 border-b border-gray-100 whitespace-nowrap">
                  <SortHeader label="Joining Date" field="joiningDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3.5 py-3 text-left text-xs font-semibold bg-gray-50 border-b border-gray-100 whitespace-nowrap" style={{ color: PRIMARY }}>Status</th>
                <th className="px-3.5 py-3 text-left text-xs font-semibold bg-gray-50 border-b border-gray-100 rounded-tr-xl" style={{ color: PRIMARY }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke={PRIMARY} strokeWidth="4" />
                        <path className="opacity-75" fill={PRIMARY} d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span className="text-sm text-gray-400">Loading employees…</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                    No employees match your filters.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    // ✅ FIX: Row click uses resolveRoute with emp.rawType for correct page per role
                    onClick={() => navigate(resolveRoute('View', emp.id, emp.rawType, emp.isDraft))}
                  >
                    <td className="px-3.5 py-3 text-[11px] font-bold text-gray-400 border-b border-gray-50 whitespace-nowrap">
                      {emp.employeeCode ?? `#${String(emp.id).padStart(2, '0')}`}
                    </td>

                    <td className="px-3.5 py-3 border-b border-gray-50 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        {emp.profileImageUrl ? (
                          <img
                            src={emp.profileImageUrl || profileIcon}
                            alt={emp.fullName}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                            onError={e => { e.currentTarget.src = profileIcon }}
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: PRIMARY }}
                          >
                            {initials(emp.fullName)}
                          </div>
                        )}
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900 leading-none">{emp.fullName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{emp.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-[13px] text-gray-600 border-b border-gray-50 whitespace-nowrap">{emp.dept  || '—'}</td>
                    <td className="px-3.5 py-3 text-[13px] text-gray-600 border-b border-gray-50 whitespace-nowrap">{emp.desig || '—'}</td>
                    <td className="px-3.5 py-3 text-[13px] text-gray-500 border-b border-gray-50 whitespace-nowrap">{emp.email || '—'}</td>
                    <td className="px-3.5 py-3 text-[13px] text-gray-500 border-b border-gray-50 whitespace-nowrap">{emp.phone || '—'}</td>
                    <td className="px-3.5 py-3 text-[13px] text-gray-500 border-b border-gray-50 whitespace-nowrap">
                      {emp.date ? formatDate(emp.date) : '—'}
                    </td>
                    <td className="px-3.5 py-3 border-b border-gray-50 whitespace-nowrap">
                      {emp.isDraft
                        ? <span className="inline-flex px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">Draft</span>
                        : <StatusBadge status={emp.status} />
                      }
                    </td>
                    <td className="px-3.5 py-3 border-b border-gray-50" onClick={e => e.stopPropagation()}>
                      {/*
                        ✅ FIX: Pass employeeType={emp.rawType} so ActionDropdown can forward
                        it through onView/onEdit/onEditDraft → resolveRoute picks correct page.
                      */}
                      <ActionDropdown
                        employeeId={emp.id}
                        employeeType={emp.rawType}
                        currentStatus={emp.status}
                        isDraft={emp.isDraft}
                        onStatusChange={handleStatusChange}
                        onDelete={() => setDeleteTarget(emp.id)}
                        onView={(id, type) => navigate(resolveRoute('View',  id, type, false))}
                        onEdit={(id, type) => navigate(resolveRoute('Edit',  id, type, false))}
                        onEditDraft={(id, type) => navigate(resolveRoute('Draft', id, type, true))}
                        canDelete={isAdmin}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          current={page}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onSizeChange={s => { setPageSize(s); setPage(1) }}
        />
      </div>

      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={f => { setActiveFilters(f); setPage(1) }}
        onReset={() => { setActiveFilters({}); setPage(1) }}
        config={FILTER_CONFIG}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate Employee"
        description="Are you sure you want to deactivate this employee? This is a soft delete and the record can be restored."
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleting}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).replace(/\//g, '-')
  } catch { return dateStr }
}

/**
 * Normalise a raw API employee record into the shape the table needs.
 *
 * KEY ADDITION: `rawType` preserves the original API employmentType value
 * ('EMPLOYEE' | 'INTERN' | 'TRAINEE') so resolveRoute() can branch correctly
 * without depending on display-label string matching.
 */
function normaliseEmployee(item) {
  return {
    id:              item.id,
    employeeCode:    item.employeeCode,
    fullName:        item.fullName        || '',
    profileImageUrl: item.profileImageUrl,
    dept:            item.departmentName,
    desig:           item.designationName,
    email:           item.email,
    phone:           item.phone,
    date:            item.joiningDate,
    status:          API_TO_STATUS[item.status] || 'Active',
    type:            API_TO_TYPE[item.employmentType] || item.employmentType,
    rawType:         item.employmentType,
    isDraft:         item.recordStatus === 'DRAFT',
  }
}