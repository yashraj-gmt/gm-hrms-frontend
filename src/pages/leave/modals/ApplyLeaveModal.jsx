// src/pages/leave/modals/ApplyCompOffModal.jsx
 
import { useEffect, useRef, useState } from 'react'
import { X, RefreshCw, ChevronDown } from 'lucide-react'
 
export function ApplyCompOffModal({ isOpen, onClose, onSubmit, saving }) {
  const overlayRef = useRef(null)
  const [form, setForm] = useState({
    workedDate: '',
    earnedDays: 1,
    reason:     '',
  })
  const [errors, setErrors] = useState({})
 
  useEffect(() => {
    if (!isOpen) { setForm({ workedDate: '', earnedDays: 1, reason: '' }); setErrors({}) }
  }, [isOpen])
 
  useEffect(() => {
    if (!isOpen) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, onClose])
 
  if (!isOpen) return null
 
  const validate = () => {
    const e = {}
    if (!form.workedDate) e.workedDate = 'Worked date is required'
    if (!form.reason?.trim()) e.reason = 'Reason is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }
 
  const handleSubmit = async () => {
    if (!validate()) return
    await onSubmit({ ...form, earnedDays: Number(form.earnedDays) })
  }
 
  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 480, margin: '0 16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <RefreshCw size={14} color="#fff" />
            </div>
            <h2 className="text-sm font-semibold text-white">Apply Comp Off</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>
 
        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Worked Date <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input type="date" value={form.workedDate}
                onChange={(e) => setForm((p) => ({ ...p, workedDate: e.target.value }))}
                className="w-full h-10 px-3 text-sm border rounded-xl outline-none bg-gray-50"
                style={{ borderColor: errors.workedDate ? '#F87171' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = errors.workedDate ? '#F87171' : '#E5E7EB')}
                max={new Date().toISOString().split('T')[0]} />
              {errors.workedDate && <p className="text-[11px] text-red-500 mt-0.5">{errors.workedDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Earned Days</label>
              <div className="relative">
                <select value={form.earnedDays}
                  onChange={(e) => setForm((p) => ({ ...p, earnedDays: e.target.value }))}
                  className="w-full h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 appearance-none"
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}>
                  <option value={1}>1 Day</option>
                  <option value={0.5}>0.5 Day</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason <span style={{ color: PRIMARY }}>*</span>
            </label>
            <textarea value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Why did you work on this day?"
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300"
              style={{ borderColor: errors.reason ? '#F87171' : '#E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = errors.reason ? '#F87171' : '#E5E7EB')} />
            {errors.reason && <p className="text-[11px] text-red-500 mt-0.5">{errors.reason}</p>}
          </div>
        </div>
 
        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: PRIMARY }}>
            {saving && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  )
}