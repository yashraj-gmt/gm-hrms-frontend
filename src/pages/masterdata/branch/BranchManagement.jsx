// src/pages/masterdata/branch/BranchManagement.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search, Filter, Plus, MoreVertical, Pencil, Trash2,
  X, ChevronDown, MapPin, Building, GripVertical, CheckCircle, XCircle,
  Save, RotateCcw, Loader2,
} from 'lucide-react'
import FilterModal        from '@/components/shared/FilterModal'
import ConfirmModal       from '@/components/shared/ConfirmModal'
import { useToast }       from '@/components/shared/toast/ToastProvider'
import branchService      from '@/services/branchService'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'
const COUNTRIES    = ['India', 'USA', 'UK', 'Canada', 'Australia', 'UAE']
const FILTER_CONFIG = [
  { key: 'status', label: 'Status', type: 'multi', options: ['Active', 'Inactive'] },
]

// ─── Map API node → local tree node ──────────────────────────────────────────
const mapApiToLocal = (node) => ({
  id:       node.id,
  code:     node.branchCode           || '',
  name:     node.branchName           || '',
  city:     node.address?.city        || '',
  state:    node.address?.state       || '',
  address:  node.address?.address     || '',
  landmark: node.address?.landmark    || '',
  district: node.address?.district    || '',
  pincode:  node.address?.pinCode     || '',
  country:  node.address?.country     || 'India',
  active:   node.active               ?? true,
  parentId: node.parentId             || null,
  children: (node.children || []).map(mapApiToLocal),
})

// ─── Flatten tree for reorder API payload ─────────────────────────────────────
const flattenForReorder = (nodes, parentId = null) => {
  const result = []
  nodes.forEach((node, index) => {
    result.push({ id: node.id, parentId, sortOrder: index })
    if (node.children?.length) {
      result.push(...flattenForReorder(node.children, node.id))
    }
  })
  return result
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

function findNode(nodes, id, parent = null) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return [nodes[i], parent, i]
    const found = findNode(nodes[i].children, id, nodes[i])
    if (found) return found
  }
  return null
}

function insertAfter(nodes, targetId, nodeToInsert) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) { nodes.splice(i + 1, 0, nodeToInsert); return true }
    if (insertAfter(nodes[i].children, targetId, nodeToInsert)) return true
  }
  return false
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ active }) => active ? (
  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
    style={{ backgroundColor: PRIMARY, color: '#fff' }}>
    <CheckCircle size={11} /> Active
  </span>
) : (
  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
    style={{ backgroundColor: '#111827', color: '#fff' }}>
    <XCircle size={11} /> Inactive
  </span>
)

// ─── Action Menu ──────────────────────────────────────────────────────────────
function ActionMenu({ onEdit, onDelete }) {
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
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:bg-gray-50 transition-all"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-40 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#C35E33] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>
          <div className="mx-3 h-px bg-gray-100" />
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Branch Modal (Add / Edit) ────────────────────────────────────────────────
function BranchModal({ mode, initial, onClose, onSave, loading = false }) {
  const overlayRef = useRef(null)
  const isEdit     = mode === 'edit'

  const blank = {
    name: '', code: '', address: '', landmark: '',
    city: '', district: '', state: '', pincode: '', country: 'India', active: true,
  }
  const [form, setForm]     = useState(
    initial
      ? {
          name:     initial.name,     code:     initial.code,
          address:  initial.address,  landmark: initial.landmark,
          city:     initial.city,     district: initial.district,
          state:    initial.state,    pincode:  initial.pincode,
          country:  initial.country,  active:   initial.active,
        }
      : blank
  )
  const [errors, setErrors] = useState({})

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
    if (!form.name.trim()) e.name = 'Branch name is required'
    if (!form.code.trim()) e.code = 'Branch code is required'
    if (!form.city.trim()) e.city = 'City is required'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form })
  }

  const Field = ({ label, fkey, placeholder, required }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label} {required && <span style={{ color: PRIMARY }}>*</span>}
      </label>
      <input
        type="text"
        value={form[fkey]}
        onChange={(e) => sf(fkey, e.target.value)}
        placeholder={placeholder}
        disabled={loading}
        className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
        style={{ borderColor: errors[fkey] ? '#EF4444' : '#E5E7EB' }}
        onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
        onBlur={(e)  => { e.target.style.borderColor = errors[fkey] ? '#EF4444' : '#E5E7EB' }}
      />
      {errors[fkey] && <p className="text-[11px] text-red-500 mt-0.5">⚠ {errors[fkey]}</p>}
    </div>
  )

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !loading) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 680, maxHeight: '92vh', margin: '0 16px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
              <Building size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">{isEdit ? 'Edit Branch' : 'Add Branch'}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="border rounded-xl p-5" style={{ borderColor: PRIMARY }}>

            {/* Row 1: name + code */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="Branch Name" fkey="name" placeholder="Enter Branch Name" required />
              <Field label="Branch Code" fkey="code" placeholder="GMT001" required />
            </div>

            {/* Row 2: address + landmark */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => sf('address', e.target.value)}
                  placeholder="Enter full address"
                  rows={3}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Landmark</label>
                <input
                  type="text"
                  value={form.landmark}
                  onChange={(e) => sf('landmark', e.target.value)}
                  placeholder="Near landmark"
                  disabled={loading}
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                />
              </div>
            </div>

            {/* Row 3: city + district + state */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  City <span style={{ color: PRIMARY }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => sf('city', e.target.value)}
                  placeholder="City"
                  disabled={loading}
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  style={{ borderColor: errors.city ? '#EF4444' : '#E5E7EB' }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.city ? '#EF4444' : '#E5E7EB' }}
                />
                {errors.city && <p className="text-[11px] text-red-500 mt-0.5">⚠ {errors.city}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">District</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => sf('district', e.target.value)}
                  placeholder="District"
                  disabled={loading}
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => sf('state', e.target.value)}
                  placeholder="Gujarat"
                  disabled={loading}
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                />
              </div>
            </div>

            {/* Row 4: pincode + country + status */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => sf('pincode', e.target.value)}
                  placeholder="380054"
                  disabled={loading}
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Country</label>
                <select
                  value={form.country}
                  onChange={(e) => sf('country', e.target.value)}
                  disabled={loading}
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none appearance-none cursor-pointer transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                >
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
                <div className="flex items-center gap-5 mt-1">
                  {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map(({ label, val }) => (
                    <label
                      key={label}
                      className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                      onClick={() => !loading && sf('active', val)}
                    >
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
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-60"
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
            {isEdit ? 'Update Branch' : 'Save Branch'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Loading Skeleton Row ─────────────────────────────────────────────────────
function SkeletonRow({ indent = 0 }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 animate-pulse"
      style={{ paddingLeft: indent + 16 }}
    >
      <div className="w-4 h-4 rounded bg-gray-200 flex-shrink-0" />
      <div className="w-5 h-5 rounded bg-gray-200 flex-shrink-0" />
      <div className="w-9 h-9 rounded-xl bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-200 rounded w-40" />
        <div className="h-2.5 bg-gray-100 rounded w-28" />
      </div>
      <div className="w-16 h-6 rounded-full bg-gray-200" />
      <div className="w-8 h-8 rounded-lg bg-gray-200" />
      <div className="w-8 h-8 rounded-lg bg-gray-200" />
    </div>
  )
}

// ─── Tree Node Row ────────────────────────────────────────────────────────────
function BranchNode({
  node, depth, expandedIds, toggleExpand,
  onAdd, onEdit, onDelete,
  dragging, dragOverId, setDragOverId,
  onDragStart, onDragEnd, onDrop,
}) {
  const hasChildren = node.children?.length > 0
  const isExpanded  = expandedIds.has(node.id)
  const isDragging  = dragging === node.id
  const isDragOver  = dragOverId === node.id
  const indent      = depth * 48

  return (
    <div>
      {/* Drop indicator */}
      {isDragOver && dragging !== node.id && (
        <div
          className="h-0.5 rounded-full transition-all"
          style={{ backgroundColor: PRIMARY, marginLeft: indent + 16, marginRight: 16 }}
        />
      )}

      <div
        draggable
        onDragStart={() => onDragStart(node.id)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { e.preventDefault(); setDragOverId(node.id) }}
        onDrop={(e) => { e.preventDefault(); onDrop(node.id) }}
        className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 group transition-colors"
        style={{
          paddingLeft:     indent + 16,
          backgroundColor: isDragOver ? '#FFF7F4' : isDragging ? 'rgba(195,94,51,0.04)' : '#fff',
          opacity:         isDragging ? 0.5 : 1,
          cursor:          'grab',
        }}
      >
        {/* Drag handle */}
        <span className="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab flex-shrink-0">
          <GripVertical size={15} color="#9CA3AF" />
        </span>

        {/* Expand / collapse */}
        <button
          onClick={() => hasChildren && toggleExpand(node.id)}
          className="w-5 h-5 flex items-center justify-center flex-shrink-0"
          style={{
            opacity:   hasChildren ? 1 : 0,
            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 200ms ease',
          }}
        >
          <ChevronDown size={14} color={PRIMARY} strokeWidth={2.5} />
        </button>

        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FDE8DD' }}
        >
          <Building size={16} color={PRIMARY} />
        </div>

        {/* Name + location */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 leading-none">
            {node.name}{' '}
            <span className="font-normal text-gray-400">({node.code})</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {node.city}{node.state ? `, ${node.state}` : ''}
          </p>
        </div>

        {/* Status */}
        <StatusBadge active={node.active} />

        {/* Add child */}
        <button
          onClick={() => onAdd(node.id)}
          title="Add child branch"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] hover:bg-orange-50 transition-all ml-1"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>

        {/* Action menu */}
        <ActionMenu
          onEdit={() => onEdit(node)}
          onDelete={() => onDelete(node)}
        />
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div style={{ borderLeft: `2px solid #F3E8E0`, marginLeft: indent + 40 }}>
          {node.children.map((child) => (
            <BranchNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              dragging={dragging}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BranchManagement() {
  const { toast } = useToast()

  // ── Data & loading ────────────────────────────────────────────────────────
  const [tree,         setTree]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modalSaving,  setModalSaving]  = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)

  // ── UI ────────────────────────────────────────────────────────────────────
  const [search,           setSearch]           = useState('')
  const [showFilter,       setShowFilter]       = useState(false)
  const [activeFilters,    setActiveFilters]    = useState({})
  const [expandedIds,      setExpandedIds]      = useState(new Set())
  const [hasUnsavedLayout, setHasUnsavedLayout] = useState(false)

  // ── Modals ────────────────────────────────────────────────────────────────
  const [modalMode,          setModalMode]          = useState(null)   // 'add' | 'edit' | null
  const [editTarget,         setEditTarget]         = useState(null)
  const [addParentId,        setAddParentId]        = useState(null)
  const [deleteTarget,       setDeleteTarget]       = useState(null)
  const [showSaveConfirm,    setShowSaveConfirm]    = useState(false)

  // ── Drag ──────────────────────────────────────────────────────────────────
  const [dragging,   setDragging]   = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  // ─── Fetch tree ────────────────────────────────────────────────────────────
  const fetchTree = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res    = await branchService.getTree()
      const mapped = (res?.data || []).map(mapApiToLocal)
      setTree(mapped)
      // Auto-expand all root nodes on first load
      if (!silent && mapped.length > 0) {
        setExpandedIds(new Set(mapped.map((n) => n.id)))
      }
      setHasUnsavedLayout(false)
    } catch (err) {
      toast.error(err?.message || 'Failed to load branches', 'Load Error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { fetchTree() }, [fetchTree])

  // ── Toggle expand ─────────────────────────────────────────────────────────
  const toggleExpand = (id) => setExpandedIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // ── Save (Add / Edit) ─────────────────────────────────────────────────────
  const handleSave = async (form) => {
    setModalSaving(true)
    try {
      if (modalMode === 'add') {
        await branchService.create(form, addParentId)
        toast.success('Branch created successfully', 'Created')
      } else {
        await branchService.update(editTarget.id, form)
        toast.success('Branch updated successfully', 'Updated')
      }
      // Close modal first, then silently refresh tree
      setModalMode(null)
      setEditTarget(null)
      setAddParentId(null)
      await fetchTree(true)
    } catch (err) {
      toast.error(err?.message || 'Operation failed. Please try again.', 'Error')
    } finally {
      setModalSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await branchService.delete(deleteTarget.id)
      toast.success(
        `"${deleteTarget.name}" deactivated successfully`,
        'Branch Deleted'
      )
      await fetchTree(true)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err?.message || 'Failed to delete branch', 'Error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((id) => setDragging(id), [])
  const handleDragEnd   = useCallback(() => { setDragging(null); setDragOverId(null) }, [])

  const handleDrop = useCallback((targetId) => {
    if (!dragging || dragging === targetId) {
      setDragging(null); setDragOverId(null); return
    }
    setTree((prev) => {
      const cloned = deepClone(prev)
      const found  = findNode(cloned, dragging)
      if (!found) return prev
      const [draggedNode, draggedParent, draggedIdx] = found
      const sourceList = draggedParent ? draggedParent.children : cloned
      sourceList.splice(draggedIdx, 1)
      insertAfter(cloned, targetId, draggedNode)
      return cloned
    })
    setHasUnsavedLayout(true)
    setDragging(null)
    setDragOverId(null)
  }, [dragging])

  // ── Save Layout ───────────────────────────────────────────────────────────
  const handleConfirmSaveLayout = async () => {
    setSavingLayout(true)
    try {
      const items = flattenForReorder(tree)
      await branchService.reorder(items)
      toast.success('Branch layout saved to database', 'Layout Saved')
      setHasUnsavedLayout(false)
      setShowSaveConfirm(false)
      await fetchTree(true)
    } catch (err) {
      toast.error(err?.message || 'Failed to save layout', 'Save Error')
    } finally {
      setSavingLayout(false)
    }
  }

  const handleResetLayout = async () => {
    await fetchTree()       // full reload restores server order
    toast.info('Layout reset to last saved state', 'Reset')
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const countAll    = (nodes) => nodes.reduce((a, n) => a + 1 + countAll(n.children), 0)
  const countActive = (nodes) => nodes.reduce((a, n) => a + (n.active ? 1 : 0) + countActive(n.children), 0)
  const total  = countAll(tree)
  const active = countActive(tree)
  const filterCount = Object.values(activeFilters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length

  // ── Filter tree (top-level only search) ───────────────────────────────────
  const filteredTree = (search || activeFilters.status?.length)
    ? tree.filter((n) => {
        const q  = search.toLowerCase()
        const sm = !q || n.name.toLowerCase().includes(q)
                       || n.city.toLowerCase().includes(q)
                       || n.code.toLowerCase().includes(q)
        const st = !activeFilters.status?.length
                   || activeFilters.status.some((s) => s === 'Active' ? n.active : !n.active)
        return sm && st
      })
    : tree

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Work Location &amp; Branch</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage branch hierarchy — drag rows to reorder
          </p>
        </div>
        <button
          onClick={() => { setAddParentId(null); setModalMode('add') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#111827' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
        >
          <Plus size={15} strokeWidth={2.5} /> Add Branch
        </button>
      </div>

      {/* ── Unsaved layout banner ────────────────────────────────────────── */}
      {hasUnsavedLayout && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl mb-4 border gap-3 flex-wrap"
          style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: '#F59E0B' }}
            >
              !
            </div>
            <p className="text-sm font-medium text-amber-800">
              You have unsaved layout changes — click <strong>Save Layout</strong> to persist to database.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleResetLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              onClick={() => setShowSaveConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
            >
              <Save size={12} /> Save Layout
            </button>
          </div>
        </div>
      )}

      {/* ── Stats cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Branches', value: total,         color: '#111827', bg: '#F3F4F6' },
          { label: 'Active',         value: active,        color: '#15803D', bg: '#DCFCE7' },
          { label: 'Inactive',       value: total - active, color: '#B91C1C', bg: '#FEE2E2' },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: bg }}
            >
              <Building size={18} color={color} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color }}>
                {loading ? '—' : value}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label
          className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-gray-200 cursor-text flex-1"
          style={{ maxWidth: 420 }}
        >
          <Search size={13} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, city or code…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full"
            onFocus={(e) => { e.target.parentElement.style.borderColor = PRIMARY }}
            onBlur={(e)  => { e.target.parentElement.style.borderColor = '#E5E7EB' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X size={13} />
            </button>
          )}
        </label>

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

      {/* ── Drag hint ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <GripVertical size={13} color="#9CA3AF" />
        <p className="text-[11px] text-gray-400">
          Drag rows to reorder — a <span className="font-semibold text-amber-600">Save Layout</span> button
          will appear to persist the new order
        </p>
      </div>

      {/* ── Tree ─────────────────────────────────────────────────────────── */}
      <div
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragOverId(null)}
      >
        {loading ? (
          /* skeleton */
          <div>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} indent={i > 1 ? 48 : 0} />
            ))}
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Building size={40} color="#D1D5DB" />
            <div>
              <p className="text-sm font-medium text-gray-500">No branches found</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {search ? 'Try a different search term' : 'Add your first branch to get started'}
              </p>
            </div>
          </div>
        ) : (
          filteredTree.map((node) => (
            <BranchNode
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onAdd={(parentId) => { setAddParentId(parentId); setModalMode('add') }}
              onEdit={(n) => { setEditTarget(n); setModalMode('edit') }}
              onDelete={(n) => setDeleteTarget(n)}
              dragging={dragging}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      {/* ── Branch Add / Edit Modal ───────────────────────────────────────── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <BranchModal
          mode={modalMode}
          initial={modalMode === 'edit' ? editTarget : null}
          loading={modalSaving}
          onClose={() => {
            if (!modalSaving) {
              setModalMode(null)
              setEditTarget(null)
              setAddParentId(null)
            }
          }}
          onSave={handleSave}
        />
      )}

      {/* ── Delete Confirm (shared ConfirmModal) ─────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={handleConfirmDelete}
        title="Delete Branch"
        description={
          deleteTarget
            ? (
              <>
                Are you sure you want to deactivate{' '}
                <strong>"{deleteTarget.name} ({deleteTarget.code})"</strong>?
                {deleteTarget.children?.length > 0
                  ? ' All child branches will also be affected.'
                  : ''}
              </>
            )
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />

      {/* ── Save Layout Confirm (shared ConfirmModal) ─────────────────────── */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => { if (!savingLayout) setShowSaveConfirm(false) }}
        onConfirm={handleConfirmSaveLayout}
        title="Save Branch Layout"
        description="This will save the current branch order and hierarchy to the database. The new arrangement will be visible to all users."
        confirmLabel="Save Layout"
        cancelLabel="Cancel"
        variant="info"
        loading={savingLayout}
      />

      {/* ── Filter Panel ──────────────────────────────────────────────────── */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(f) => setActiveFilters(f)}
        onReset={() => setActiveFilters({})}
        config={FILTER_CONFIG}
      />
    </>
  )
}