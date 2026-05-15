// src/pages/leave/modals/CompOffDetailModal.jsx
 
import { useEffect, useRef } from 'react'
import { X, RefreshCw } from 'lucide-react'
 
const STATUS_MAP_CO = {
  APPROVED: { label: 'Approved', bg: '#DCFCE7', color: '#15803D' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
  PENDING:  { label: 'Pending',  bg: '#E5E7EB', color: '#374151' },
}
 
export function CompOffDetailModal({ record, onClose }) {
  const overlayRef = useRef(null)
 
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
 
  if (!record) return null
  const status = STATUS_MAP_CO[record.status] ?? { label: record.status, bg: '#F3F4F6', color: '#374151' }
 
  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl" style={{ margin: '0 16px' }}>
        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center" style={{ background: PRIMARY }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <RefreshCw size={14} color="#fff" />
            </div>
            <h2 className="text-sm font-semibold text-white">Comp Off Details</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>
 
        {/* Body */}
        <div className="p-5 space-y-4 text-sm">
          {/* Employee info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: PRIMARY }}>
              {(record.name ?? '?')[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{record.name ?? '—'}</p>
              <p className="text-xs text-gray-500">{record.employeeCode}</p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: status.bg, color: status.color }}>
              {status.label}
            </span>
          </div>
 
          {/* Details box */}
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#E9C7B8', background: '#F9F9F9' }}>
            {[
              { label: 'Worked Date',  value: record.workedDate },
              { label: 'Earned Days',  value: `${record.earnedDays} ${record.earnedDays === 1 ? 'Day' : 'Days'}` },
              { label: 'Total Hours',  value: record.totalHours ? `${record.totalHours}h` : '—' },
              { label: 'Applied On',   value: record.appliedOn ?? record.createdAt ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold" style={{ color: PRIMARY }}>{value ?? '—'}</span>
              </div>
            ))}
          </div>
 
          {/* Reason */}
          {record.reason && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Reason</p>
              <div className="rounded-xl px-4 py-3 text-gray-600 text-sm"
                style={{ background: '#F9F9F9', border: '1px solid #E9C7B8' }}>
                {record.reason}
              </div>
            </div>
          )}
 
          {/* Approver info */}
          {record.approvedBy && (
            <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
              <span className="text-gray-500">Processed by</span>
              <span className="font-semibold text-gray-800">ID: {record.approvedBy}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
 

export default CompOffDetailModal;