// src/pages/leave/employee/modals/CancelConfirmModal.jsx
import { useRef, useEffect, useState } from 'react'
import { X, AlertTriangle, XCircle } from 'lucide-react'

const PRIMARY = '#C35E33'

export default function CancelConfirmModal({ record, onClose, onConfirm }) {
  const overlayRef  = useRef(null)
  const [reason,    setReason]    = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation.')
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onConfirm(record.id, reason)
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full"
        style={{ maxWidth: 420, margin: '0 16px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-100">
              <XCircle size={18} color="#DC2626" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Cancel Leave</p>
              <p className="text-[11px] text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Leave summary */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Leave Type</span>
              <span className="text-xs font-semibold text-gray-800">{record.leaveType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Duration</span>
              <span className="text-xs font-semibold" style={{ color: PRIMARY }}>{record.totalDays} day{record.totalDays !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Dates</span>
              <span className="text-xs font-semibold text-gray-800">{record.startDate} → {record.endDate}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border"
            style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
            <AlertTriangle size={14} color="#854D0E" className="flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-yellow-800 leading-relaxed">
              Cancelling this leave will restore <strong>{record.totalDays} day{record.totalDays !== 1 ? 's' : ''}</strong> to your balance upon manager review.
            </p>
          </div>

          {/* Cancel reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason for Cancellation <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError('') }}
              placeholder="Why are you cancelling this leave?"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300 transition-colors"
              style={{ borderColor: error ? '#DC2626' : '#E5E7EB' }}
              onFocus={(e) => { if (!error) e.target.style.borderColor = PRIMARY }}
              onBlur={(e)  => { if (!error) e.target.style.borderColor = '#E5E7EB' }}
            />
            {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Keep Leave
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#DC2626' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#B91C1C')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}>
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Cancelling…</>
            ) : (
              <><XCircle size={14} /> Confirm Cancel</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}