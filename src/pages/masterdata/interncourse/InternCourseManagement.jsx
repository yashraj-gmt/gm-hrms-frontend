// src/pages/masterdata/interncourse/InternCourseManagement.jsx

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, Plus, MoreVertical, Pencil, Trash2,
  X, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  BookOpen, ClipboardList, RefreshCw, AlertCircle, Filter,
} from 'lucide-react'
import internCourseService from '@/services/internCourseService'
import FilterModal         from '@/components/shared/FilterModal'
import ConfirmModal        from '@/components/shared/ConfirmModal'
import { useToast }        from '@/components/shared/toast/ToastProvider'
import { useAuthStore }    from '@/store/authStore'
import { ROLES }           from '@/constants/roles'

const PRIMARY   = '#C35E33'
const PAGE_SIZE = 10

// ── Filter config for shared FilterModal ──────────────────────────────────────
const FILTER_CONFIG = [
  {
    key:     'status',
    label:   'Status',
    type:    'multi',
    options: ['Active', 'Inactive'],
  },
]

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
      <CheckCircle size={11} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
      <XCircle size={11} /> Inactive
    </span>
  )
}

// ─── Action Menu (portal-based) ───────────────────────────────────────────────
function ActionMenu({ onEdit, onDelete, canDelete }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const btnRef          = useRef(null)
  const dropdownRef     = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e) => {
      const insideBtn      = btnRef.current      && btnRef.current.contains(e.target)
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target)
      if (!insideBtn && !insideDropdown) setOpen(false)
    }
    const handleScroll = () => setOpen(false)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('scroll',    handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('scroll',    handleScroll, true)
    }
  }, [open])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({
        top:  rect.bottom + window.scrollY + 6,
        left: rect.right  + window.scrollX - 160,
      })
    }
    setOpen((p) => !p)
  }

  return (
    <>
      <button ref={btnRef} onClick={handleToggle}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all">
        <MoreVertical size={15} />
      </button>

      {open && createPortal(
        <div ref={dropdownRef}
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: 160, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => { setOpen(false); onEdit() }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#C35E33] transition-colors">
            <Pencil size={13} /> Edit
          </button>

          {canDelete && (
            <>
              <div className="mx-3 h-px bg-gray-100" />
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => { setOpen(false); onDelete() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Course Modal (Add / Edit) ────────────────────────────────────────────────
function CourseModal({ mode, initial, onClose, onSaved }) {
  const { toast }  = useToast()
  const overlayRef = useRef(null)
  const isEdit     = mode === 'edit'

  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    active:      initial?.active      ?? true,
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, loading])

  const sf = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Course name is required'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)

    // Send 'active' for status toggle; backend mapper reads dto.getActive()
    const payload = {
      name:        form.name.trim(),
      description: form.description.trim() || null,
      active:      form.active,
    }

    try {
      if (isEdit) {
        await internCourseService.update(initial.id, payload)
        toast.success(`"${form.name}" updated successfully`, 'Course Updated')
      } else {
        await internCourseService.create(payload)
        toast.success(`"${form.name}" created successfully`, 'Course Created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err?.message ?? 'Something went wrong', isEdit ? 'Update Failed' : 'Create Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !loading) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 560, margin: '0 16px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ backgroundColor: '#111827' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}>
              <BookOpen size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">
              {isEdit ? 'Edit Intern Course' : 'Add Intern Course'}
            </h2>
          </div>
          <button onClick={onClose} disabled={loading}
            className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Course Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Course Name <span style={{ color: PRIMARY }}>*</span>
            </label>
            <input type="text" value={form.name} onChange={(e) => sf('name', e.target.value)}
              placeholder="e.g. Web Development"
              className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none placeholder:text-gray-400 transition-colors"
              style={{ borderColor: errors.name ? '#EF4444' : '#E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e)  => (e.target.style.borderColor = errors.name ? '#EF4444' : '#E5E7EB')} />
            {errors.name && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description
              <span className="ml-1 text-[10px] font-normal text-gray-400">(optional)</span>
            </label>
            <textarea value={form.description} onChange={(e) => sf('description', e.target.value)}
              placeholder="Brief description of the course…" rows={4}
              className="w-full px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none placeholder:text-gray-400 transition-colors"
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e)  => (e.target.style.borderColor = '#E5E7EB')} />
          </div>

          {/* Status — only in Edit mode */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
              <div className="flex items-center gap-6">
                {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map(({ label, val }) => (
                  <label key={label}
                    className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                    onClick={() => sf('active', val)}>
                    <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor:     form.active === val ? PRIMARY : '#D1D5DB',
                        backgroundColor: form.active === val ? PRIMARY : 'transparent',
                      }}>
                      {form.active === val && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}>
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isEdit ? 'Update Course' : 'Save Course'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
          <div className="h-3.5 w-36 bg-gray-200 rounded" />
        </div>
      </td>
      <td className="px-5 py-4 border-b border-gray-50">
        <div className="h-3 w-56 bg-gray-100 rounded" />
      </td>
      <td className="px-5 py-4 border-b border-gray-50">
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
      </td>
      <td className="px-5 py-4 border-b border-gray-50 text-center">
        <div className="h-8 w-8 bg-gray-100 rounded-lg mx-auto" />
      </td>
    </tr>
  ))
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
        <BookOpen size={18} color={color} />
      </div>
      <div>
        {loading
          ? <div className="h-7 w-10 bg-gray-200 rounded animate-pulse mb-1" />
          : <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>}
        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, totalElements, pageSize, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const startItem = current * pageSize + 1
  const endItem   = Math.min((current + 1) * pageSize, totalElements)
  const delta = 2
  const pages = []
  for (let i = Math.max(0, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) pages.push(i)
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-800">{startItem}–{endItem}</span> of{' '}
        <span className="font-semibold text-gray-800">{totalElements}</span> courses
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(current - 1)} disabled={current === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
            style={{
              borderColor:     current === p ? PRIMARY : '#E5E7EB',
              backgroundColor: current === p ? PRIMARY : 'transparent',
              color:           current === p ? '#fff'  : '#6B7280',
            }}>
            {p + 1}
          </button>
        ))}
        <button onClick={() => onChange(current + 1)} disabled={current === totalPages - 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InternCourseManagement() {
  const { toast } = useToast()

  // ── Role check ────────────────────────────────────────────────────────────
  const user      = useAuthStore((state) => state.user)
  const canDelete = user?.role === ROLES.ADMIN

  // ── Server data ───────────────────────────────────────────────────────────
  const [courses,       setCourses]       = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [tableLoading,  setTableLoading]  = useState(false)

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [stats,        setStats]        = useState({ total: 0, active: 0, inactive: 0 })
  const [statsLoading, setStatsLoading] = useState(false)

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0)

  // ── Search (client-side) ──────────────────────────────────────────────────
  const [search, setSearch] = useState('')

  // ── Filter modal ──────────────────────────────────────────────────────────
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})   // { status: ['Active'] }

  const filterCount = Object.values(activeFilters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalMode,    setModalMode]    = useState(null)   // 'add' | 'edit'
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchCourses = useCallback(async (currentPage) => {
    setTableLoading(true)
    try {
      const res      = await internCourseService.getAll(currentPage, PAGE_SIZE)
      const pageData = res?.data ?? {}
      setCourses(pageData.content       ?? [])
      setTotalElements(pageData.totalElements ?? 0)
      setTotalPages(pageData.totalPages    ?? 0)
    } catch (err) {
      toast.error(err?.message ?? 'Failed to load courses', 'Fetch Error')
      setCourses([])
    } finally {
      setTableLoading(false)
    }
  }, [toast])

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await internCourseService.getStats()
      setStats(res?.data ?? { total: 0, active: 0, inactive: 0 })
    } catch { /* non-critical */ } finally {
      setStatsLoading(false)
    }
  }, [])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => { fetchCourses(0); fetchStats() }, []) // eslint-disable-line

  // ── Pagination ────────────────────────────────────────────────────────────
  const handlePageChange = (p) => { setPage(p); fetchCourses(p) }

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchCourses(page); fetchStats()
  }, [fetchCourses, fetchStats, page])

  // ── Filter apply / reset ──────────────────────────────────────────────────
  const handleApplyFilter = useCallback((filters) => {
    setActiveFilters(filters)
  }, [])

  const handleResetFilter = useCallback(() => {
    setActiveFilters({})
  }, [])

  // ── Soft delete ───────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await internCourseService.delete(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" has been deleted`, 'Deleted')
      setDeleteTarget(null)
      const remainingOnPage = courses.length - 1
      const targetPage = remainingOnPage === 0 && page > 0 ? page - 1 : page
      setPage(targetPage)
      fetchCourses(targetPage)
      fetchStats()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete course', 'Delete Failed')
    } finally {
      setDeleting(false)
    }
  }

  // ── Client-side filter: search + status ──────────────────────────────────
  const filteredCourses = useMemo(() => {
    let list = courses

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) => c.name?.toLowerCase().includes(q) ||
               (c.description ?? '').toLowerCase().includes(q)
      )
    }

    const statusChips = activeFilters.status ?? []
    if (statusChips.includes('Active') && !statusChips.includes('Inactive')) {
      list = list.filter((c) => c.active)
    } else if (statusChips.includes('Inactive') && !statusChips.includes('Active')) {
      list = list.filter((c) => !c.active)
    }
    // if both or neither selected → show all

    return list
  }, [courses, search, activeFilters])

  return (
    <>
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Intern Course Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage all intern course names and descriptions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={tableLoading}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
            title="Refresh">
            <RefreshCw size={14} className={tableLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}>
            <Plus size={15} strokeWidth={2.5} /> Add Intern Course
          </button>
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Courses"    value={stats.total}    color="#111827" bg="#F3F4F6" loading={statsLoading} />
        <StatCard label="Active Courses"   value={stats.active}   color="#15803D" bg="#DCFCE7" loading={statsLoading} />
        <StatCard label="Inactive Courses" value={stats.inactive} color="#B91C1C" bg="#FEE2E2" loading={statsLoading} />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <label className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-gray-200 cursor-text flex-1"
          style={{ maxWidth: 380 }}>
          <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full"
            onFocus={(e) => (e.target.parentElement.style.borderColor = PRIMARY)}
            onBlur={(e)  => (e.target.parentElement.style.borderColor = '#E5E7EB')} />
          {search && (
            <button onClick={() => setSearch('')}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={12} />
            </button>
          )}
        </label>

        {/* Filter button */}
        <button
          onClick={() => setShowFilter(true)}
          className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-10 text-[13px] font-medium cursor-pointer hover:bg-gray-50 ml-auto transition-colors"
          style={{
            borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB',
            color:       filterCount > 0 ? PRIMARY : '#374151',
          }}>
          <Filter size={13} strokeWidth={2} />
          <span>Filter</span>
          {filterCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}>
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 580 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Course Name', 'Description', 'Status', 'Action'].map((h) => (
                  <th key={h}
                    className={`px-5 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap ${h === 'Action' ? 'text-center' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <TableSkeleton />
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center text-sm text-gray-400">
                    {search || filterCount > 0
                      ? 'No courses match your search or filter.'
                      : 'No courses found. Click "Add Intern Course" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredCourses.map((row, idx) => (
                  <tr key={row.id}
                    className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>

                    {/* Course Name */}
                    <td className="px-5 py-4 border-b border-gray-50 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                          style={{ backgroundColor: row.active ? PRIMARY : '#9CA3AF' }}>
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-gray-900">{row.name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4 border-b border-gray-50">
                      {row.description ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-600 truncate max-w-[260px]">
                            {row.description}
                          </span>
                          <button title={row.description}
                            className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors">
                            <ClipboardList size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-300">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 border-b border-gray-50 whitespace-nowrap">
                      <StatusBadge active={row.active} />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 border-b border-gray-50 text-center">
                      <ActionMenu
                        onEdit={() => { setEditTarget(row); setModalMode('edit') }}
                        onDelete={() => setDeleteTarget(row)}
                        canDelete={canDelete}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!tableLoading && (
          <Pagination
            current={page}
            totalElements={totalElements}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            onChange={handlePageChange}
          />
        )}
      </div>

      {/* ── Course Add / Edit Modal ────────────────────────────── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <CourseModal
          mode={modalMode}
          initial={modalMode === 'edit' ? editTarget : null}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          onSaved={handleRefresh}
        />
      )}

      {/* ── Delete Confirm (shared ConfirmModal, danger variant) ── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={handleConfirmDelete}
        title="Delete Course"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? It will be permanently removed from the listing but retained in the database.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />

      {/* ── Filter Panel (shared FilterModal) ─────────────────── */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilter}
        onReset={handleResetFilter}
        config={FILTER_CONFIG}
      />
    </>
  )
}