// src/pages/leave/modals/ApplyLeaveModal.jsx
 
import { useEffect, useRef, useState } from 'react'
import { X, CalendarDays, ChevronDown } from 'lucide-react'
import { useLeaveTypes } from '@/hooks/leave/useLeaveTypes'
import { useAuthStore }  from '@/store/authStore'
 
const PRIMARY = '#C35E33'
 
const DAY_TYPES = ['FULL', 'FIRST_HALF', 'SECOND_HALF']
 
export function ApplyLeaveModal({ isOpen, onClose, onSubmit, saving }) {
  const overlayRef = useRef(null)
  const { user }   = useAuthStore()
  const { types }  = useLeaveTypes()
 
  const [form, setForm] = useState({
    leaveTypeId:  '',
    startDate:    '',
    endDate:      '',
    startDayType: 'FULL',
    endDayType:   'FULL',
    reason:       '',
  })
  const [errors, setErrors] = useState({})
 
  useEffect(() => {
    if (!isOpen) { setForm({ leaveTypeId: '', startDate: '', endDate: '', startDayType: 'FULL', endDayType: 'FULL', reason: '' }); setErrors({}) }
  }, [isOpen])
 
  useEffect(() => {
    if (!isOpen) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, onClose])
 
  if (!isOpen) return null
 
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target ? e.target.value : e }))
 
  const validate = () => {
    const e = {}
    if (!form.leaveTypeId) e.leaveTypeId = 'Leave type is required'
    if (!form.startDate)   e.startDate   = 'Start date is required'
    if (!form.endDate)     e.endDate     = 'End date is required'
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = 'End date must be after start date'
    if (!form.reason?.trim()) e.reason   = 'Reason is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }
 
  const handleSubmit = async () => {
    if (!validate()) return
    await onSubmit({
      ...form,
      personalId:  user?.personalId,
      leaveTypeId: Number(form.leaveTypeId),
    })
  }
 
  const activeTypes = types.filter((t) => t.isActive && !t.isCompOff)
 
  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 560, margin: '0 16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <CalendarDays size={14} color="#fff" />
            </div>
            <h2 className="text-sm font-semibold text-white">Apply for Leave</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors"><X size={18} /></button>
        </div>
 
        {/* Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Leave Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Leave Type <span style={{ color: PRIMARY }}>*</span>
            </label>
            <div className="relative">
              <select value={form.leaveTypeId} onChange={set('leaveTypeId')}
                className="w-full h-10 px-3 pr-8 text-sm border rounded-xl outline-none bg-gray-50 appearance-none"
                style={{ borderColor: errors.leaveTypeId ? '#F87171' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = errors.leaveTypeId ? '#F87171' : '#E5E7EB')}>
                <option value="">Select leave type</option>
                {activeTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {errors.leaveTypeId && <p className="text-[11px] text-red-500 mt-0.5">{errors.leaveTypeId}</p>}
          </div>
 
          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Start Date <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input type="date" value={form.startDate} onChange={set('startDate')}
                className="w-full h-10 px-3 text-sm border rounded-xl outline-none bg-gray-50"
                style={{ borderColor: errors.startDate ? '#F87171' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = errors.startDate ? '#F87171' : '#E5E7EB')} />
              {errors.startDate && <p className="text-[11px] text-red-500 mt-0.5">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                End Date <span style={{ color: PRIMARY }}>*</span>
              </label>
              <input type="date" value={form.endDate} min={form.startDate} onChange={set('endDate')}
                className="w-full h-10 px-3 text-sm border rounded-xl outline-none bg-gray-50"
                style={{ borderColor: errors.endDate ? '#F87171' : '#E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = errors.endDate ? '#F87171' : '#E5E7EB')} />
              {errors.endDate && <p className="text-[11px] text-red-500 mt-0.5">{errors.endDate}</p>}
            </div>
          </div>
 
          {/* Day Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'startDayType', label: 'Start Day Type' },
              { key: 'endDayType',   label: 'End Day Type'   },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <select value={form[key]} onChange={set(key)}
                    className="w-full h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 appearance-none"
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}>
                    {DAY_TYPES.map((d) => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
 
          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason <span style={{ color: PRIMARY }}>*</span>
            </label>
            <textarea value={form.reason} onChange={set('reason')}
              placeholder="Reason for leave..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300"
              style={{ borderColor: errors.reason ? '#F87171' : '#E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = errors.reason ? '#F87171' : '#E5E7EB')} />
            {errors.reason && <p className="text-[11px] text-red-500 mt-0.5">{errors.reason}</p>}
          </div>
        </div>
 
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#111827' }}>
            {saving && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Submit Leave Request
          </button>
        </div>
      </div>
    </div>
  )
}

export default ApplyLeaveModal