// ─────────────────────────────────────────────────────────────────────────────
// Part 4: src/pages/leave/tabs/LeaveTypeTab.jsx
// Leave Types – modal-based add/edit, full listing, Admin-only delete
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import {
  Plus, Edit2, Trash2, Search, ChevronDown, X,
  CheckCircle2, XCircle, Settings,
} from 'lucide-react'
import { useLeaveTypes }  from '@/hooks/leave/useLeaveTypes'
import { useAuthStore }   from '@/store/authStore'
import { ROLES }          from '@/constants/roles'
import ConfirmModal        from '@/components/shared/ConfirmModal'

const PRIMARY = '#C35E33'

// ─── helpers ─────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-40"
      style={{ backgroundColor: value ? PRIMARY : '#D1D5DB' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: value ? '18px' : '2px' }}
      />
    </button>
  )
}

function RadioGroup({ label, options, value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span style={{ color: PRIMARY }}> *</span>}
      </label>
      <div className="flex items-center gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <div
              onClick={() => onChange(opt.value)}
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all"
              style={{
                borderColor:     value === opt.value ? PRIMARY : '#D1D5DB',
                backgroundColor: value === opt.value ? PRIMARY : 'transparent',
              }}
            >
              {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm text-gray-600">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function BoolBadge({ value, yesLabel = 'Yes', noLabel = 'No' }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      <CheckCircle2 size={10} /> {yesLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      <XCircle size={10} /> {noLabel}
    </span>
  )
}

// ─── Leave Type Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:                '',
  code:                '',
  description:         '',
  isPaid:              true,
  allowHalfDay:        true,
  allowDuringProbation:false,
  isCompOff:           false,
  isActive:            true,
}

function LeaveTypeModal({ isOpen, mode, initialData, saving, onClose, onSubmit }) {
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // Sync when opening
  useState(() => {
    if (isOpen) {
      setForm(mode === 'edit' && initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM)
      setErrors({})
    }
  }, [isOpen])

  // Also reset when isOpen flips true
  const prevOpen = useMemo(() => isOpen, [])
  if (isOpen && !prevOpen) {
    // handled via key prop on modal
  }

  const set = (key) => (val) =>
    setForm((p) => ({ ...p, [key]: typeof val === 'object' && val.target ? val.target.value : val }))

  const validate = () => {
    const e = {}
    if (!form.name?.trim()) e.name = 'Name is required'
    if (!form.code?.trim()) e.code = 'Code is required'
    else if (!/^[A-Z_]+$/.test(form.code.toUpperCase())) e.code = 'Code must be uppercase letters only'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const dto = { ...form, code: form.code.toUpperCase() }
    await onSubmit(dto)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 580, margin: '0 16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Settings size={14} color="#fff" />
            </div>
            <h2 className="text-sm font-semibold text-white">
              {mode === 'add' ? 'Add Leave Type' : 'Edit Leave Type'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Row 1: Name + Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Leave Name <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Casual Leave"
                className="w-full h-10 px-3 text-sm border rounded-xl outline-none bg-gray-50 placeholder:text-gray-300 transition-colors"
                style={{ borderColor: errors.name ? '#F87171' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = errors.name ? '#F87171' : '#E5E7EB')}
              />
              {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Leave Code <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input
                value={form.code}
                onChange={(e) => set('code')(e.target.value.toUpperCase())}
                placeholder="e.g. CL"
                maxLength={10}
                className="w-full h-10 px-3 text-sm border rounded-xl outline-none bg-gray-50 placeholder:text-gray-300 uppercase"
                style={{ borderColor: errors.code ? '#F87171' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = errors.code ? '#F87171' : '#E5E7EB')}
              />
              {errors.code && <p className="text-[11px] text-red-500 mt-0.5">{errors.code}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300"
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* Radio rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RadioGroup
              label="Paid Leave"
              options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
              value={form.isPaid}
              onChange={set('isPaid')}
            />
            <RadioGroup
              label="Allow Half Day"
              options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
              value={form.allowHalfDay}
              onChange={set('allowHalfDay')}
            />
          </div>

          {/* Toggle grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'allowDuringProbation', label: 'Allow During Probation' },
              { key: 'isCompOff',            label: 'Is Comp Off'            },
              { key: 'isActive',             label: 'Active'                 },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <Toggle value={!!form[key]} onChange={set(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#111827' }}
          >
            {saving && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {mode === 'add' ? 'Create Leave Type' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tab ────────────────────────────────────────────────────────────────

export default function LeaveTypeTab() {
  const { user }    = useAuthStore()
  const isAdmin     = user?.role === ROLES.ADMIN

  const {
    types, loading, saving, deleting, fetch, create, update, remove,
  } = useLeaveTypes()

  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null) // null | { mode:'add'|'edit', data? }
  const [confirm, setConfirm] = useState(null) // id to delete

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return types.filter(
      (t) => t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q),
    )
  }, [search, types])

  const openAdd  = () => setModal({ mode: 'add' })
  const openEdit = (t) => setModal({ mode: 'edit', data: t })

  const handleSubmit = async (dto) => {
    const ok = modal.mode === 'add'
      ? await create(dto)
      : await update(modal.data.id, dto)
    if (ok) setModal(null)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text flex-1 max-w-xs">
          <Search size={13} color="#9CA3AF" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leave type…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full"
          />
        </label>
        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus size={14} /> Add Leave Type
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 780 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Leave Name', 'Code', 'Paid', 'Half Day', 'Probation', 'Comp Off', 'Status', 'System', 'Actions'].map((h) => (
                  <th key={h} className="px-3.5 py-3.5 text-left text-xs font-semibold whitespace-nowrap text-white">{h}</th>
                ))}
              </tr>
            </thead>

            {loading ? (
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-3.5 py-4 border-b border-gray-50">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '70%' : '50%' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : filtered.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                    No leave types found.{search && ' Try clearing the search.'}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {filtered.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                  >
                    <td className="px-3.5 py-4 text-[13px] font-semibold text-gray-900 border-b border-gray-50">
                      {t.name}
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#F5EBE5', color: PRIMARY }}>
                        {t.code}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50"><BoolBadge value={t.isPaid} /></td>
                    <td className="px-3.5 py-4 border-b border-gray-50"><BoolBadge value={t.allowHalfDay} /></td>
                    <td className="px-3.5 py-4 border-b border-gray-50"><BoolBadge value={t.allowDuringProbation} /></td>
                    <td className="px-3.5 py-4 border-b border-gray-50"><BoolBadge value={t.isCompOff} /></td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      {t.isSystemDefined ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">System</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Custom</span>
                      )}
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5">
                        {/* Edit – only for non-system types */}
                        {!t.isSystemDefined && (
                          <button
                            onClick={() => openEdit(t)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] transition-all"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {/* Delete – Admin only, non-system types */}
                        {isAdmin && !t.isSystemDefined && (
                          <button
                            onClick={() => setConfirm(t.id)}
                            disabled={deleting === t.id}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40"
                            title="Delete"
                          >
                            {deleting === t.id ? (
                              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <LeaveTypeModal
        key={modal ? `${modal.mode}-${modal.data?.id ?? 'new'}` : 'closed'}
        isOpen={!!modal}
        mode={modal?.mode}
        initialData={modal?.data}
        saving={saving}
        onClose={() => setModal(null)}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirm – Admin only */}
      {isAdmin && (
        <ConfirmModal
          isOpen={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await remove(confirm); setConfirm(null) }}
          title="Delete Leave Type"
          description="This will soft-delete the leave type. Existing records will be preserved."
          confirmLabel="Delete"
          variant="danger"
          loading={deleting === confirm}
        />
      )}
    </>
  )
}