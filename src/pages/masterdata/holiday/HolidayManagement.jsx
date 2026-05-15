// src/pages/masterdata/holiday/HolidayManagement.jsx
//
// Changes from previous version:
//  1. Replaced inline form → modal dialog (same pattern as DesignationManagement)
//  2. Integrated real API via holidayService
//  3. Field names aligned to backend DTOs  (name→holidayName, date→holidayDate,
//     type→holidayType, flotter→isOptional)
//  4. Delete restricted to ADMIN only (mirrors backend @PreAuthorize("hasRole('ADMIN')"))
//  5. Toast notifications for every operation
//  6. Skeleton loading rows
//
// ⚠️  Backend TODO:
//   Add `isActive` to HolidayResponseDTO so the frontend can receive it.
//   Until then, `isActive` is managed optimistically in local state only.
//
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Search, Filter, Plus, X, Calendar, Edit2, Trash2,
  ChevronLeft, ChevronRight, Sun, Globe, Star, RefreshCw,
} from 'lucide-react'
import FilterModal      from '@/components/shared/FilterModal'
import { useToast }     from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROLES }        from '@/constants/roles'
import holidayService   from '@/services/holidayService'

const PRIMARY       = '#C35E33'
const PRIMARY_DARK  = '#A34A24'
const PRIMARY_LIGHT = '#FDE8DD'
const PAGE_SIZE     = 8

// ── HolidayType enum values (must match Java enum exactly) ───────────────────
export const HOLIDAY_TYPE_OPTIONS = [
  { value: 'NATIONAL', label: 'National Holiday' },
  { value: 'COMPANY', label: 'Company Holiday' },
  { value: 'FESTIVAL',         label: 'Festival'         },
]

const TYPE_LABEL = Object.fromEntries(
  HOLIDAY_TYPE_OPTIONS.map(({ value, label }) => [value, label])
)

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
  if (!iso) return '—'
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
  const map = {
    NATIONAL: '#DBEAFE',
    COMPANY: '#F5F3FF',
    FESTIVAL:         '#FEF9C3',
  }
  return map[value] || '#F3F4F6'
}

function typeColor(value) {
  const map = {
    NATIONAL: '#1D4ED8',
    COMPANY : '#6D28D9',
    FESTIVAL:         '#854D0E',

  }
  return map[value] || '#374151'
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
  const props = { size: 15, strokeWidth: 1.8 }
  if (value === 'NATIONAL') return <Globe  {...props} color="#1D4ED8" />
  if (value === 'COMPANY') return <Star   {...props} color="#6D28D9" />
  if (value === 'FESTIVAL')         return <Sun    {...props} color="#854D0E" />
  return <Calendar {...props} color="#15803D" />
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[180, 110, 130, 160, 60, 80, 70, 90].map((w, i) => (
        <td key={i} className="px-5 py-4 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded-md" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ current, total, pageSize, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const from = (current - 1) * pageSize + 1
  const to   = Math.min(current * pageSize, total)

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-800">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-800">{total}</span>
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

// ── Holiday Modal (Add / Edit) ────────────────────────────────────────────────
// Mirrors the pattern of DesignationModal exactly.
const EMPTY_FORM = {
  holidayName: '',
  holidayDate: '',
  holidayType: 'NATIONAL',
  description: '',
  isOptional:  false,
}

function HolidayModal({ mode, initial, onClose, onSave }) {
  const overlayRef        = useRef(null)
  const [form, setForm]   = useState(
    initial
      ? {
          holidayName: initial.holidayName ?? '',
          holidayDate: initial.holidayDate ?? '',
          holidayType: initial.holidayType ?? 'NATIONAL',
          description: initial.description ?? '',
          isOptional:  initial.isOptional  ?? false,
        }
      : EMPTY_FORM
  )
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  // Close on Escape
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
      await onSave({ ...form, holidayName: form.holidayName.trim() })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const isEdit = mode === 'edit'

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
        {/* ── Header ───────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0 z-10"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}
            >
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

        {/* ── Body ─────────────────────────────────────────── */}
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
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Holiday Type
            </label>
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
              <ChevronLeft
                size={13} color="#9CA3AF"
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none -rotate-90"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description
            </label>
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

          {/* Optional (Flotter) toggle */}
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
                    {form.isOptional === val && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </span>
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Optional holidays let employees choose to avail them as part of their leave quota.
            </p>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
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

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ holiday, onClose, onConfirm }) {
  const overlayRef        = useRef(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col items-center p-8 text-center"
        style={{ maxWidth: 400, margin: '0 16px' }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: '#FEE2E2' }}>
          <Trash2 size={24} color="#B91C1C" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Holiday</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-800">"{holiday.holidayName}"</span>?
          This performs a soft delete (marks inactive).
        </p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={async () => { setLoading(true); try { await onConfirm(holiday.id); onClose() } finally { setLoading(false) } }}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function HolidayManagement() {
  const { toast } = useToast()
  const { user }  = useAuthStore()
  const isAdmin   = user?.role === ROLES.ADMIN   // DELETE is ADMIN-only

  // ── State ─────────────────────────────────────────────────────────────────
  const [rows,          setRows]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [page,          setPage]          = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)

  const [modalMode,    setModalMode]    = useState(null)   // 'add' | 'edit'
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (pageNum) => {
    setLoading(true)
    try {
      const res = await holidayService.getAll(pageNum - 1, PAGE_SIZE)
      const { content, totalElements: te, totalPages: tp } = res.data
      setRows(content)
      setTotalElements(te)
      setTotalPages(tp)
    } catch (err) {
      toast.error(err?.message ?? 'Failed to fetch holidays.', 'Error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchPage(page) }, [page, fetchPage])

  // ── Client-side search + filter on current page ───────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((d) => {
      const sm = !q ||
        (d.holidayName ?? '').toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q) ||
        (TYPE_LABEL[d.holidayType] ?? '').toLowerCase().includes(q)

      const typeFilter = activeFilters.type ?? []
      const tm = !typeFilter.length ||
        typeFilter.some((label) => {
          const matched = HOLIDAY_TYPE_OPTIONS.find((o) => o.label === label)
          return matched?.value === d.holidayType
        })

      const optFilter = activeFilters.isOptional ?? []
      const om = !optFilter.length ||
        optFilter.includes(d.isOptional ? 'Yes' : 'No')

      return sm && tm && om
    })
  }, [rows, search, activeFilters])

  const filterCount = Object.values(activeFilters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length

  // Stats derived from current page (server count for total)
  const upcomingCount = rows.filter((d) => {
    const dl = daysLeft(d.holidayDate)
    return dl !== null && dl >= 0 && dl <= 90
  }).length
  const optionalCount = rows.filter((d) => d.isOptional).length

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleAdd = async (form) => {
    try {
      const res = await holidayService.create(form)
      toast.success(res.message ?? 'Holiday created successfully.', 'Success')
      if (page === 1) fetchPage(1)
      else setPage(1)
    } catch (err) {
      toast.error(err?.message ?? 'Failed to create holiday.', 'Error')
      throw err
    }
  }

  const handleEdit = async (form) => {
    try {
      const res = await holidayService.update(editTarget.id, form)
      toast.success(res.message ?? 'Holiday updated successfully.', 'Success')
      fetchPage(page)
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update holiday.', 'Error')
      throw err
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await holidayService.delete(id)
      toast.success(res.message ?? 'Holiday deleted successfully.', 'Success')
      const newCount = rows.length - 1
      if (newCount === 0 && page > 1) setPage((p) => p - 1)
      else fetchPage(page)
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete holiday.', 'Error')
      throw err
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Holiday Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage company holidays and observances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPage(page)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            <Plus size={15} strokeWidth={2.5} />
            Add Holiday
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Holidays',   value: totalElements,  color: '#111827', bg: '#F3F4F6' },
          { label: 'On This Page',     value: rows.length,    color: '#15803D', bg: '#DCFCE7' },
          { label: 'Upcoming (90d)',   value: upcomingCount,  color: PRIMARY,   bg: PRIMARY_LIGHT },
          { label: 'Optional/Flotter', value: optionalCount,  color: '#6D28D9', bg: '#F5F3FF' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Calendar size={18} color={color} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color }}>
                {loading
                  ? <span className="inline-block w-6 h-5 bg-gray-100 rounded animate-pulse" />
                  : value}
              </p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="flex items-center gap-2 bg-white rounded-xl px-4 h-10 border border-gray-200 flex-1 min-w-48 cursor-text"
          style={{ maxWidth: 380 }}>
          <Search size={14} color="#9CA3AF" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search holidays…"
            className="border-none outline-none text-sm text-gray-900 bg-transparent flex-1 placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={13} color="#9CA3AF" />
            </button>
          )}
        </label>

        <button
          onClick={() => setShowFilter(true)}
          className="relative flex items-center gap-1.5 bg-white border rounded-xl px-4 h-10 text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors ml-auto"
          style={{ borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB', color: filterCount > 0 ? PRIMARY : '#374151' }}
        >
          <Filter size={14} />
          Filter
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

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 820 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Holiday Name', 'Holiday Date', 'Holiday Type', 'Description', 'Optional', 'Days Left', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-white whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Loading */}
              {loading && Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}

              {/* Empty */}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-gray-400">
                    {search || filterCount
                      ? 'No holidays match your search or filters.'
                      : 'No holidays found. Add your first holiday.'}
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading && filtered.map((row, idx) => {
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
                        {row.description || '—'}
                      </p>
                    </td>

                    {/* Optional */}
                    <td className="px-5 py-4 border-b border-gray-50 text-center">
                      {row.isOptional ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                          YES
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Days Left */}
                    <td className="px-5 py-4 border-b border-gray-50 whitespace-nowrap">
                      {dl === null ? (
                        <span className="text-xs text-gray-400">—</span>
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

                    {/* Actions */}
                    <td className="px-5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5">
                        {/* Edit — ADMIN + HR */}
                        <button
                          onClick={() => { setEditTarget(row); setModalMode('edit') }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 transition-all"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Delete — ADMIN only */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && (
          <Pagination
            current={page}
            total={totalElements}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            onChange={setPage}
          />
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <HolidayModal
          mode={modalMode}
          initial={modalMode === 'edit' ? editTarget : null}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          onSave={modalMode === 'add' ? handleAdd : handleEdit}
        />
      )}

      {/* ── Delete Modal — ADMIN only ─────────────────────────── */}
      {deleteTarget && isAdmin && (
        <DeleteModal
          holiday={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* ── Filter Modal ─────────────────────────────────────── */}
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