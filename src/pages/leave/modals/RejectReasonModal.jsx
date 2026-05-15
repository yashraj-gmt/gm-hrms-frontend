// src/pages/leave/modals/RejectReasonModal.jsx
import { useState, useEffect, useRef } from 'react'
import { X, XCircle } from 'lucide-react'

const PRIMARY = '#C35E33'

export default function RejectReasonModal({ record, onClose, onConfirm, loading = false }) {
  const [reason, setReason]   = useState('')
  const [error, setError]     = useState('')
  const overlayRef            = useRef(null)
  const textareaRef           = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, loading])

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 60)
  }, [])

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Reason is required.'); return }
    if (reason.trim().length < 5) { setError('Please provide a more descriptive reason.'); return }
    setError('')
    await onConfirm(reason.trim())
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !loading) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden" style={{ maxWidth: 440, margin: '0 16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: '#111827' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-100">
              <XCircle size={14} color="#B91C1C" />
            </div>
            <h2 className="text-white font-semibold text-sm">Reject Leave Request</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
            <p className="font-semibold text-gray-800">{record?.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {record?.leaveType} · {record?.days} day(s) · {record?.startDate} → {record?.endDate}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason for Rejection <span style={{ color: PRIMARY }}>*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError('') }}
              placeholder="Provide a clear reason for rejection…"
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300 transition-colors"
              style={{ borderColor: error ? '#EF4444' : undefined }}
              onFocus={(e) => { if (!error) e.target.style.borderColor = PRIMARY }}
              onBlur={(e) => { if (!error) e.target.style.borderColor = '#E5E7EB' }}
              disabled={loading}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#DC2626' }}
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Reject Leave
          </button>
        </div>
      </div>
    </div>
  )
}