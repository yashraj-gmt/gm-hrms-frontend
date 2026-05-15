// src/pages/leave/employee/modals/LeaveDetailModal.jsx
import { useEffect, useRef } from 'react'
import { X, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'

const PRIMARY = '#C35E33'

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: '#FEF9C3', color: '#854D0E', icon: Clock       },
  APPROVED:  { label: 'Approved',  bg: '#DCFCE7', color: '#15803D', icon: CheckCircle2 },
  REJECTED:  { label: 'Rejected',  bg: '#FEE2E2', color: '#DC2626', icon: XCircle      },
  CANCELLED: { label: 'Cancelled', bg: '#F3F4F6', color: '#6B7280', icon: XCircle      },
}

const DAY_TYPE_LABELS = {
  FULL:        'Full Day',
  FIRST_HALF:  'First Half',
  SECOND_HALF: 'Second Half',
}

function Row({ label, value, valueColor }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-xs font-semibold" style={{ color: valueColor || '#111827' }}>{value}</span>
    </div>
  )
}

export default function LeaveDetailModal({ record, onClose, onCancel }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const cfg    = STATUS_CONFIG[record.status] || { label: record.status, bg: '#F3F4F6', color: '#374151', icon: Clock }
  const Icon   = cfg.icon

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 500, maxHeight: '90vh', margin: '0 16px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ backgroundColor: PRIMARY }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar size={18} color="white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">{record.leaveType}</p>
              <p className="text-orange-100 text-[11px] mt-0.5">Leave Request Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}>
              <Icon size={10} strokeWidth={2.5} />{cfg.label}
            </span>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Leave type badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
              style={{ backgroundColor: '#F5EBE5', color: PRIMARY }}>{record.code}</span>
            <span className="text-xs text-gray-500">{record.leaveType}</span>
          </div>

          {/* Date Info */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Date Info</p>
            </div>
            <div className="px-4">
              <Row label="Start Date"    value={record.startDate}  valueColor={PRIMARY} />
              <Row label="End Date"      value={record.endDate}    valueColor={PRIMARY} />
              <Row label="Applied On"   value={record.appliedOn}  />
            </div>
          </div>

          {/* Duration */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Duration Summary</p>
            </div>
            <div className="px-4">
              <Row label="Applied"    value={`${record.totalDays} Day${record.totalDays !== 1 ? 's' : ''}`} valueColor={PRIMARY} />
              <Row label="Active"     value={`${record.activeDays} Day${record.activeDays !== 1 ? 's' : ''}`} />
              <Row label="Start Day"  value={DAY_TYPE_LABELS[record.startDayType] || record.startDayType} />
              <Row label="End Day"    value={DAY_TYPE_LABELS[record.endDayType]   || record.endDayType}   />
            </div>
          </div>

          {/* Cancelled dates */}
          {record.cancelledDates?.length > 0 && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Cancelled Dates</p>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {record.cancelledDates.map((d) => (
                  <span key={d} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />{d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Reason</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600 leading-relaxed">{record.reason || '—'}</p>
            </div>
          </div>

          {/* Pending note */}
          {record.status === 'PENDING' && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border"
              style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
              <AlertTriangle size={15} color="#854D0E" className="flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-yellow-800 font-medium leading-relaxed">
                Your request is pending approval. You can cancel it before it's reviewed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
          {record.status === 'PENDING' && (
            <button
              onClick={() => { onClose(); onCancel(record) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#DC2626' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B91C1C')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}>
              <XCircle size={14} /> Cancel Leave
            </button>
          )}
        </div>
      </div>
    </div>
  )
}