// src/pages/masterdata/designation/AddDesignationModal.jsx
import { useState, useEffect, useRef } from 'react'
import { X, ClipboardList } from 'lucide-react'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'

/**
 * AddDesignationModal
 *
 * Props:
 *   mode     : 'add' | 'edit'
 *   initial  : DesignationResponseDTO | null   (populated for edit)
 *   onClose  : () => void
 *   onSave   : (formData: { name, description, active }) => void
 *
 * Backend maps to DesignationRequestDTO:
 *   { name: string, description: string, active: boolean }
 */
export default function AddDesignationModal({ mode = 'add', initial = null, onClose, onSave }) {
  const overlayRef = useRef(null)

  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    active:      initial?.active      ?? true,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Field helpers
  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }

  // Validation
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
      // Simulated async — replace with real API call
      await new Promise((r) => setTimeout(r, 300))
      onSave({ name: form.name.trim(), description: form.description.trim(), active: form.active })
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 560, margin: '0 16px' }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}
            >
              <ClipboardList size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">
              {isEdit ? 'Edit Designation' : 'Add Designation'}
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

          {/* Designation Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Designation Name <span style={{ color: PRIMARY }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Sr Developer"
              className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none transition-colors placeholder:text-gray-400"
              style={{ borderColor: errors.name ? '#EF4444' : '#E5E7EB' }}
              onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
              onBlur={(e)  => { e.target.style.borderColor = errors.name ? '#EF4444' : '#E5E7EB' }}
            />
            {errors.name && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <span>⚠</span> {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
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

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Status
            </label>
            <div className="flex items-center gap-6">
              {[
                { label: 'Active',   val: true  },
                { label: 'Inactive', val: false },
              ].map(({ label, val }) => (
                <label
                  key={label}
                  className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                  onClick={() => setField('active', val)}
                >
                  <span
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor:     form.active === val ? PRIMARY : '#D1D5DB',
                      backgroundColor: form.active === val ? PRIMARY : 'transparent',
                    }}
                  >
                    {form.active === val && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </span>
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
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
            {isEdit ? 'Update Designation' : 'Save Designation'}
          </button>
        </div>
      </div>
    </div>
  )
}