// src/pages/leave/modals/LeaveTypeModal.jsx
import { useState, useEffect, useRef } from 'react'
import { X, Plus, Edit2, ChevronDown } from 'lucide-react'

const PRIMARY = '#C35E33'

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ backgroundColor: checked ? PRIMARY : '#D1D5DB' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </button>
    </div>
  )
}

const EMPTY = {
  name: '', code: '', description: '',
  isPaid: true, allowHalfDay: true, isActive: true,
  isCompOff: false, allowDuringProbation: false,
}

export default function LeaveTypeModal({ existing, onClose, onSave, loading = false }) {
  const [form, setForm] = useState(() =>
    existing
      ? { ...EMPTY, ...existing }
      : EMPTY
  )
  const [errors, setErrors] = useState({})
  const overlayRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, loading])

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
  const setE = (key) => (e)  => { setForm((p) => ({ ...p, [key]: e.target.value })); setErrors((p) => ({ ...p, [key]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.name?.trim())  e.name = 'Leave name is required'
    if (!form.code?.trim())  e.code = 'Leave code is required'
    else if (!/^[A-Z_]+$/.test(form.code)) e.code = 'Code must be uppercase letters and underscores only'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    await onSave({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description,
      isPaid: form.isPaid,
      allowHalfDay: form.allowHalfDay,
      isActive: form.isActive,
      isCompOff: form.isCompOff,
      allowDuringProbation: form.allowDuringProbation,
    })
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !loading) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden" style={{ maxWidth: 540, margin: '0 16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
          <div className="flex items-center gap-2.5">
            {existing ? <Edit2 size={15} color="#fff" /> : <Plus size={15} color="#fff" />}
            <h2 className="text-white font-semibold text-sm">
              {existing ? `Edit: ${existing.name}` : 'Add Leave Type'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Leave Name <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input
                value={form.name}
                onChange={setE('name')}
                placeholder="e.g. Annual Leave"
                className="w-full h-10 px-3 text-sm border rounded-xl outline-none bg-gray-50 placeholder:text-gray-300"
                style={{ borderColor: errors.name ? '#EF4444' : '#E5E7EB' }}
                onFocus={(e) => { if (!errors.name) e.target.style.borderColor = PRIMARY }}
                onBlur={(e)  => { if (!errors.name) e.target.style.borderColor = '#E5E7EB' }}
                disabled={loading}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Leave Code <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input
                value={form.code}
                onChange={(e) => { setE('code')(e); }}
                placeholder="e.g. AL"
                className="w-full h-10 px-3 text-sm border rounded-xl outline-none bg-gray-50 placeholder:text-gray-300 uppercase"
                style={{ borderColor: errors.code ? '#EF4444' : '#E5E7EB' }}
                onFocus={(e) => { if (!errors.code) e.target.style.borderColor = PRIMARY }}
                onBlur={(e)  => { if (!errors.code) e.target.style.borderColor = '#E5E7EB' }}
                disabled={loading || !!existing}
                maxLength={10}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              {existing && <p className="text-[10px] text-gray-400 mt-1">Code cannot be changed after creation.</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={setE('description')}
              placeholder="Optional description…"
              rows={3}
              disabled={loading}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300"
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e)  => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
              <div className="relative">
                <select
                  value={form.isActive ? 'Active' : 'Inactive'}
                  onChange={(e) => set('isActive')(e.target.value === 'Active')}
                  disabled={loading}
                  className="w-full h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 appearance-none"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Permissions</p>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Paid Leave"           checked={form.isPaid}               onChange={set('isPaid')} />
              <Toggle label="Allow Half Day"        checked={form.allowHalfDay}         onChange={set('allowHalfDay')} />
              <Toggle label="Allow During Probation" checked={form.allowDuringProbation} onChange={set('allowDuringProbation')} />
              <Toggle label="Is Comp Off"           checked={form.isCompOff}            onChange={set('isCompOff')} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex gap-3 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#111827' }}
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {existing ? 'Save Changes' : 'Create Leave Type'}
          </button>
        </div>
      </div>
    </div>
  )
}