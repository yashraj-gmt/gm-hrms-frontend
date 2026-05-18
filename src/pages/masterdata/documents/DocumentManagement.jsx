// src/pages/masterdata/documents/DocumentManagement.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Search, Plus, MoreVertical, Pencil, Trash2,
  X, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  FileText, Filter, RefreshCw, AlertCircle,
} from 'lucide-react'
import documentService from '@/services/documentService'
import FilterModal      from '@/components/shared/FilterModal'
import ConfirmModal     from '@/components/shared/ConfirmModal'
import { useToast }     from '@/components/shared/toast/ToastProvider'
import { ROLES }        from '@/constants/roles'
import { useAuthStore } from '@/store/authStore'


const PRIMARY   = '#C35E33'
const PAGE_SIZE = 10

// Backend ApplicableType enum values (must match Java enum exactly)
const APPLICABLE_TYPES = ['EMPLOYEE', 'INTERN', 'TRAINEE']
const TYPE_LABEL       = { EMPLOYEE: 'Employee', INTERN: 'Intern', TRAINEE: 'Trainee' }

// Shared FilterModal uses option strings as both value and label,
// so we use display labels and map back to enum values when calling the API.
const FILTER_LABEL_TO_ENUM = { Employee: 'EMPLOYEE', Intern: 'INTERN', Trainee: 'TRAINEE' }

const FILTER_CONFIG = [
  {
    key:     'applicableTypes',
    label:   'Applicable For',
    type:    'multi',
    options: ['Employee', 'Intern', 'Trainee'],  // display labels used by FilterModal chips
  },
]

// ─── Derive enum values from the filter state ─────────────────────────────────
const toEnumTypes = (filters) =>
  (filters.applicableTypes ?? [])
    .map((label) => FILTER_LABEL_TO_ENUM[label])
    .filter(Boolean)

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

// ─── Applicable Type Badges ───────────────────────────────────────────────────
function ApplicableBadges({ types = [] }) {
  const colorMap = {
    EMPLOYEE: { bg: '#EFF6FF', color: '#1D4ED8' },
    INTERN:   { bg: '#F0FDF4', color: '#15803D' },
    TRAINEE:  { bg: '#FDE8DD', color: PRIMARY   },
  }
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => {
        const s = colorMap[t] ?? { bg: '#F3F4F6', color: '#374151' }
        return (
          <span key={t} className="inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
            style={{ backgroundColor: s.bg, color: s.color }}>
            {TYPE_LABEL[t] ?? t}
          </span>
        )
      })}
    </div>
  )
}

// ─── Action Menu ──────────────────────────────────────────────────────────────
function ActionMenu({ onEdit, onDelete, canDelete }) {   
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
        <div className="absolute right-0 top-9 z-30 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#C35E33] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>

          {/* 👇 Only render Delete if the role is allowed */}
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

// ─── Multi-checkbox for applicableTypes (used inside DocumentModal) ───────────
function MultiCheckGroup({ value = [], onChange, error }) {
  const toggle = (type) => {
    const next = value.includes(type) ? value.filter((t) => t !== type) : [...value, type]
    onChange(next)
  }
  return (
    <div>
      <div className="flex items-center gap-5 flex-wrap">
        {APPLICABLE_TYPES.map((type) => {
          const checked = value.includes(type)
          return (
            <label key={type}
              className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
              onClick={() => toggle(type)}>
              <span
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                style={{ borderColor: checked ? PRIMARY : '#D1D5DB', backgroundColor: checked ? PRIMARY : 'transparent' }}
              >
                {checked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {TYPE_LABEL[type]}
            </label>
          )
        })}
      </div>
      {error && (
        <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Document Modal (Add / Edit) ──────────────────────────────────────────────
function DocumentModal({ mode, initial, onClose, onSaved }) {
  const { toast }  = useToast()
  const overlayRef = useRef(null)
  const isEdit     = mode === 'edit'

  const [form, setForm] = useState({
    name:            initial?.name            ?? '',
    key:             initial?.key             ?? '',
    applicableTypes: initial?.applicableTypes
                       ? [...initial.applicableTypes]  // copy the Set/Array
                       : [],
    mandatory:       initial?.mandatory       ?? true,
    active:          initial?.active          ?? true,
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  // Auto-derive key from name in Add mode only
  useEffect(() => {
    if (!isEdit) {
      setForm((p) => ({
        ...p,
        key: p.name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''),
      }))
    }
  }, [form.name, isEdit]) // eslint-disable-line

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, loading])

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())            e.name            = 'Document name is required'
    if (!form.key.trim())             e.key             = 'Document key is required'
    if (!form.applicableTypes.length) e.applicableTypes = 'Select at least one applicable type'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)

    const payload = {
      name:            form.name.trim(),
      key:             form.key.trim(),
      applicableTypes: form.applicableTypes,
      mandatory:       form.mandatory,
      // active is only meaningful on edit (new docs are always active)
      ...(isEdit && { active: form.active }),
    }

    try {
      if (isEdit) {
        await documentService.update(initial.id, payload)
        toast.success(`"${form.name}" updated successfully`, 'Document Updated')
      } else {
        await documentService.create(payload)
        toast.success(`"${form.name}" created successfully`, 'Document Created')
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
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !loading) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 600, margin: '0 16px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
              <FileText size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">
              {isEdit ? 'Edit Document' : 'Create Document'}
            </h2>
          </div>
          <button onClick={onClose} disabled={loading}
            className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Row 1: Name + Key */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Document Name <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Aadhaar Card"
                className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none transition-colors placeholder:text-gray-400"
                style={{ borderColor: errors.name ? '#EF4444' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e)  => (e.target.style.borderColor = errors.name ? '#EF4444' : '#E5E7EB')} />
              {errors.name && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Document Key <span style={{ color: PRIMARY }}>*</span>
                <span className="ml-1 text-[10px] font-normal text-gray-400">(auto-generated)</span>
              </label>
              <input type="text" value={form.key}
                onChange={(e) => setField('key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="AADHAAR_CARD"
                className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none transition-colors placeholder:text-gray-400 font-mono tracking-wide"
                style={{ borderColor: errors.key ? '#EF4444' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e)  => (e.target.style.borderColor = errors.key ? '#EF4444' : '#E5E7EB')} />
              {errors.key && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.key}
                </p>
              )}
            </div>
          </div>

          {/* Applicable For */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Applicable For <span style={{ color: PRIMARY }}>*</span>
            </label>
            <MultiCheckGroup
              value={form.applicableTypes}
              onChange={(v) => setField('applicableTypes', v)}
              error={errors.applicableTypes}
            />
          </div>

          {/* Mandatory + Status (status only in Edit) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Mandatory</label>
              <div className="flex items-center gap-6 mt-1">
                {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
                  <label key={label}
                    className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                    onClick={() => setField('mandatory', val)}>
                    <span
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor:     form.mandatory === val ? PRIMARY : '#D1D5DB',
                        backgroundColor: form.mandatory === val ? PRIMARY : 'transparent',
                      }}
                    >
                      {form.mandatory === val && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/*
              Status toggle — only shown in Edit mode.
              Allows manually marking a document as Active or Inactive without deleting it.
              "Delete" (from the action menu) is a separate, permanent soft-delete operation.
            */}
            {isEdit && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
                <div className="flex items-center gap-6 mt-1">
                  {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map(({ label, val }) => (
                    <label key={label}
                      className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                      onClick={() => setField('active', val)}>
                      <span
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{
                          borderColor:     form.active === val ? PRIMARY : '#D1D5DB',
                          backgroundColor: form.active === val ? PRIMARY : 'transparent',
                        }}
                      >
                        {form.active === val && <span className="w-2 h-2 rounded-full bg-white" />}
                      </span>
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
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
            {isEdit ? 'Update Document' : 'Save Document'}
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
          <div className="w-8 h-8 rounded-lg bg-gray-100" />
          <div>
            <div className="h-3 w-28 bg-gray-200 rounded mb-1.5" />
            <div className="h-2 w-16 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4 border-b border-gray-50"><div className="h-5 w-28 bg-gray-100 rounded-md" /></td>
      <td className="px-5 py-4 border-b border-gray-50">
        <div className="flex gap-1">
          <div className="h-5 w-16 bg-gray-100 rounded-md" />
          <div className="h-5 w-14 bg-gray-100 rounded-md" />
        </div>
      </td>
      <td className="px-5 py-4 border-b border-gray-50"><div className="h-6 w-16 bg-gray-100 rounded-full" /></td>
      <td className="px-5 py-4 border-b border-gray-50 text-center"><div className="h-8 w-8 bg-gray-100 rounded-lg mx-auto" /></td>
    </tr>
  ))
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
        <FileText size={18} color={color} />
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
  for (let i = Math.max(0, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
    pages.push(i)
  }
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-800">{startItem}–{endItem}</span> of{' '}
        <span className="font-semibold text-gray-800">{totalElements}</span>
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
export default function DocumentManagement() {
  const { toast } = useToast()
  const user      = useAuthStore((state) => state.user)
  const canDelete = user?.role === ROLES.ADMIN

  // ── Pagination & data ──────────────────────────────────────────────────────
  const [page,          setPage]          = useState(0)
  const [docs,          setDocs]          = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [tableLoading,  setTableLoading]  = useState(false)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats,        setStats]        = useState({ total: 0, active: 0, inactive: 0 })
  const [statsLoading, setStatsLoading] = useState(false)

  // ── Search (client-side within current page) ───────────────────────────────
  const [search, setSearch] = useState('')

  // ── Filter modal ───────────────────────────────────────────────────────────
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})  // { applicableTypes: ['Employee', ...] }

  // Count active filter groups (for badge on the Filter button)
  const filterCount = Object.values(activeFilters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [modalMode,    setModalMode]    = useState(null)   // 'add' | 'edit' | null
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async (currentPage, enumTypes = []) => {
    setTableLoading(true)
    try {
      const res      = await documentService.getAll(currentPage, PAGE_SIZE, enumTypes)
      const pageData = res?.data ?? {}
      setDocs(pageData.content       ?? [])
      setTotalElements(pageData.totalElements ?? 0)
      setTotalPages(pageData.totalPages    ?? 0)
    } catch (err) {
      toast.error(err?.message ?? 'Failed to load documents', 'Fetch Error')
      setDocs([])
    } finally {
      setTableLoading(false)
    }
  }, [toast])

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await documentService.getStats()
      setStats(res?.data ?? { total: 0, active: 0, inactive: 0 })
    } catch { /* non-critical */ }
    finally { setStatsLoading(false) }
  }, [])

  // Initial load
  useEffect(() => { fetchDocs(0, []); fetchStats() }, []) // eslint-disable-line

  // ── Filter apply / reset ───────────────────────────────────────────────────
  const handleApplyFilter = useCallback((filters) => {
    setActiveFilters(filters)
    setPage(0)
    fetchDocs(0, toEnumTypes(filters))
  }, [fetchDocs])

  const handleResetFilter = useCallback(() => {
    setActiveFilters({})
    setPage(0)
    fetchDocs(0, [])
  }, [fetchDocs])

  // ── Pagination ─────────────────────────────────────────────────────────────
  const handlePageChange = (p) => {
    setPage(p)
    fetchDocs(p, toEnumTypes(activeFilters))
  }

  // ── Refresh (respects current filters) ────────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchDocs(page, toEnumTypes(activeFilters))
    fetchStats()
  }, [fetchDocs, fetchStats, page, activeFilters])

  // ── Delete (soft-delete: deleted=true, disappears from listing) ────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await documentService.delete(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" has been deleted`, 'Deleted')
      setDeleteTarget(null)
      // If we just deleted the last item on a non-first page, go back one page
      const remainingOnPage = docs.length - 1
      const targetPage = remainingOnPage === 0 && page > 0 ? page - 1 : page
      setPage(targetPage)
      fetchDocs(targetPage, toEnumTypes(activeFilters))
      fetchStats()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete document', 'Delete Failed')
    } finally {
      setDeleting(false)
    }
  }

  // ── Client-side search within current page ─────────────────────────────────
  const filteredDocs = useMemo(() => {
    if (!search.trim()) return docs
    const q = search.toLowerCase()
    return docs.filter((d) =>
      d.name?.toLowerCase().includes(q) || d.key?.toLowerCase().includes(q)
    )
  }, [docs, search])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Document Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage all required documents and their configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={tableLoading}
            title="Refresh"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={tableLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <Plus size={15} strokeWidth={2.5} /> Create Document
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Documents"    value={stats.total}    color="#111827" bg="#F3F4F6" loading={statsLoading} />
        <StatCard label="Active Documents"   value={stats.active}   color="#15803D" bg="#DCFCE7" loading={statsLoading} />
        <StatCard label="Inactive Documents" value={stats.inactive} color="#B91C1C" bg="#FEE2E2" loading={statsLoading} />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <label
          className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-gray-200 cursor-text flex-1"
          style={{ maxWidth: 380 }}
        >
          <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or key…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full"
            onFocus={(e) => (e.target.parentElement.style.borderColor = PRIMARY)}
            onBlur={(e)  => (e.target.parentElement.style.borderColor = '#E5E7EB')}
          />
          {search && (
            <button onClick={() => setSearch('')} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={12} />
            </button>
          )}
        </label>

        {/* Filter button — opens shared FilterModal */}
        <button
          onClick={() => setShowFilter(true)}
          className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-10 text-[13px] font-medium cursor-pointer hover:bg-gray-50 ml-auto transition-colors"
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

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Document Name', 'Key', 'Applicable For', 'Status', 'Action'].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap ${h === 'Action' ? 'text-center' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <TableSkeleton />
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-gray-400">
                    {search
                      ? `No documents match "${search}"`
                      : filterCount > 0
                        ? 'No documents match the selected filters.'
                        : 'No documents found. Click "Create Document" to add one.'}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                  >
                    <td className="px-5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: row.active ? '#FDE8DD' : '#F3F4F6' }}
                        >
                          <FileText size={15} color={row.active ? PRIMARY : '#9CA3AF'} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900 leading-none">{row.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {row.mandatory ? '⚡ Mandatory' : 'Optional'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 border-b border-gray-50 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {row.key}
                      </span>
                    </td>

                    <td className="px-5 py-4 border-b border-gray-50">
                      <ApplicableBadges types={row.applicableTypes ?? []} />
                    </td>

                    <td className="px-5 py-4 border-b border-gray-50 whitespace-nowrap">
                      <StatusBadge active={row.active} />
                    </td>

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

      {/* ── Document Add / Edit Modal ────────────────────────────────────── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <DocumentModal
          mode={modalMode}
          initial={modalMode === 'edit' ? editTarget : null}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          onSaved={handleRefresh}
        />
      )}

      {/* ── Delete Confirm (shared ConfirmModal, danger variant) ──────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
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

      {/* ── Filter Panel (shared FilterModal) ────────────────────────────── */}
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