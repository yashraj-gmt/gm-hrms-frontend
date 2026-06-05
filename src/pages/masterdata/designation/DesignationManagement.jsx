// src/pages/masterdata/designation/DesignationManagement.jsx
//
// Changes from previous version:
//  1. Fetches ALL records once (no server-side pagination) so stats, search,
//     and filter always reflect the full dataset.
//  2. Client-side pagination with PAGE_SIZE = 10.
//  3. Stats (Total / Active / Inactive) are computed from the full list.
//  4. Search and filter work across all rows, not just the current page.
//  5. Deleted records are excluded from the list (backend now uses a
//     `deleted` flag instead of just setting active = false).
//  6. Responsive layout fixes: wrapping header, stat cards, toolbar, table
//     scroll, and pagination text.

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  MoreVertical, Pencil, Trash2, X, CheckCircle, XCircle,
  Building2, ClipboardList, RefreshCw,
} from 'lucide-react'
import { useToast }       from '@/components/shared/toast/ToastProvider'
import { useAuthStore }   from '@/store/authStore'
import { ROLES }          from '@/constants/roles'
import designationService from '@/services/designationService'

const PRIMARY   = '#C35E33'
const PAGE_SIZE = 10   // ← was 8

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return active ? (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
    >
      <CheckCircle size={11} /> Active
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
    >
      <XCircle size={11} /> Inactive
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[40, 180, 220, 90, 60].map((w, i) => (
        <td key={i} className="px-4 py-4 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded-md" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Action Menu — portal-based so overflow:hidden can't clip it ──────────────
function ActionMenu({ onEdit, onDelete, showDelete }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, right: 0 })
  const btnRef          = useRef(null)
  const menuRef         = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen((p) => !p)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all"
      >
        <MoreVertical size={15} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 99999, minWidth: 144 }}
          className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#C35E33] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>
          {showDelete && (
            <>
              <div className="mx-3 h-px bg-gray-100" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
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

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function DesignationModal({ mode, initial, onClose, onSave }) {
  const overlayRef        = useRef(null)
  const [form, setForm]   = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    active:      initial?.active      ?? true,
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const setField = (k, v) => {
    setForm((p)   => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Designation name is required'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      await onSave({ name: form.name.trim(), description: form.description.trim(), active: form.active })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const isEdit = mode === 'edit'

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ backgroundColor: '#111827' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PRIMARY }}>
              <ClipboardList size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">{isEdit ? 'Edit Designation' : 'Add Designation'}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Designation Name <span style={{ color: PRIMARY }}>*</span>
            </label>
            <input
              type="text" value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Sr Developer"
              className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none transition-colors placeholder:text-gray-400"
              style={{ borderColor: errors.name ? '#EF4444' : '#E5E7EB' }}
              onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
              onBlur={(e)  => { e.target.style.borderColor = errors.name ? '#EF4444' : '#E5E7EB' }}
            />
            {errors.name && <p className="text-[11px] text-red-500 mt-1">⚠ {errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(Roles &amp; Responsibility)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Text…."
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none transition-colors placeholder:text-gray-400"
              onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
              onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
            <div className="flex items-center gap-6">
              {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map(({ label, val }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                  onClick={() => setField('active', val)}>
                  <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                    style={{ borderColor: form.active === val ? PRIMARY : '#D1D5DB', backgroundColor: form.active === val ? PRIMARY : 'transparent' }}>
                    {form.active === val && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center gap-2"
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
            {isEdit ? 'Update Designation' : 'Save Designation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ designation, onClose, onConfirm }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col items-center p-7 text-center" style={{ maxWidth: 400 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#FEE2E2' }}>
          <Trash2 size={24} color="#B91C1C" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Designation</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-800">"{designation.name}"</span>?{' '}
          It will be hidden from this list but retained in the database.
        </p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={async () => {
              setLoading(true)
              try { await onConfirm(designation.id); onClose() }
              finally { setLoading(false) }
            }}
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

// ─── Client-side Pagination ───────────────────────────────────────────────────
function Pagination({ current, total, pageSize, totalPages, onChange }) {
  if (totalPages <= 1) return null

  // Show at most 5 page buttons around current
  const range = []
  const delta = 2
  for (
    let i = Math.max(1, current - delta);
    i <= Math.min(totalPages, current + delta);
    i++
  ) range.push(i)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing{' '}
        <span className="font-semibold text-gray-800">
          {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)}
        </span>{' '}
        of <span className="font-semibold text-gray-800">{total}</span>
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => onChange(current - 1)} disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} />
        </button>
        {range[0] > 1 && (
          <>
            <button onClick={() => onChange(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border border-gray-200 text-gray-500">1</button>
            {range[0] > 2 && <span className="text-xs text-gray-400 px-1">…</span>}
          </>
        )}
        {range.map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
            style={{
              borderColor: current === p ? PRIMARY : '#E5E7EB',
              backgroundColor: current === p ? PRIMARY : 'transparent',
              color: current === p ? '#fff' : '#6B7280',
            }}>
            {p}
          </button>
        ))}
        {range[range.length - 1] < totalPages && (
          <>
            {range[range.length - 1] < totalPages - 1 && <span className="text-xs text-gray-400 px-1">…</span>}
            <button onClick={() => onChange(totalPages)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border border-gray-200 text-gray-500">{totalPages}</button>
          </>
        )}
        <button onClick={() => onChange(current + 1)} disabled={current === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DesignationManagement() {
  const { toast } = useToast()
  const { user }  = useAuthStore()
  const isAdmin   = user?.role === ROLES.ADMIN

  // allRows = every non-deleted designation from server
  const [allRows,       setAllRows]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [page,          setPage]          = useState(1)
  const [modalMode,     setModalMode]     = useState(null)
  const [editTarget,    setEditTarget]    = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  // ── Fetch ALL non-deleted designations in one go ───────────────────────────
  // We use a large size (e.g. 9999) so every record comes back in one request.
  // Alternatively your backend can expose a /all endpoint; adjust as needed.
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await designationService.getAll(0, 9999)
      // Backend now excludes deleted records, so content is the full live list
      setAllRows(res.data.content ?? [])
    } catch (err) {
      toast.error(err?.message ?? 'Failed to fetch designations.', 'Error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Derived stats from FULL list ───────────────────────────────────────────
  const totalAll    = allRows.length
  const totalActive = allRows.filter((d) => d.active).length
  const totalInactive = allRows.filter((d) => !d.active).length

  // ── Client-side filter + search across ALL rows ────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allRows.filter((d) => {
      const textMatch = !q ||
        d.name.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)

      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && d.active === true) ||
        (statusFilter === 'INACTIVE' && d.active === false)

      return textMatch && statusMatch
    })
  }, [allRows, search, statusFilter])

  // ── Client-side pagination ─────────────────────────────────────────────────
  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage      = Math.min(page, totalPages)
  const pageRows      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1) }, [search, statusFilter])

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleAdd = async (form) => {
    try {
      const res = await designationService.create(form)
      toast.success(res.data?.message ?? 'Designation created successfully.', 'Success')
      fetchAll()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to create designation.', 'Error')
      throw err
    }
  }

  const handleEdit = async (form) => {
    try {
      const res = await designationService.update(editTarget.id, form)
      toast.success(res.data?.message ?? 'Designation updated successfully.', 'Success')
      fetchAll()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update designation.', 'Error')
      throw err
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await designationService.delete(id)
      toast.success(res.data?.message ?? 'Designation deleted successfully.', 'Success')
      fetchAll()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete designation.', 'Error')
      throw err
    }
  }

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 m-0 truncate">Designation Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage all designations and their responsibilities</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchAll}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden xs:inline">Add</span>
            <span className="hidden sm:inline"> Designation</span>
          </button>
        </div>
      </div>

      {/* ── Stats — computed from full list ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        {[
          { label: 'Total',    value: totalAll,      color: '#111827', bg: '#F3F4F6' },
          { label: 'Active',   value: totalActive,   color: '#15803D', bg: '#DCFCE7' },
          { label: 'Inactive', value: totalInactive, color: '#B91C1C', bg: '#FEE2E2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
              <Building2 size={16} color={color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold leading-none" style={{ color }}>
                {loading
                  ? <span className="inline-block w-6 h-5 bg-gray-100 rounded animate-pulse" />
                  : value
                }
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 font-medium truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        {/* Search — grows to fill available space */}
        <label className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-gray-200 cursor-text flex-1 min-w-0" style={{ maxWidth: 320 }}>
          <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designation…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={12} />
            </button>
          )}
        </label>

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
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['#', 'Designation Name', 'Roles & Responsibility', 'Status', 'Action'].map((h) => (
                  <th
                     key={h}
                     className={`px-4 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap ${h === 'Action' ? 'text-center' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)}

              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-gray-400">
                    {search || statusFilter !== 'ALL'
                      ? 'No designations match your search or filters.'
                      : 'No designations found.'}
                  </td>
                </tr>
              )}

              {!loading && pageRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="hover:bg-orange-50 transition-colors"
                  style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                >
                  <td className="px-4 py-3.5 text-xs font-semibold text-gray-400 border-b border-gray-50 w-10">
                    {(safePage - 1) * PAGE_SIZE + idx + 1}
                  </td>

                  <td className="px-4 py-3.5 border-b border-gray-50">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] sm:text-[13px] font-semibold text-gray-900 whitespace-nowrap">{row.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 border-b border-gray-50 max-w-[160px] sm:max-w-xs">
                    {row.description ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] sm:text-[12px] text-gray-600 truncate">{row.description}</span>
                        <button
                          title={row.description}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          <ClipboardList size={11} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[12px] text-gray-300">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 border-b border-gray-50 whitespace-nowrap">
                    <StatusBadge active={row.active} />
                  </td>

                  <td className="px-4 py-3.5 border-b border-gray-50 text-center">
                    <ActionMenu
                      showDelete={isAdmin}
                      onEdit={() => { setEditTarget(row); setModalMode('edit') }}
                      onDelete={() => setDeleteTarget(row)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && (
          <Pagination
            current={safePage}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            onChange={setPage}
          />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <DesignationModal
          mode={modalMode}
          initial={modalMode === 'edit' ? editTarget : null}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          onSave={modalMode === 'add' ? handleAdd : handleEdit}
        />
      )}

      {deleteTarget && isAdmin && (
        <DeleteModal
          designation={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}