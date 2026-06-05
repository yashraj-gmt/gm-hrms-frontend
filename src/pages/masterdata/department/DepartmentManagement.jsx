// src/pages/masterdata/department/DepartmentManagement.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import {
  Search, Plus, MoreVertical, Pencil, Trash2,
  X, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Building2, ChevronRight as ChevronRightIcon, Trash,
  RefreshCw, AlertCircle,
} from 'lucide-react'
import { useToast }   from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROLES }        from '@/constants/roles'
import departmentService from '@/services/departmentService'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'
const PAGE_SIZE    = 10   // fix #4: increased from 8 → 10

// ─── Helpers ──────────────────────────────────────────────────────────────────
const StatusBadge = ({ active }) =>
  active ? (
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

// ─── Action Menu — fix #3: portal-based dropdown, no clipping ────────────────
function ActionMenu({ onEdit, onDelete, canDelete }) {
  const [open,      setOpen]      = useState(false)
  const [menuStyle, setMenuStyle] = useState({})
  const btnRef  = useRef(null)
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const h = (e) => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect       = btnRef.current.getBoundingClientRect()
      const menuHeight = canDelete ? 92 : 44
      const spaceBelow = window.innerHeight - rect.bottom

      setMenuStyle({
        position : 'fixed',
        right    : window.innerWidth - rect.right,
        zIndex   : 9999,
        ...(spaceBelow < menuHeight + 12
          ? { bottom: window.innerHeight - rect.top + 4 }  // open upward
          : { top: rect.bottom + 4 }),                     // open downward
      })
    }
    setOpen((p) => !p)
  }

  const menu = open
    ? ReactDOM.createPortal(
        <div ref={menuRef} style={menuStyle}
          className="w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#C35E33] transition-colors">
            <Pencil size={13} /> Edit
          </button>
          {canDelete && (
            <>
              <div className="mx-3 h-px bg-gray-100" />
              <button
                onClick={() => { onDelete(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )
    : null

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all">
        <MoreVertical size={15} />
      </button>
      {menu}
    </>
  )
}

// ─── Sub-department form row ──────────────────────────────────────────────────
function SubDeptFormRow({ sub, onChange, onRemove, index, parentInactive }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-3 relative bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-600">
          Sub-Department {String(index + 1).padStart(2, '0')}
        </span>
        <button onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
          <Trash size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Sub-Department Name <span style={{ color: PRIMARY }}>*</span>
          </label>
          <input type="text" value={sub.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. Recruitment"
            className="w-full h-9 px-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg outline-none placeholder:text-gray-400 transition-colors"
            onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
            onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Sub-Department Code <span style={{ color: PRIMARY }}>*</span>
          </label>
          <input type="text" value={sub.code}
            onChange={(e) => onChange('code', e.target.value)}
            placeholder="e.g. HR003-A"
            className="w-full h-9 px-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg outline-none placeholder:text-gray-400 transition-colors"
            onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
            onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }} />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Description</label>
        <input type="text" value={sub.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Short description…"
          className="w-full h-9 px-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg outline-none placeholder:text-gray-400 transition-colors"
          onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
          onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }} />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
          Status
          {parentInactive && (
            <span className="ml-2 text-red-500 font-normal">(locked — parent is Inactive)</span>
          )}
        </label>
        <div className="flex items-center gap-5">
          {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map(({ label, val }) => (
            <label key={label}
              onClick={() => !parentInactive && onChange('status', val)}
              className={`flex items-center gap-1.5 select-none text-xs text-gray-600 ${parentInactive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor:     sub.status === val ? PRIMARY : '#D1D5DB',
                  backgroundColor: sub.status === val ? PRIMARY : 'transparent',
                }}>
                {sub.status === val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Add / Edit Department Modal ──────────────────────────────────────────────
function DepartmentModal({ mode, initial, onClose, onSaved }) {
  const { toast }  = useToast()
  const overlayRef = useRef(null)
  const isEdit     = mode === 'edit'

  // fix #5: use useRef for the temp-key counter so it never resets between renders
  const tmpIdRef = useRef(-1)

  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    code:        initial?.code        ?? '',
    description: initial?.description ?? '',
    status:      initial?.status      ?? true,
  })

  const [subDepts, setSubDepts] = useState(
    initial?.subDepartments?.map((s) => ({
      _key:        s.id,
      id:          s.id,
      name:        s.name,
      code:        s.code,
      description: s.description ?? '',
      status:      s.status,
    })) ?? []
  )
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // fix #1 (frontend): auto-cascade sub-dept status when parent status changes
  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))

    if (k === 'status' && v === false) {
      // Parent switched to Inactive → force all sub-depts Inactive
      setSubDepts((prev) => prev.map((s) => ({ ...s, status: false })))
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Department name is required'
    if (!form.code.trim()) e.code = 'Department code is required'
    subDepts.forEach((s, i) => {
      if (!s.name.trim()) e[`sub_name_${i}`] = 'Name required'
      if (!s.code.trim()) e[`sub_code_${i}`] = 'Code required'
    })
    return e
  }

  // fix #5: use tmpIdRef instead of a plain let variable
  const addSubDept = () => {
    const newKey = --tmpIdRef.current
    setSubDepts((p) => [
      ...p,
      {
        _key:        newKey,
        id:          null,
        name:        '',
        code:        '',
        description: '',
        status:      form.status,  // inherit parent status
      },
    ])
  }

  const updateSubDept = (key, field, value) =>
    setSubDepts((p) => p.map((s) => (s._key === key ? { ...s, [field]: value } : s)))

  const removeSubDept = (key) =>
    setSubDepts((p) => p.filter((s) => s._key !== key))

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const payload = {
        name:        form.name.trim(),
        code:        form.code.trim(),
        description: form.description.trim(),
        status:      form.status,
        subDepartments: subDepts.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          name:        s.name.trim(),
          code:        s.code.trim(),
          description: s.description.trim(),
          status:      s.status,
        })),
      }

      const res = isEdit
        ? await departmentService.update(initial.id, payload)
        : await departmentService.create(payload)

      toast.success(
        isEdit ? 'Department updated successfully.' : 'Department created successfully.',
        isEdit ? 'Updated!'                         : 'Created!'
      )
      onSaved(res.data)
      onClose()
    } catch (err) {
      toast.error(err?.message ?? 'Something went wrong.', 'Error')
    } finally {
      setLoading(false)
    }
  }

  const parentInactive = form.status === false

  return (
    <div ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 640, maxHeight: '90vh', margin: '0 16px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ backgroundColor: '#111827' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}>
              <Building2 size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">
              {isEdit ? 'Edit Department' : 'Add Department'}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="border rounded-xl p-5 mb-5" style={{ borderColor: PRIMARY }}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Department Name <span style={{ color: PRIMARY }}>*</span>
                </label>
                <input type="text" value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Enter Department Name"
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none placeholder:text-gray-400 transition-colors"
                  style={{ borderColor: errors.name ? '#EF4444' : '#E5E7EB' }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.name ? '#EF4444' : '#E5E7EB' }} />
                {errors.name && <p className="text-[11px] text-red-500 mt-1">⚠ {errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Department Code <span style={{ color: PRIMARY }}>*</span>
                </label>
                <input type="text" value={form.code}
                  onChange={(e) => setField('code', e.target.value)}
                  placeholder="e.g. HR003"
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none placeholder:text-gray-400 transition-colors"
                  style={{ borderColor: errors.code ? '#EF4444' : '#E5E7EB' }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.code ? '#EF4444' : '#E5E7EB' }} />
                {errors.code && <p className="text-[11px] text-red-500 mt-1">⚠ {errors.code}</p>}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Text…." rows={3}
                className="w-full px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none placeholder:text-gray-400 transition-colors"
                onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
              <div className="flex items-center gap-6">
                {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map(({ label, val }) => (
                  <label key={label} onClick={() => setField('status', val)}
                    className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor:     form.status === val ? PRIMARY : '#D1D5DB',
                        backgroundColor: form.status === val ? PRIMARY : 'transparent',
                      }}>
                      {form.status === val && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    {label}
                  </label>
                ))}
              </div>
              {parentInactive && subDepts.length > 0 && (
                <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} />
                  All sub-departments have been set to Inactive automatically.
                </p>
              )}
            </div>
          </div>

          {/* Sub-Departments */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: PRIMARY }}>Sub-Departments</p>
            {subDepts.map((sub, idx) => (
              <SubDeptFormRow
                key={sub._key}
                sub={sub}
                index={idx}
                parentInactive={parentInactive}  // fix #1: pass lock flag
                onChange={(field, value) => updateSubDept(sub._key, field, value)}
                onRemove={() => removeSubDept(sub._key)}
              />
            ))}
            <button onClick={addSubDept}
              className="w-full flex items-center justify-center gap-2 h-10 border-2 border-dashed rounded-xl text-sm font-medium transition-colors"
              style={{ borderColor: PRIMARY, color: PRIMARY }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FDE8DD' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
              <Plus size={15} /> Add Sub-Department
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={loading}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#111827')}>
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isEdit ? 'Update Department' : 'Save Department'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ dept, onClose, onConfirm, loading }) {
  const overlayRef = useRef(null)
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col items-center p-8 text-center"
        style={{ maxWidth: 400, margin: '0 16px' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: '#FEE2E2' }}>
          <Trash2 size={24} color="#B91C1C" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Department</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-800">"{dept.name}"</span>?
          This action will also deactivate all associated sub-departments.
        </p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
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

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
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
        <button onClick={() => onChange(current - 1)} disabled={current === 1}
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
            {p}
          </button>
        ))}
        <button onClick={() => onChange(current + 1)} disabled={current === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
      {[10, 24, 36, 20, 48, 20, 12].map((w, i) => (
        <td key={i} className="px-4 py-4 border-b border-gray-100">
          <div className="h-4 bg-gray-100 rounded" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepartmentManagement() {
  const { toast }   = useToast()
  const { user }    = useAuthStore()
  const isAdmin     = user?.role === ROLES.ADMIN

  // ── Server-driven state ───────────────────────────────────────────────────
  const [departments,   setDepartments]   = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  // fix #2: real global counts from API
  const [globalActive,  setGlobalActive]  = useState(0)
  const [globalInactive,setGlobalInactive]= useState(0)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter,    setStatusFilter]    = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [page,            setPage]            = useState(1)
  const [expandedIds,     setExpandedIds]     = useState(new Set())

  const [modalMode,     setModalMode]     = useState(null)
  const [editTarget,    setEditTarget]    = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [statusFilter])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const statusParam = statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE'
      const res = await departmentService.getAll({
        page:   page - 1,
        size:   PAGE_SIZE,
        search: debouncedSearch,
        status: statusParam,
      })
      const pageData = res.data
      setDepartments(pageData.content)
      setTotalElements(pageData.totalElements)
      setTotalPages(pageData.totalPages)
      // fix #2: use real global stats from backend
      setGlobalActive(pageData.totalActive   ?? 0)
      setGlobalInactive(pageData.totalInactive ?? 0)
    } catch (err) {
      setError(err?.message ?? 'Failed to load departments.')
      toast.error(err?.message ?? 'Failed to load departments.', 'Error')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { fetchDepartments() }, [fetchDepartments])

  // ── Expand / collapse ─────────────────────────────────────────────────────
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaved = () => fetchDepartments()

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await departmentService.delete(deleteTarget.id)
      toast.success('Department deleted successfully.', 'Deleted!')
      setDeleteTarget(null)
      if (departments.length === 1 && page > 1) setPage((p) => p - 1)
      else fetchDepartments()
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete department.', 'Error')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header — fix #7: refresh button moved here, left of Add Department ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Department Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage departments and their sub-departments</p>
        </div>
        <div className="flex items-center gap-2">
          {/* fix #7: Refresh button repositioned to top-right */}
          <button onClick={fetchDepartments} title="Refresh"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}>
            <Plus size={15} strokeWidth={2.5} /> Add Department
          </button>
        </div>
      </div>

      {/* Stats — fix #2: global counts, not page-level */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Departments', value: globalActive + globalInactive, color: '#111827', bg: '#F3F4F6' },
          { label: 'Active',            value: globalActive,                  color: '#15803D', bg: '#DCFCE7' },
          { label: 'Inactive',          value: globalInactive,                color: '#B91C1C', bg: '#FEE2E2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Building2 size={18} color={color} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar — fix #7: refresh removed from here */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <label className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-gray-200 cursor-text flex-1"
          style={{ maxWidth: 420 }}>
          <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code or sub-department…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full"
            onFocus={(e) => { e.target.parentElement.style.borderColor = PRIMARY }}
            onBlur={(e)  => { e.target.parentElement.style.borderColor = '#E5E7EB' }} />
          {search && (
            <X size={13} color="#9CA3AF" className="cursor-pointer flex-shrink-0"
              onClick={() => setSearch('')} />
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

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={fetchDepartments} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Table — fix #3: overflow-y visible so portal dropdown is never clipped */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
          <table className="w-full border-collapse" style={{ minWidth: 820 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['', 'Dept Code', 'Department Name', 'Sub-depts', 'Description', 'Status', 'Action'].map((h) => (
                  <th key={h}
                    className={`px-4 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap ${h === 'Action' ? 'text-center' : ''} ${h === '' ? 'w-10' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
                : departments.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <Building2 size={32} color="#E5E7EB" className="mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No departments found.</p>
                      </td>
                    </tr>
                  )
                  : departments.map((dept, idx) => {
                      const isExpanded = expandedIds.has(dept.id)
                      const subCount   = dept.subDepartments?.length ?? 0
                      return (
                        <>
                          <tr key={dept.id}
                            className="hover:bg-orange-50 transition-colors cursor-pointer"
                            style={{ backgroundColor: isExpanded ? '#FFF7F4' : idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                            onClick={() => subCount > 0 && toggleExpand(dept.id)}>

                            <td className="px-4 py-4 border-b border-gray-100 w-10">
                              {subCount > 0 ? (
                                <span className="w-6 h-6 flex items-center justify-center rounded-md"
                                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 220ms ease' }}>
                                  <ChevronRightIcon size={15} color={PRIMARY} strokeWidth={2.5} />
                                </span>
                              ) : (
                                <span className="w-6 h-6 flex items-center justify-center text-gray-200">
                                  <ChevronRightIcon size={13} strokeWidth={2} />
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 border-b border-gray-100 whitespace-nowrap">
                              <span className="text-[12px] font-bold" style={{ color: PRIMARY }}>{dept.code}</span>
                            </td>

                            <td className="px-4 py-4 border-b border-gray-100 whitespace-nowrap">
                              <span className="text-[13px] font-semibold text-gray-900">{dept.name}</span>
                            </td>

                            <td className="px-4 py-4 border-b border-gray-100 whitespace-nowrap">
                              <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold"
                                style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
                                {subCount} sub-dept{subCount !== 1 ? 's' : ''}
                              </span>
                            </td>

                            <td className="px-4 py-4 border-b border-gray-100 max-w-xs">
                              <p className="text-[12px] text-gray-600 truncate max-w-[220px]">
                                {dept.description || '—'}
                              </p>
                            </td>

                            <td className="px-4 py-4 border-b border-gray-100 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}>
                              <StatusBadge active={dept.status} />
                            </td>

                            <td className="px-4 py-4 border-b border-gray-100 text-center"
                              onClick={(e) => e.stopPropagation()}>
                              <ActionMenu
                                canDelete={isAdmin}
                                onEdit={() => { setEditTarget(dept); setModalMode('edit') }}
                                onDelete={() => setDeleteTarget(dept)}
                              />
                            </td>
                          </tr>

                          {isExpanded && subCount > 0 && (
                            <tr key={`sub-${dept.id}`}>
                              <td colSpan={7} className="border-b border-gray-100 p-0">
                                <div className="mx-4 my-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="bg-gray-100">
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-36">Sub-Dept Code</th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500">Sub-Department Name</th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500">Description</th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dept.subDepartments.map((sub, si) => (
                                        <tr key={sub.id}
                                          className="border-t border-gray-200 hover:bg-orange-50 transition-colors"
                                          style={{ backgroundColor: si % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                                          <td className="px-4 py-3 text-[11px] font-semibold" style={{ color: PRIMARY }}>{sub.code}</td>
                                          <td className="px-4 py-3 text-[12px] text-gray-700 font-medium">{sub.name}</td>
                                          <td className="px-4 py-3 text-[12px] text-gray-500">{sub.description || '—'}</td>
                                          <td className="px-4 py-3"><StatusBadge active={sub.status} /></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
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

      {/* Modals */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <DepartmentModal
          mode={modalMode}
          initial={modalMode === 'edit' ? editTarget : null}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && isAdmin && (
        <DeleteModal
          dept={deleteTarget}
          loading={deleteLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}