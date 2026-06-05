// src/pages/masterdata/holiday/HolidayManagement.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Search, Filter, Plus, X, Calendar, ChevronLeft, ChevronRight,
  Sun, Globe, Star, RefreshCw, MoreVertical, Pencil, Trash2,
  ToggleLeft, ToggleRight,
} from 'lucide-react'
import FilterModal   from '@/components/shared/FilterModal'
import ConfirmModal  from '@/components/shared/ConfirmModal'
import { useToast }  from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROLES }        from '@/constants/roles'
import holidayService   from '@/services/holidayService'

const PRIMARY       = '#C35E33'
const PRIMARY_DARK  = '#A34A24'
const PRIMARY_LIGHT = '#FDE8DD'
const PAGE_SIZE     = 10

// ── Holiday type config ───────────────────────────────────────────────────────
const HOLIDAY_TYPE_OPTIONS = [
  { value: 'NATIONAL', label: 'National Holiday' },
  { value: 'COMPANY',  label: 'Company Holiday'  },
  { value: 'FESTIVAL', label: 'Festival'          },
]
const TYPE_LABEL = Object.fromEntries(
  HOLIDAY_TYPE_OPTIONS.map(({ value, label }) => [value, label])
)

// Filter config — server-side
const FILTER_CONFIG = [
  {
    key:     'type',
    label:   'Holiday Type',
    type:    'multi',
    options: HOLIDAY_TYPE_OPTIONS.map((o) => o.label),
  },
  {
    key:     'isOptional',
    label:   'Optional (Flotter)',
    type:    'multi',
    options: ['Yes', 'No'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '-'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function daysLeft(iso) {
  if (!iso) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d     = new Date(iso + 'T00:00:00')
  return Math.ceil((d - today) / 86400000)
}

function typeBg(value) {
  return { NATIONAL: '#DBEAFE', COMPANY: '#F5F3FF', FESTIVAL: '#FEF9C3' }[value] ?? '#F3F4F6'
}
function typeColor(value) {
  return { NATIONAL: '#1D4ED8', COMPANY: '#6D28D9', FESTIVAL: '#854D0E' }[value] ?? '#374151'
}

function TypeBadge({ value }) {
  return (
    <span
      className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: typeBg(value), color: typeColor(value) }}
    >
      {TYPE_LABEL[value] ?? value}
    </span>
  )
}

function StatusBadge({ active }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        backgroundColor: active ? '#DCFCE7' : '#FEE2E2',
        color:           active ? '#15803D' : '#B91C1C',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: active ? '#16A34A' : '#DC2626' }}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function HolidayIcon({ value }) {
  const p = { size: 15, strokeWidth: 1.8 }
  if (value === 'NATIONAL') return <Globe  {...p} color="#1D4ED8" />
  if (value === 'COMPANY')  return <Star   {...p} color="#6D28D9" />
  if (value === 'FESTIVAL') return <Sun    {...p} color="#854D0E" />
  return <Calendar {...p} color="#15803D" />
}

// ── Three-dot Action Menu ─────────────────────────────────────────────────────
function ActionMenu({ onEdit, onDelete, canDelete, openUpward }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-30 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 ${
            openUpward ? 'bottom-full mb-1' : 'top-9'
          }`}
        >
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#C35E33] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>

          {canDelete && (
            <>
              <div className="mx-3 h-px bg-gray-100" />
              <button
                onClick={() => { onDelete(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ current, total, pageSize, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-wrap gap-2">
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
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
          disabled={current === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[180, 110, 130, 160, 60, 80, 80, 70].map((w, i) => (
        <td key={i} className="px-5 py-4 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded-md" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  holidayName: '',
  holidayDate: '',
  holidayType: 'NATIONAL',
  description: '',
  isOptional:  false,
  isActive:    true,   // only used in edit mode
}

function HolidayModal({ mode, initial, onClose, onSave }) {
  const overlayRef        = useRef(null)
  const isEdit            = mode === 'edit'
  const [form,    setForm]    = useState(
    initial
      ? {
          holidayName: initial.holidayName ?? '',
          holidayDate: initial.holidayDate ?? '',
          holidayType: initial.holidayType ?? 'NATIONAL',
          description: initial.description ?? '',
          isOptional:  initial.isOptional  ?? false,
          isActive:    initial.isActive    ?? true,
        }
      : EMPTY_FORM
  )
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const setField = (key, value) => {
    setForm((p)   => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: ''    }))
  }

  const validate = () => {
    const e = {}
    if (!form.holidayName.trim()) e.holidayName = 'Holiday name is required'
    if (!form.holidayDate)        e.holidayDate = 'Holiday date is required'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const payload = { ...form, holidayName: form.holidayName.trim() }
      if (!isEdit) delete payload.isActive    // isActive not sent on create
      await onSave(payload)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const inputBase =
    'w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none transition-colors placeholder:text-gray-400'

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 600, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0 z-10"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
              <Calendar size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">
              {isEdit ? 'Edit Holiday' : 'Add Holiday'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Row: Name + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Holiday Name <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input
                type="text"
                value={form.holidayName}
                onChange={(e) => setField('holidayName', e.target.value)}
                placeholder="e.g. Diwali"
                className={inputBase}
                style={{ borderColor: errors.holidayName ? '#EF4444' : '#E5E7EB' }}
                onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                onBlur={(e)  => { e.target.style.borderColor = errors.holidayName ? '#EF4444' : '#E5E7EB' }}
              />
              {errors.holidayName && (
                <p className="text-[11px] text-red-500 mt-1">⚠ {errors.holidayName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Holiday Date <span style={{ color: PRIMARY }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={form.holidayDate}
                  onChange={(e) => setField('holidayDate', e.target.value)}
                  className={inputBase + ' pr-10'}
                  style={{ borderColor: errors.holidayDate ? '#EF4444' : '#E5E7EB' }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.holidayDate ? '#EF4444' : '#E5E7EB' }}
                />
                <Calendar size={14} color="#9CA3AF" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.holidayDate && (
                <p className="text-[11px] text-red-500 mt-1">⚠ {errors.holidayDate}</p>
              )}
            </div>
          </div>

          {/* Holiday Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Holiday Type</label>
            <div className="relative">
              <select
                value={form.holidayType}
                onChange={(e) => setField('holidayType', e.target.value)}
                className="w-full h-10 px-3.5 pr-8 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none appearance-none cursor-pointer transition-colors"
                onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
              >
                {HOLIDAY_TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronLeft size={13} color="#9CA3AF" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none -rotate-90" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Brief description of the holiday…"
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none transition-colors placeholder:text-gray-400"
              onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
              onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
            />
          </div>

          {/* Optional toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Optional / Flotter Holiday
            </label>
            <div className="flex items-center gap-6">
              {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
                <label
                  key={label}
                  className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                  onClick={() => setField('isOptional', val)}
                >
                  <span
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor:     form.isOptional === val ? PRIMARY : '#D1D5DB',
                      backgroundColor: form.isOptional === val ? PRIMARY : 'transparent',
                    }}
                  >
                    {form.isOptional === val && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Optional holidays let employees choose to avail them as part of their leave quota.
            </p>
          </div>

          {/* Status toggle — edit mode only */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Status
              </label>
              <button
                type="button"
                onClick={() => setField('isActive', !form.isActive)}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 text-xs font-semibold transition-all"
                style={{
                  borderColor:     form.isActive ? '#16A34A' : '#DC2626',
                  backgroundColor: form.isActive ? '#F0FDF4' : '#FEF2F2',
                  color:           form.isActive ? '#15803D' : '#B91C1C',
                }}
              >
                {form.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                {form.isActive ? 'Active' : 'Inactive'}
                <span className="font-normal text-gray-400 ml-1">
                  — click to {form.isActive ? 'deactivate' : 'activate'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center gap-2"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#111827')}
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isEdit ? 'Update Holiday' : 'Save Holiday'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HolidayManagement() {
  const { toast } = useToast()
  const { user }  = useAuthStore()
  const isAdmin   = user?.role === ROLES.ADMIN   // DELETE is ADMIN-only

  // ── Data state ────────────────────────────────────────────────────────────
  const [rows,          setRows]          = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [stats,         setStats]         = useState({ total: 0, active: 0, upcoming: 0, optional: 0 })

  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  // ── Search / filter / page state ──────────────────────────────────────────
  const [search,        setSearch]        = useState('')
  const [debouncedQ,    setDebouncedQ]    = useState('')
  const [statusFilter,  setStatusFilter]  = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [page,          setPage]          = useState(1)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalMode,    setModalMode]    = useState(null)   // 'add' | 'edit'
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading,setDeleteLoading]= useState(false)

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [activeFilters, statusFilter])

  // ── Derive API params from active filters ──────────────────────────────────
  const typeParam = useMemo(() => {
    const types = activeFilters.type ?? []
    if (!types.length || types.length === HOLIDAY_TYPE_OPTIONS.length) return undefined
    if (types.length === 1) {
      return HOLIDAY_TYPE_OPTIONS.find((o) => o.label === types[0])?.value
    }
    return undefined   // multiple selected — skip filter (backend can't accept array yet)
  }, [activeFilters.type])

  const isActiveParam = useMemo(() => {
    if (statusFilter === 'ALL') return undefined
    return statusFilter === 'ACTIVE'
  }, [statusFilter])

  const isOptionalParam = useMemo(() => {
    const opt = activeFilters.isOptional ?? []
    if (!opt.length || opt.length === 2) return undefined
    return opt[0] === 'Yes'
  }, [activeFilters.isOptional])

  // ── Fetch paginated rows ───────────────────────────────────────────────────
  const fetchHolidays = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await holidayService.getAll({
        page:       page - 1,
        size:       PAGE_SIZE,
        search:     debouncedQ || undefined,
        type:       typeParam,
        isActive:   isActiveParam,
        isOptional: isOptionalParam,
      })
      const { content, totalElements: te, totalPages: tp } = res.data
      setRows(content)
      setTotalElements(te)
      setTotalPages(tp)
    } catch (err) {
      setError(err?.message ?? 'Failed to fetch holidays.')
      toast.error(err?.message ?? 'Failed to fetch holidays.', 'Error')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQ, typeParam, isActiveParam, isOptionalParam])

  useEffect(() => { fetchHolidays() }, [fetchHolidays])

  // ── Fetch global stats ─────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await holidayService.getStats()
      setStats(res.data)
    } catch {
      // Non-critical — silently ignore
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleSaved = () => { fetchHolidays(); fetchStats() }

  const handleAdd = async (form) => {
    try {
      await holidayService.create(form)
      toast.success('Holiday created successfully.', 'Created!')
      handleSaved()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to create holiday.', 'Error')
      throw err
    }
  }

  const handleEdit = async (form) => {
    try {
      await holidayService.update(editTarget.id, form)
      toast.success('Holiday updated successfully.', 'Updated!')
      handleSaved()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update holiday.', 'Error')
      throw err
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await holidayService.delete(deleteTarget.id)
      toast.success(`"${deleteTarget.holidayName}" has been deleted.`, 'Deleted!')
      setDeleteTarget(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else fetchHolidays()
      fetchStats()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete holiday.', 'Error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filterCount = Object.values(activeFilters)
    .filter((v) => Array.isArray(v) ? v.length > 0 : !!v).length

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Holiday Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage company holidays and observances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchHolidays(); fetchStats() }}
            title="Refresh"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <Plus size={15} strokeWidth={2.5} />
            Add Holiday
          </button>
        </div>
      </div>

      {/* ── Stats — global totals, never change with search ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Holidays',   value: stats.total,    color: '#111827', bg: '#F3F4F6'   },
          { label: 'Active',           value: stats.active,   color: '#15803D', bg: '#DCFCE7'   },
          { label: 'Upcoming (90d)',   value: stats.upcoming, color: PRIMARY,   bg: PRIMARY_LIGHT },
          { label: 'Optional/Flotter', value: stats.optional, color: '#6D28D9', bg: '#F5F3FF'   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Calendar size={18} color={color} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color }}>
                {value}
              </p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        {/* Search */}
        <label
          className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-gray-200 cursor-text flex-1 min-w-0"
          style={{ maxWidth: 380 }}
        >
          <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search holidays…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full min-w-0"
            onFocus={(e) => (e.target.parentElement.style.borderColor = PRIMARY)}
            onBlur={(e)  => (e.target.parentElement.style.borderColor = '#E5E7EB')}
          />
          {search && (
            <button onClick={() => setSearch('')} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={12} color="#9CA3AF" />
            </button>
          )}
        </label>

        {/* Right tools container: Segmented control + Filter Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status segmented control */}
          <div className="flex items-center border border-gray-200 rounded-xl p-0.5 bg-gray-50 h-10">
            {[
              { label: 'All', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
            ].map((opt) => {
              const isActive = statusFilter === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-4 h-8 text-[13px] font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-white shadow-sm text-gray-950 border border-gray-100'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={isActive ? { color: PRIMARY } : {}}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Filter button — opens shared FilterModal */}
          <button
            onClick={() => setShowFilter(true)}
            className="relative flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3.5 h-10 text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            style={{
              borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB',
              color:       filterCount > 0 ? PRIMARY : '#374151',
            }}
          >
            <Filter size={13} strokeWidth={2} />
            <span>Filter</span>
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

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={fetchHolidays} className="ml-auto text-xs underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Holiday Name', 'Holiday Date', 'Holiday Type', 'Description', 'Optional', 'Days Left', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-4 text-xs font-semibold text-white whitespace-nowrap ${h === 'Actions' ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
                : rows.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center text-sm text-gray-400">
                        {search || filterCount
                          ? 'No holidays match your search or filters.'
                          : 'No holidays found. Add your first holiday.'}
                      </td>
                    </tr>
                  )
                  : rows.map((row, idx) => {
                    const dl = daysLeft(row.holidayDate)
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-orange-50/40 transition-colors"
                        style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                      >
                        {/* Name */}
                        <td className="px-5 py-4 border-b border-gray-50">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: typeBg(row.holidayType) }}
                            >
                              <HolidayIcon value={row.holidayType} />
                            </div>
                            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                              {row.holidayName}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 border-b border-gray-50 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{fmtDate(row.holidayDate)}</span>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4 border-b border-gray-50">
                          <TypeBadge value={row.holidayType} />
                        </td>

                        {/* Description */}
                        <td className="px-5 py-4 border-b border-gray-50 max-w-xs">
                          <p className="text-xs text-gray-500 truncate" title={row.description}>
                            {row.description || '-'}
                          </p>
                        </td>

                        {/* Optional */}
                        <td className="px-5 py-4 border-b border-gray-50 text-center">
                          {row.isOptional ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                              YES
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        {/* Days Left */}
                        <td className="px-5 py-4 border-b border-gray-50 whitespace-nowrap">
                          {dl === null ? (
                            <span className="text-xs text-gray-400">-</span>
                          ) : dl < 0 ? (
                            <span className="text-xs text-gray-400">Past</span>
                          ) : dl === 0 ? (
                            <span className="text-xs font-bold text-green-600">Today 🎉</span>
                          ) : dl <= 30 ? (
                            <span className="text-xs font-semibold" style={{ color: PRIMARY }}>In {dl}d</span>
                          ) : (
                            <span className="text-xs text-gray-500">In {dl}d</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 border-b border-gray-50">
                          <StatusBadge active={row.isActive} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 border-b border-gray-50 text-center">
                          <ActionMenu
                            canDelete={isAdmin}
                            openUpward={idx >= rows.length - 2}
                            onEdit={() => { setEditTarget(row); setModalMode('edit') }}
                            onDelete={() => setDeleteTarget(row)}
                          />
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>

        <Pagination
          current={page}
          total={totalElements}
          pageSize={PAGE_SIZE}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────────── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <HolidayModal
          mode={modalMode}
          initial={modalMode === 'edit' ? editTarget : null}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          onSave={modalMode === 'add' ? handleAdd : handleEdit}
        />
      )}

      {/* ── Delete Confirmation — shared ConfirmModal, ADMIN only ─────────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget && isAdmin}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Holiday"
        description={`"${deleteTarget?.holidayName}" will be permanently removed from the listing. The record is retained in the database.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

      {/* ── Filter Panel ──────────────────────────────────────────────────────── */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(f) => { setActiveFilters(f); setPage(1) }}
        onReset={() => { setActiveFilters({}); setPage(1) }}
        config={FILTER_CONFIG}
      />
    </>
  )
}