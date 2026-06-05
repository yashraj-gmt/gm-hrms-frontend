// src/pages/masterdata/breakpolicy/BreakPolicies.jsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Search, Filter, Plus, X, Clock, ChevronDown,
  Coffee, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  MoreVertical, Pencil,
} from 'lucide-react'
import FilterModal        from '@/components/shared/FilterModal'
import ConfirmModal       from '@/components/shared/ConfirmModal'
import { useToast }       from '@/components/shared/toast/ToastProvider'
import { useAuthStore }   from '@/store/authStore'
import { ROLES }          from '@/constants/roles'
import breakPolicyService from '@/services/breakPolicyService'

const PRIMARY       = '#C35E33'
const PRIMARY_DARK  = '#A34A24'
const PRIMARY_LIGHT = '#FDE8DD'
const PAGE_SIZE     = 10

// Filter config
const FILTER_CONFIG = [
  { key: 'category',  label: 'Category',   type: 'multi', options: ['Fixed', 'Flexible']  },
  { key: 'breakType', label: 'Break Type', type: 'multi', options: ['Paid', 'Unpaid']      },
]

// ─── Field mapping helpers ────────────────────────────────────────────────────
function toRow(dto) {
  return {
    id:        dto.id,
    name:      dto.breakName,
    category:  dto.breakCategory === 'FIXED' ? 'Fixed' : 'Flexible',
    startTime: dto.breakStart  ?? '--',
    endTime:   dto.breakEnd    ?? '--',
    duration:  dto.breakDurationMinutes ?? 0,
    breakType: dto.isPaid ? 'Paid' : 'Unpaid',
    status:    dto.isActive ? 'Active' : 'Inactive',
    _raw:      dto,
  }
}

function toPayload(form, includeIsActive = false) {
  const durationMin =
    parseInt(form.durationHH || 0) * 60 + parseInt(form.durationMM || 0)
  const isFlexible = form.category === 'Flexible'
  const payload = {
    breakName:            form.name.trim(),
    breakCategory:        form.category.toUpperCase(),
    breakStart:           isFlexible ? null : (form.startTime || null),
    breakEnd:             isFlexible ? null : (form.endTime   || null),
    breakDurationMinutes: durationMin || null,
    isPaid:               form.breakType === 'Paid',
  }
  if (includeIsActive) {
    payload.isActive = form.isActive
  }
  return payload
}

function rowToForm(row) {
  const raw      = row._raw
  const totalMin = raw.breakDurationMinutes ?? 0
  return {
    name:       raw.breakName,
    category:   raw.breakCategory === 'FIXED' ? 'Fixed' : 'Flexible',
    startTime:  raw.breakStart ?? '',
    endTime:    raw.breakEnd   ?? '',
    durationHH: String(Math.floor(totalMin / 60)).padStart(2, '0'),
    durationMM: String(totalMin % 60).padStart(2, '0'),
    breakType:  raw.isPaid ? 'Paid' : 'Unpaid',
    isActive:   raw.isActive ?? true,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDuration(min) {
  if (!min) return '-'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function fmtTime(t) {
  if (!t || t === '--') return '-'
  const parts = t.split(':')
  if (parts.length < 2) return t
  let h = parseInt(parts[0])
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`
}

function StatusBadge({ status }) {
  const active = status === 'Active'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: active ? '#DCFCE7' : '#FEE2E2', color: active ? '#15803D' : '#B91C1C' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? '#16A34A' : '#DC2626' }} />
      {status}
    </span>
  )
}

function CategoryBadge({ category }) {
  const fixed = category === 'Fixed'
  return (
    <span
      className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold"
      style={{ backgroundColor: fixed ? '#DBEAFE' : '#F5F3FF', color: fixed ? '#1D4ED8' : '#6D28D9' }}
    >
      {category}
    </span>
  )
}

// ─── Three-dots Action Menu ───────────────────────────────────────────────────
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
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all"
      >
        <MoreVertical size={15} />
      </button>

      {/* Dropdown — opens upward when near bottom to prevent clipping */}
      {open && (
        <div
          className={`absolute right-0 z-30 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 ${
            openUpward ? 'bottom-full mb-1' : 'top-9'
          }`}
        >
          {/* Edit */}
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#C35E33] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>

          {/* Delete — ADMIN only */}
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

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
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

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[44, 28, 24, 24, 20, 16, 20, 16].map((w, i) => (
        <td key={i} className="px-5 py-4 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded" style={{ width: `${w * 3}px` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', category: 'Fixed', startTime: '', endTime: '',
  durationHH: '00', durationMM: '00', breakType: 'Paid', isActive: true,
}

function BreakFormModal({ initial, onClose, onSaved }) {
  const { toast }  = useToast()
  const overlayRef = useRef(null)
  const isEdit     = !!initial

  const [form,    setForm]    = useState(initial ? rowToForm(initial) : EMPTY_FORM)
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  const isFlexible = form.category === 'Flexible'

  // Auto-calculate duration when both start and end times are set for Fixed breaks
  const isDurationLocked = !isFlexible && !!form.startTime && !!form.endTime

  useEffect(() => {
    if (!isFlexible && form.startTime && form.endTime) {
      const [sh, sm] = form.startTime.split(':').map(Number)
      const [eh, em] = form.endTime.split(':').map(Number)
      const diff = (eh * 60 + em) - (sh * 60 + sm)
      const clampedDiff = Math.max(0, diff)
      setForm((p) => ({
        ...p,
        durationHH: String(Math.floor(clampedDiff / 60)).padStart(2, '0'),
        durationMM: String(clampedDiff % 60).padStart(2, '0'),
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startTime, form.endTime, isFlexible])

  // When switching to Flexible, clear times
  useEffect(() => {
    if (isFlexible) {
      setForm((p) => ({ ...p, startTime: '', endTime: '' }))
      setErrors((p) => ({ ...p, startTime: '', endTime: '' }))
    }
  }, [isFlexible])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Break name is required'

    if (!isFlexible) {
      if (!form.startTime) {
        e.startTime = 'Start time is required for Fixed breaks'
      }
      if (!form.endTime) {
        e.endTime = 'End time is required for Fixed breaks'
      }
      if (form.startTime && form.endTime) {
        const [sh, sm] = form.startTime.split(':').map(Number)
        const [eh, em] = form.endTime.split(':').map(Number)
        if ((eh * 60 + em) <= (sh * 60 + sm)) {
          e.endTime = 'End time must be after start time'
        }
      }
    }

    // Only validate duration manually when it's not auto-calculated
    if (!isDurationLocked) {
      const totalMin = parseInt(form.durationHH || 0) * 60 + parseInt(form.durationMM || 0)
      if (!totalMin) e.duration = 'Duration must be greater than 0'
    }

    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const payload = toPayload(form, isEdit)   // isActive only sent on edit
      const res = isEdit
        ? await breakPolicyService.update(initial.id, payload)
        : await breakPolicyService.create(payload)
      toast.success(
        isEdit ? 'Break policy updated.' : 'Break policy created.',
        isEdit ? 'Updated!'              : 'Created!',
      )
      onSaved(res.data)
      onClose()
    } catch (err) {
      toast.error(err?.message ?? 'Something went wrong.', 'Error')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = 'w-full h-10 px-3.5 text-sm text-gray-800 bg-white border-2 rounded-xl outline-none transition-colors placeholder:text-gray-400'
  const borderClr = { borderColor: PRIMARY + '40' }
  const errBorder = { borderColor: '#EF4444' }

  const SelectField = ({ value, onChange, options }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3.5 pr-8 text-sm text-gray-800 bg-white border-2 rounded-xl outline-none appearance-none cursor-pointer"
        style={borderClr}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} color="#9CA3AF" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: 700, margin: '0 16px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: PRIMARY_LIGHT }}>
              <Coffee size={17} color={PRIMARY} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Break Policy' : 'Add Break Policy'}
              </h2>
              <p className="text-[11px] text-gray-400">Fill in the break policy details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="rounded-2xl border-2 p-5 space-y-5" style={{ borderColor: PRIMARY + '50' }}>

            {/* Row 1: Name | Category | Start | End */}
            <div className="grid grid-cols-4 gap-4">
              {/* Break Name */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">
                  Break Name <span style={{ color: PRIMARY }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Lunch Break"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputBase}
                  style={errors.name ? errBorder : borderClr}
                />
                {errors.name && <p className="text-[10px] text-red-500 mt-1">⚠ {errors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">Break Category</label>
                <SelectField
                  value={form.category}
                  onChange={(v) => set('category', v)}
                  options={['Fixed', 'Flexible']}
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">
                  Start Time {!isFlexible && <span style={{ color: PRIMARY }}>*</span>}
                </label>
                <input
                  type="time"
                  value={isFlexible ? '' : form.startTime}
                  disabled={isFlexible}
                  onChange={(e) => set('startTime', e.target.value)}
                  className={`${inputBase} ${isFlexible ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={errors.startTime ? errBorder : borderClr}
                />
                {errors.startTime && <p className="text-[10px] text-red-500 mt-1">⚠ {errors.startTime}</p>}
              </div>

              {/* End Time */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">
                  End Time {!isFlexible && <span style={{ color: PRIMARY }}>*</span>}
                </label>
                <input
                  type="time"
                  value={isFlexible ? '' : form.endTime}
                  disabled={isFlexible}
                  min={form.startTime || undefined}
                  onChange={(e) => set('endTime', e.target.value)}
                  className={`${inputBase} ${isFlexible ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={errors.endTime ? errBorder : borderClr}
                />
                {errors.endTime && <p className="text-[10px] text-red-500 mt-1">⚠ {errors.endTime}</p>}
              </div>
            </div>

            {/* Row 2: Duration | Break Type | hint or status toggle */}
            <div className="grid grid-cols-4 gap-4 items-start">
              {/* Duration — auto-calculated and locked when both times are set */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">
                  Duration (HH : MM){' '}
                  {!isDurationLocked && <span style={{ color: PRIMARY }}>*</span>}
                  {isDurationLocked && (
                    <span className="ml-1 text-[9px] font-normal" style={{ color: PRIMARY }}>auto</span>
                  )}
                </label>
                <div
                  className={`flex items-center gap-1.5 h-10 px-3 border-2 rounded-xl ${isDurationLocked ? 'opacity-60' : ''}`}
                  style={errors.duration ? errBorder : borderClr}
                >
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={form.durationHH}
                    disabled={isDurationLocked}
                    onChange={(e) => set('durationHH', String(e.target.value).padStart(2, '0'))}
                    className="w-8 text-sm font-semibold text-gray-800 border-none outline-none bg-transparent text-center disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-400 text-sm font-bold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={form.durationMM}
                    disabled={isDurationLocked}
                    onChange={(e) => set('durationMM', String(e.target.value).padStart(2, '0'))}
                    className="w-8 text-sm font-semibold text-gray-800 border-none outline-none bg-transparent text-center disabled:cursor-not-allowed"
                  />
                  <Clock size={14} color={PRIMARY} className="ml-auto flex-shrink-0" />
                </div>
                {errors.duration && <p className="text-[10px] text-red-500 mt-1">⚠ {errors.duration}</p>}
                {isDurationLocked && !errors.duration && (
                  <p className="text-[9px] mt-1" style={{ color: PRIMARY }}>Calculated from start/end time</p>
                )}
              </div>

              {/* Break Type */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">Break Type</label>
                <SelectField
                  value={form.breakType}
                  onChange={(v) => set('breakType', v)}
                  options={['Paid', 'Unpaid']}
                />
              </div>

              {/* Flexible hint OR Status toggle (edit mode) */}
              {isFlexible && (
                <div className="col-span-2 flex items-end pb-1">
                  <p
                    className="text-[11px] px-3 py-2 rounded-lg w-full"
                    style={{ color: PRIMARY, backgroundColor: PRIMARY_LIGHT }}
                  >
                    Flexible breaks have no fixed start/end time - duration only applies.
                  </p>
                </div>
              )}

              {!isFlexible && isEdit && (
                <div className="col-span-2 flex items-end pb-1">
                  <div className="w-full">
                    <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block uppercase tracking-wide">
                      Status
                    </label>
                    <button
                      type="button"
                      onClick={() => set('isActive', !form.isActive)}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 text-xs font-semibold transition-all"
                      style={{
                        borderColor:     form.isActive ? '#16A34A' : '#DC2626',
                        backgroundColor: form.isActive ? '#F0FDF4' : '#FEF2F2',
                        color:           form.isActive ? '#15803D' : '#B91C1C',
                      }}
                    >
                      {form.isActive
                        ? <ToggleRight size={16} />
                        : <ToggleLeft  size={16} />
                      }
                      {form.isActive ? 'Active' : 'Inactive'}
                      <span className="font-normal text-gray-400 ml-1">
                        - click to {form.isActive ? 'deactivate' : 'activate'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Flexible + Edit: Status toggle on its own row */}
            {isFlexible && isEdit && (
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block uppercase tracking-wide">
                  Status
                </label>
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor:     form.isActive ? '#16A34A' : '#DC2626',
                    backgroundColor: form.isActive ? '#F0FDF4' : '#FEF2F2',
                    color:           form.isActive ? '#15803D' : '#B91C1C',
                  }}
                >
                  {form.isActive
                    ? <ToggleRight size={16} />
                    : <ToggleLeft  size={16} />
                  }
                  {form.isActive ? 'Active' : 'Inactive'}
                  <span className="font-normal text-gray-400 ml-1">
                    - click to {form.isActive ? 'deactivate' : 'activate'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl border-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
            style={{ borderColor: PRIMARY }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !form.name.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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
            {isEdit ? 'Update Policy' : 'Save Policy'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BreakPolicies() {
  const { toast } = useToast()
  const { user }  = useAuthStore()
  const isAdmin   = user?.role === ROLES.ADMIN

  const [rows,          setRows]          = useState([])
  const [totalElements, setTotalElements] = useState(0)

  // Separate stats — unaffected by search / filter / pagination
  const [stats, setStats] = useState({ total: 0, active: 0, fixed: 0, flexible: 0 })

  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  const [search,        setSearch]        = useState('')
  const [debouncedQ,    setDebouncedQ]    = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [statusFilter,  setStatusFilter]  = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [page,          setPage]          = useState(1)

  const [showForm,      setShowForm]      = useState(false)
  const [editRecord,    setEditRecord]    = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [activeFilters, statusFilter])

  // ── Derive API params from active filters ──────────────────────────────────
  const categoryParam = useMemo(() => {
    const cats = activeFilters.category
    if (!cats?.length || cats.length === 2) return undefined
    return cats[0].toUpperCase()
  }, [activeFilters.category])

  const isActiveParam = useMemo(() => {
    if (statusFilter === 'ALL') return undefined
    return statusFilter === 'ACTIVE'
  }, [statusFilter])

  const isPaidParam = useMemo(() => {
    const bt = activeFilters.breakType
    if (!bt?.length || bt.length === 2) return undefined
    return bt[0] === 'Paid'
  }, [activeFilters.breakType])

  // ── Fetch paginated table data ─────────────────────────────────────────────
  const fetchPolicies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await breakPolicyService.getAll({
        page:     page - 1,
        size:     PAGE_SIZE,
        search:   debouncedQ || undefined,
        category: categoryParam,
        isPaid:   isPaidParam,
        isActive: isActiveParam, 
      })
      const pageData = res.data
      setRows(pageData.content.map(toRow))
      setTotalElements(pageData.totalElements)
    } catch (err) {
      setError(err?.message ?? 'Failed to load break policies.')
      toast.error(err?.message ?? 'Failed to load break policies.', 'Error')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQ, categoryParam, isPaidParam, isActiveParam])

  useEffect(() => { fetchPolicies() }, [fetchPolicies])

  // ── Fetch global stats (independent of search/filter/page) ────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await breakPolicyService.getStats()
      setStats(res.data)
    } catch {
      // Silently ignore — stats are non-critical
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSaved = () => {
    fetchPolicies()
    fetchStats()    // refresh counters after create/edit
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await breakPolicyService.delete(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" has been deleted.`, 'Deleted!')
      setDeleteTarget(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else fetchPolicies()
      fetchStats()  // refresh counters after delete
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete policy.', 'Error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openAdd  = ()    => { setEditRecord(null); setShowForm(true) }
  const openEdit = (row) => { setEditRecord(row);  setShowForm(true) }

  const filterCount = Object.values(activeFilters)
    .filter((v) => Array.isArray(v) ? v.length > 0 : !!v).length

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Break Policies</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage employee break schedules and durations</p>
        </div>

        {/* Refresh + Add — side by side at top-right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchPolicies(); fetchStats() }}
            title="Refresh"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <Plus size={15} strokeWidth={2.5} /> Add Break Policy
          </button>
        </div>
      </div>

      {/* ── Stats — always show global totals, never changes with search ─────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Policies', value: stats.total,    color: '#111827', bg: '#F3F4F6' },
          { label: 'Active',         value: stats.active,   color: '#15803D', bg: '#DCFCE7' },
          { label: 'Fixed',          value: stats.fixed,    color: '#1D4ED8', bg: '#DBEAFE' },
          { label: 'Flexible',       value: stats.flexible, color: '#6D28D9', bg: '#F5F3FF' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Coffee size={18} color={color} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-[10px] text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar (search + filter only; refresh is in header) ─────────────── */}
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
            placeholder="Search break policies…"
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
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={fetchPolicies} className="ml-auto text-xs underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 820 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Break Name', 'Category', 'Start Time', 'End Time', 'Duration', 'Paid', 'Status', 'Actions'].map((h) => (
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
                      <td colSpan={8} className="px-5 py-14 text-center">
                        <Coffee size={32} color="#E5E7EB" className="mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No break policies found.</p>
                      </td>
                    </tr>
                  )
                  : rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="hover:bg-orange-50/50 transition-colors"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                    >
                      <td className="px-5 py-4 border-b border-gray-50">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: PRIMARY_LIGHT }}
                          >
                            <Coffee size={14} color={PRIMARY} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{row.name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 border-b border-gray-50">
                        <CategoryBadge category={row.category} />
                      </td>

                      <td className="px-5 py-4 border-b border-gray-50 text-sm text-gray-600 whitespace-nowrap">
                        {fmtTime(row.startTime)}
                      </td>

                      <td className="px-5 py-4 border-b border-gray-50 text-sm text-gray-600 whitespace-nowrap">
                        {fmtTime(row.endTime)}
                      </td>

                      <td className="px-5 py-4 border-b border-gray-50">
                        <span className="text-sm font-semibold text-gray-800">{fmtDuration(row.duration)}</span>
                      </td>

                      <td className="px-5 py-4 border-b border-gray-50">
                        <span className={`text-sm font-medium ${row.breakType === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>
                          {row.breakType}
                        </span>
                      </td>

                      <td className="px-5 py-4 border-b border-gray-50">
                        <StatusBadge status={row.status} />
                      </td>

                      <td className="px-5 py-4 border-b border-gray-50 text-center">
                        <ActionMenu
                          row={row}
                          canDelete={isAdmin}
                          openUpward={idx >= rows.length - 2}
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteTarget(row)}
                        />
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        <Pagination
          current={page}
          total={totalElements}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {/* Add / Edit Form */}
      {showForm && (
        <BreakFormModal
          initial={editRecord}
          onClose={() => { setShowForm(false); setEditRecord(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation — shared ConfirmModal with company theme */}
      <ConfirmModal
        isOpen={!!deleteTarget && isAdmin}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Break Policy"
        description={`"${deleteTarget?.name}" will be permanently removed from the listing. The record is retained in the database.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

      {/* Filter Panel */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(f) => { setActiveFilters(f); setPage(1) }}
        onReset={() => setActiveFilters({})}
        config={FILTER_CONFIG}
      />
    </>
  )
}