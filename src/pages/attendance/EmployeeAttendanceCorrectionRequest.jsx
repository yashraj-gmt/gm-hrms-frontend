// src/pages/attendance/EmployeeAttendanceCorrectionRequest.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, CalendarDays, ChevronLeft, ChevronRight,
  Send, FileText, CheckCircle2, XCircle, AlertTriangle,
  Eye, X, Info, RefreshCw, Filter,
} from 'lucide-react'
import { useToast }      from '@/components/shared/toast/ToastProvider'
import attendanceService from '@/services/attendanceService'
import { ROUTES }        from '@/constants/routes'

const PRIMARY       = '#C35E33'
const PRIMARY_DARK  = '#A34A24'
const PRIMARY_LIGHT = '#FDE8DD'
const PAGE_SIZE     = 6

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt12 = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

const fmt12DT = (dt) => {
  if (!dt) return '—'
  const t = dt.includes('T') ? dt.split('T')[1]?.substring(0, 5) : dt.substring(0, 5)
  return t ? fmt12(t) : '—'
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const toLocalDatetimeValue = (dt) => {
  if (!dt) return ''
  const d = new Date(dt)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const localDatetimeToISO = (val) => val ? new Date(val).toISOString() : null

const STATUS_CONFIG = {
  PENDING:     { label: 'Pending',     bg: '#FEF9C3', color: '#854D0E', dot: '#F59E0B', icon: Clock        },
  APPROVED:    { label: 'Approved',    bg: '#DCFCE7', color: '#15803D', dot: '#22C55E', icon: CheckCircle2 },
  REJECTED:    { label: 'Rejected',    bg: '#FEE2E2', color: '#B91C1C', dot: '#EF4444', icon: XCircle      },
  NO_RESPONSE: { label: 'No Response', bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF', icon: AlertTriangle },
}

const ATT_STATUS = {
  PRESENT:  { label: 'Present',  bg: '#DCFCE7', color: '#15803D' },
  ABSENT:   { label: 'Absent',   bg: '#FEE2E2', color: '#B91C1C' },
  HALF_DAY: { label: 'Half Day', bg: '#FEF9C3', color: '#854D0E' },
  ON_LEAVE: { label: 'On Leave', bg: '#DBEAFE', color: '#1D4ED8' },
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function AttBadge({ status }) {
  const cfg = ATT_STATUS[status] ?? { label: status, bg: '#F3F4F6', color: '#374151' }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-wrap gap-2">
      <p className="text-xs text-gray-500">
        Showing{' '}
        <span className="font-semibold text-gray-800">{(current-1)*pageSize+1}–{Math.min(current*pageSize, total)}</span>
        {' '}of{' '}
        <span className="font-semibold text-gray-800">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(current-1)} disabled={current===1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i+1).map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
            style={{ borderColor: current===p ? PRIMARY : '#E5E7EB', backgroundColor: current===p ? PRIMARY : 'transparent', color: current===p ? '#fff' : '#6B7280' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(current+1)} disabled={current===totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function RequestDetailModal({ request, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const cfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = cfg.icon

  return (
    <div ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 480, maxHeight: '90vh', margin: '0 16px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
          style={{ backgroundColor: '#111827' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: cfg.bg }}>
              <StatusIcon size={16} color={cfg.color} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">Request Details</p>
              <p className="text-gray-400 text-[11px] mt-0.5">{fmtDate(request.attendanceDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Time comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">Original Time</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">CHECK IN</p>
                  <p className="text-sm font-bold text-red-500">{fmt12DT(request.originalCheckIn)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">CHECK OUT</p>
                  <p className="text-sm font-bold text-red-500">{fmt12DT(request.originalCheckOut)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">Requested Time</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">CHECK IN</p>
                  <p className="text-sm font-bold text-green-600">{fmt12DT(request.requestedCheckIn)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">CHECK OUT</p>
                  <p className="text-sm font-bold text-green-600">{fmt12DT(request.requestedCheckOut)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Your Reason</p>
            <p className="text-sm text-gray-700 leading-relaxed">{request.reason || '—'}</p>
          </div>

          {/* Remarks from admin */}
          {request.remarks && (
            <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50">
              <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5">Admin Remarks</p>
              <p className="text-sm text-yellow-800 leading-relaxed">{request.remarks}</p>
              {request.reviewedBy && (
                <p className="text-[10px] text-yellow-600 mt-2">
                  — {request.reviewedBy}{request.reviewedAt ? `, ${fmtDate(request.reviewedAt)}` : ''}
                </p>
              )}
            </div>
          )}

          {/* Submitted info */}
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <CalendarDays size={12} />
            Submitted on {fmtDate(request.createdAt)}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Correction Request Form Modal ────────────────────────────────────────────
function CorrectionFormModal({ record, onClose, onSubmit, submitting }) {
  const overlayRef = useRef(null)

  const [form, setForm] = useState({
    requestedCheckIn:  record?.checkIn  ? toLocalDatetimeValue(record.checkIn)  : '',
    requestedCheckOut: record?.checkOut ? toLocalDatetimeValue(record.checkOut) : '',
    reason: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, submitting])

  const validate = () => {
    const e = {}
    if (!form.requestedCheckIn && !form.requestedCheckOut) {
      e.time = 'At least one of check-in or check-out time is required.'
    }
    if (form.requestedCheckIn && form.requestedCheckOut) {
      if (new Date(form.requestedCheckOut) <= new Date(form.requestedCheckIn)) {
        e.time = 'Check-out must be after check-in.'
      }
    }
    if (!form.reason.trim()) {
      e.reason = 'Please provide a reason for this request.'
    } else if (form.reason.trim().length < 10) {
      e.reason = 'Reason must be at least 10 characters.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit({
      attendanceId:      record.id,
      requestedCheckIn:  form.requestedCheckIn  ? localDatetimeToISO(form.requestedCheckIn)  : null,
      requestedCheckOut: form.requestedCheckOut ? localDatetimeToISO(form.requestedCheckOut) : null,
      reason:            form.reason.trim(),
    })
  }

  return (
    <div ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !submitting) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 500, maxHeight: '90vh', margin: '0 16px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
          style={{ backgroundColor: PRIMARY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText size={16} color="#fff" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">Request Correction</p>
              <p className="text-orange-100 text-[11px] mt-0.5">{fmtDate(record?.attendanceDate)}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}>
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Current times banner */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Current Recorded Time</p>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[9px] text-gray-400 font-medium">CHECK IN</p>
                <p className="text-sm font-bold" style={{ color: record?.checkIn ? '#15803D' : '#9CA3AF' }}>
                  {record?.checkIn ? fmt12DT(record.checkIn) : 'Not recorded'}
                </p>
              </div>
              <div className="text-gray-300 text-lg">→</div>
              <div>
                <p className="text-[9px] text-gray-400 font-medium">CHECK OUT</p>
                <p className="text-sm font-bold" style={{ color: record?.checkOut ? '#B91C1C' : '#9CA3AF' }}>
                  {record?.checkOut ? fmt12DT(record.checkOut) : 'Not recorded'}
                </p>
              </div>
              <div className="ml-auto">
                <AttBadge status={record?.status} />
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-100 bg-blue-50">
            <Info size={14} color="#2563EB" className="flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Fill only the fields you want to change. Leave a field empty to keep the current value.
            </p>
          </div>

          {/* Requested check-in */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Requested Check-In Time
              <span className="ml-1 text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={form.requestedCheckIn}
              onChange={(e) => setForm((p) => ({ ...p, requestedCheckIn: e.target.value }))}
              className="w-full h-10 px-3 text-sm text-gray-700 bg-white border rounded-xl outline-none transition-colors"
              style={{ borderColor: errors.time ? '#EF4444' : '#E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = errors.time ? '#EF4444' : '#E5E7EB')}
            />
          </div>

          {/* Requested check-out */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Requested Check-Out Time
              <span className="ml-1 text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={form.requestedCheckOut}
              onChange={(e) => setForm((p) => ({ ...p, requestedCheckOut: e.target.value }))}
              className="w-full h-10 px-3 text-sm text-gray-700 bg-white border rounded-xl outline-none transition-colors"
              style={{ borderColor: errors.time ? '#EF4444' : '#E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = errors.time ? '#EF4444' : '#E5E7EB')}
            />
            {errors.time && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} />{errors.time}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Explain why you need this correction (e.g., forgot to check in, system was down, off-site meeting…)"
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm text-gray-700 bg-white border rounded-xl outline-none resize-none transition-colors placeholder:text-gray-400"
              style={{ borderColor: errors.reason ? '#EF4444' : '#E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = errors.reason ? '#EF4444' : '#E5E7EB')}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.reason ? (
                <p className="text-[11px] text-red-500 flex items-center gap-1">
                  <AlertTriangle size={11} />{errors.reason}
                </p>
              ) : <span />}
              <span className="text-[10px] text-gray-400">{form.reason.length}/600</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = PRIMARY_DARK }}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}>
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Submitting…
              </>
            ) : (
              <>
                <Send size={14} strokeWidth={2} />
                Submit Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeAttendanceCorrectionRequest() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  // ── Attendance records (to pick from) ────────────────────────────────────
  const [records,       setRecords]       = useState([])
  const [recordsTotal,  setRecordsTotal]  = useState(0)
  const [recordsPage,   setRecordsPage]   = useState(1)
  const [recordsLoading,setRecordsLoading]= useState(false)

  // ── My correction requests ────────────────────────────────────────────────
  const [myRequests,    setMyRequests]    = useState([])
  const [requestsTotal, setRequestsTotal] = useState(0)
  const [requestsPage,  setRequestsPage]  = useState(1)
  const [requestsLoading,setRequestsLoading]=useState(false)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab,     setActiveTab]     = useState('records') // 'records' | 'history'
  const [formRecord,    setFormRecord]    = useState(null)      // opens form modal
  const [detailRequest, setDetailRequest] = useState(null)      // opens detail modal
  const [submitting,    setSubmitting]    = useState(false)
  const [statusFilter,  setStatusFilter]  = useState('All')

  // ── Fetch attendance records ───────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const res = await attendanceService.getMyHistory(recordsPage - 1, PAGE_SIZE)
      if (res?.success && res?.data) {
        setRecords(res.data.content || [])
        setRecordsTotal(res.data.totalElements || 0)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load attendance records.', 'Error')
    } finally {
      setRecordsLoading(false)
    }
  }, [recordsPage, toast])

  // ── Fetch my correction requests ──────────────────────────────────────────
  const fetchMyRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const params = statusFilter !== 'All' ? { status: statusFilter } : {}
      const res = await attendanceService.getCorrectionRequests(requestsPage - 1, PAGE_SIZE)
      if (res?.success && res?.data) {
        let content = res.data.content || []
        // Client-side status filter (or pass to API if backend supports per-employee filtering)
        if (statusFilter !== 'All') {
          content = content.filter((r) => r.status === statusFilter)
        }
        setMyRequests(content)
        setRequestsTotal(res.data.totalElements || 0)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load requests.', 'Error')
    } finally {
      setRequestsLoading(false)
    }
  }, [requestsPage, statusFilter, toast])

  useEffect(() => { fetchRecords()   }, [fetchRecords])
  useEffect(() => { fetchMyRequests()}, [fetchMyRequests])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (payload) => {
    setSubmitting(true)
    try {
      const res = await attendanceService.submitCorrectionRequest(payload)
      if (res?.success) {
        toast.success(
          'Your correction request has been submitted. HR will review it shortly.',
          'Request Submitted'
        )
        setFormRecord(null)
        fetchMyRequests()
        setActiveTab('history')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to submit request. Please try again.', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const parseTime = (dt) => (dt ? (dt.includes('T') ? dt.split('T')[1]?.substring(0, 5) : dt.substring(0, 5)) : null)

  const pendingCount = myRequests.filter((r) => r.status === 'PENDING').length

  const STATUS_FILTER_TABS = [
    { key: 'All',        label: 'All' },
    { key: 'PENDING',    label: 'Pending' },
    { key: 'APPROVED',   label: 'Approved' },
    { key: 'REJECTED',   label: 'Rejected' },
    { key: 'NO_RESPONSE',label: 'No Response' },
  ]

  return (
    <>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.ATTENDANCE_EMPLOYEE)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendance Correction</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Request corrections for incorrect or missing attendance records
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A' }}>
            <Clock size={13} />
            {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── How it works banner ───────────────────────────────────────────── */}
      <div className="rounded-2xl border mb-5 overflow-hidden"
        style={{ borderColor: PRIMARY + '30', backgroundColor: PRIMARY_LIGHT }}>
        <div className="flex items-start gap-4 px-5 py-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: PRIMARY }}>
            <Info size={18} color="#fff" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900 mb-1">How Correction Requests Work</p>
            <div className="flex items-center gap-6 flex-wrap">
              {[
                ['1', 'Pick a date from your records'],
                ['2', 'Enter the correct check-in / check-out times'],
                ['3', 'Provide a reason and submit'],
                ['4', 'HR/Admin reviews and approves'],
              ].map(([num, text]) => (
                <div key={num} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: PRIMARY }}>{num}</span>
                  <span className="text-[12px] text-gray-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-5">
        {[
          { key: 'records', label: 'My Attendance',  icon: CalendarDays },
          { key: 'history', label: 'My Requests',    icon: FileText,    badge: pendingCount },
        ].map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap"
            style={{
              backgroundColor: activeTab === key ? '#fff' : 'transparent',
              color:           activeTab === key ? PRIMARY : '#6B7280',
              boxShadow:       activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            <Icon size={14} />
            {label}
            {badge > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: PRIMARY }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: My Attendance Records                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900">Select a Date to Correct</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Click on any row to request a correction</p>
            </div>
            <button onClick={fetchRecords}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} className={recordsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {recordsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading your records…
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <CalendarDays size={36} strokeWidth={1.2} />
              <p className="text-sm">No attendance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 640 }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Date', 'Check In', 'Check Out', 'Work Time', 'Status', 'Action'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const ci = parseTime(r.checkIn)
                    const co = parseTime(r.checkOut)
                    const wh = r.workMinutes > 0
                      ? `${Math.floor(r.workMinutes/60)}h ${r.workMinutes%60}m` : '—'

                    return (
                      <tr key={r.id}
                        className="border-b border-gray-50 hover:bg-orange-50 transition-colors cursor-pointer"
                        style={{ backgroundColor: idx%2===0 ? '#fff' : '#FAFAFA' }}>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900">
                              {fmtDate(r.attendanceDate)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {r.attendanceDate
                                ? new Date(r.attendanceDate).toLocaleDateString('en-US', { weekday: 'short' })
                                : ''}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`text-[13px] font-semibold ${ci ? 'text-green-600' : 'text-gray-300'}`}>
                            {ci ? fmt12(ci) : '—'}
                          </span>
                          {(r.lateMinutes||0) > 0 && (
                            <p className="text-[9px] font-bold mt-0.5" style={{ color: PRIMARY }}>
                              +{r.lateMinutes}m late
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`text-[13px] font-semibold ${co ? 'text-red-500' : 'text-gray-300'}`}>
                            {co ? fmt12(co) : '—'}
                          </span>
                          {(r.overtimeMinutes||0) > 0 && (
                            <p className="text-[9px] font-bold text-purple-600 mt-0.5">
                              +{r.overtimeMinutes}m OT
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] font-bold text-gray-800">{wh}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <AttBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setFormRecord(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all whitespace-nowrap"
                            style={{ backgroundColor: PRIMARY }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}>
                            <FileText size={11} strokeWidth={2} />
                            Request Fix
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            current={recordsPage}
            total={recordsTotal}
            pageSize={PAGE_SIZE}
            onChange={(p) => { setRecordsPage(p) }}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: My Correction Requests History                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Requests', value: myRequests.length,                                    color: '#374151', bg: '#F3F4F6' },
              { label: 'Pending',        value: myRequests.filter((r)=>r.status==='PENDING').length,   color: '#854D0E', bg: '#FEF9C3' },
              { label: 'Approved',       value: myRequests.filter((r)=>r.status==='APPROVED').length,  color: '#15803D', bg: '#DCFCE7' },
              { label: 'Rejected',       value: myRequests.filter((r)=>r.status==='REJECTED').length,  color: '#B91C1C', bg: '#FEE2E2' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[11px] text-gray-500 mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Filter + refresh */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={13} color="#9CA3AF" />
              {STATUS_FILTER_TABS.map(({ key, label }) => (
                <button key={key} onClick={() => { setStatusFilter(key); setRequestsPage(1) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    borderColor:     statusFilter===key ? PRIMARY : '#E5E7EB',
                    color:           statusFilter===key ? '#fff'  : '#6B7280',
                    backgroundColor: statusFilter===key ? PRIMARY : '#fff',
                    fontWeight:      statusFilter===key ? 600     : 500,
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={fetchMyRequests}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} className={requestsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Requests list */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {requestsLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading requests…
              </div>
            ) : myRequests.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <FileText size={36} strokeWidth={1.2} />
                <p className="text-sm">No correction requests yet.</p>
                <button onClick={() => setActiveTab('records')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white mt-1"
                  style={{ backgroundColor: PRIMARY }}>
                  <FileText size={13} /> Make Your First Request
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 720 }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Date', 'Original Time', 'Requested Time', 'Reason', 'Submitted', 'Status', 'View'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((req, idx) => (
                      <tr key={req.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        style={{ backgroundColor: idx%2===0 ? '#fff' : '#FAFAFA' }}>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-[13px] font-semibold text-gray-900">
                            {fmtDate(req.attendanceDate)}
                          </p>
                        </td>

                        {/* Original */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-[11px] text-gray-500">In: <span className="font-medium text-gray-700">{fmt12DT(req.originalCheckIn)}</span></p>
                          <p className="text-[11px] text-gray-500 mt-0.5">Out: <span className="font-medium text-gray-700">{fmt12DT(req.originalCheckOut)}</span></p>
                        </td>

                        {/* Requested */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-[11px] text-green-600">In: <span className="font-semibold">{fmt12DT(req.requestedCheckIn)}</span></p>
                          <p className="text-[11px] text-green-600 mt-0.5">Out: <span className="font-semibold">{fmt12DT(req.requestedCheckOut)}</span></p>
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-2">
                            {req.reason || '—'}
                          </p>
                        </td>

                        {/* Submitted */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-[12px] text-gray-500">{fmtDate(req.createdAt)}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={req.status} />
                          {req.remarks && req.status === 'REJECTED' && (
                            <p className="text-[10px] text-red-500 mt-1 max-w-[120px] truncate"
                              title={req.remarks}>{req.remarks}</p>
                          )}
                        </td>

                        {/* View */}
                        <td className="px-4 py-3.5">
                          <button onClick={() => setDetailRequest(req)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] hover:bg-orange-50 transition-all">
                            <Eye size={14} strokeWidth={1.8} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              current={requestsPage}
              total={requestsTotal}
              pageSize={PAGE_SIZE}
              onChange={setRequestsPage}
            />
          </div>

          {/* CTA to make a new request */}
          {myRequests.length > 0 && (
            <div className="flex items-center justify-center">
              <button onClick={() => setActiveTab('records')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                style={{ backgroundColor: PRIMARY }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}>
                <FileText size={14} />
                Submit Another Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Correction Form Modal ─────────────────────────────────────────── */}
      {formRecord && (
        <CorrectionFormModal
          record={formRecord}
          onClose={() => { if (!submitting) setFormRecord(null) }}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {detailRequest && (
        <RequestDetailModal
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
        />
      )}
    </>
  )
}