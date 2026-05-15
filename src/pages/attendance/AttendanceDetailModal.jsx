// src/pages/attendance/AttendanceDetailModal.jsx
import { useEffect, useRef, useState } from 'react'
import { X, Clock, Coffee, TrendingUp, AlertTriangle, Calendar, Save, XCircle } from 'lucide-react'
import attendanceService from '@/services/attendanceService'
import { useToast }      from '@/components/shared/toast/ToastProvider'

const PRIMARY = '#C35E33'

const STATUS_MAP = {
  PRESENT:  { label: 'Present',  bg: '#DCFCE7', color: '#15803D' },
  ABSENT:   { label: 'Absent',   bg: '#FEE2E2', color: '#B91C1C' },
  HALF_DAY: { label: 'Half Day', bg: '#FEF9C3', color: '#854D0E' },
  LEAVE:    { label: 'On Leave', bg: '#DBEAFE', color: '#1D4ED8' },
}

function fmt12(t) {
  if (!t) return '—'
  const parts = t.split(':').map(Number)
  const h = parts[0], m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

// ─── Daily Timeline bar ───────────────────────────────────────────────────────
function DetailTimeline({ checkIn, checkOut, breakMinutes, lateMinutes, overtimeMinutes }) {
  if (!checkIn || !checkOut) {
    return (
      <div className="flex items-center justify-center h-16 bg-gray-50 rounded-xl text-sm text-gray-400">
        No attendance data for this day
      </div>
    )
  }

  function toMin(t) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const shiftTotal = toMin('18:30') - toMin('09:30')
  const pct = (v) => `${Math.max(0, Math.min(100, (v / shiftTotal) * 100))}%`

  return (
    <div>
      <div className="relative h-7 rounded-xl overflow-hidden flex" style={{ backgroundColor: '#E5E7EB' }}>
        {lateMinutes > 0 && (
          <div style={{ width: pct(lateMinutes), backgroundColor: PRIMARY }} title={`Late: ${lateMinutes} min`} />
        )}
        <div style={{ flex: 1, backgroundColor: '#22C55E' }} title="Work time" />
        {breakMinutes > 0 && (
          <div style={{ width: pct(breakMinutes), backgroundColor: '#FCA5A5', minWidth: 6 }} title={`Break: ${breakMinutes} min`} />
        )}
        {overtimeMinutes > 0 && (
          <div style={{ width: pct(overtimeMinutes), backgroundColor: '#111827', minWidth: 6 }} title={`Overtime: ${overtimeMinutes} min`} />
        )}
      </div>
      <div className="flex justify-between mt-1.5">
        <div>
          <span className="text-[10px] font-semibold text-green-600">{fmt12(checkIn)}</span>
          <p className="text-[9px] text-gray-400">Check In</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-red-500">{fmt12(checkOut)}</span>
          <p className="text-[9px] text-gray-400">Check Out</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Work Time
        </span>
        {lateMinutes > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: PRIMARY }} /> Late Arrival
          </span>
        )}
        {breakMinutes > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> Break
          </span>
        )}
        {overtimeMinutes > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-gray-800 inline-block" /> Overtime
          </span>
        )}
      </div>
    </div>
  )
}

function Tile({ icon, label, value, color, bg }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl p-4 gap-1" style={{ backgroundColor: bg }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
      <p className="text-lg font-bold mt-1" style={{ color }}>{value}</p>
      <p className="text-[10px] text-gray-500 font-medium text-center leading-tight">{label}</p>
    </div>
  )
}

// ─── FIX: Correction Form ─────────────────────────────────────────────────────
function CorrectionForm({ record, onCancel, onSaved }) {
  const { toast } = useToast()

  // Pre-fill datetime-local inputs from existing record data
  const [corrCheckIn,  setCorrCheckIn]  = useState(
    record.checkIn
      ? `${record.attendanceDate}T${record.checkIn}`
      : `${record.attendanceDate}T09:00`,
  )
  const [corrCheckOut, setCorrCheckOut] = useState(
    record.checkOut
      ? `${record.attendanceDate}T${record.checkOut}`
      : `${record.attendanceDate}T18:00`,
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!corrCheckIn || !corrCheckOut) {
      toast.error('Both Check In and Check Out are required.', 'Validation Error')
      return
    }
    if (corrCheckOut <= corrCheckIn) {
      toast.error('Check Out must be after Check In.', 'Validation Error')
      return
    }

    setSaving(true)
    try {
      // datetime-local gives "YYYY-MM-DDTHH:MM"; append ":00" for Jackson LocalDateTime
      const toISO = (v) => (v.length === 16 ? `${v}:00` : v)

      await attendanceService.correctAttendance({
        attendanceId: record.id,
        checkIn:      toISO(corrCheckIn),
        checkOut:     toISO(corrCheckOut),
      })
      toast.success('Attendance corrected successfully.', 'Correction Saved')
      onSaved()
    } catch (err) {
      toast.error(err?.message || 'Failed to save correction. Please try again.', 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: PRIMARY }} />
        <p className="text-sm font-bold text-gray-800">Correct Attendance</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            New Check In
          </label>
          <input
            type="datetime-local"
            value={corrCheckIn}
            onChange={(e) => setCorrCheckIn(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#C35E33] transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            New Check Out
          </label>
          <input
            type="datetime-local"
            value={corrCheckOut}
            onChange={(e) => setCorrCheckOut(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#C35E33] transition-colors"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <XCircle size={14} /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#A34A24' }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = PRIMARY }}
        >
          {saving ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Saving…
            </>
          ) : (
            <><Save size={14} /> Save Correction</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
// Props:
//   record     – normalized attendance record from AttendanceOverview
//   onClose    – close the modal
//   onCorrect  – called after a successful correction (refreshes parent table)
export default function AttendanceDetailModal({ record, onClose, onCorrect }) {
  const overlayRef        = useRef(null)
  const [showCorrection, setShowCorrection] = useState(false)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlay = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const workHrs = (record.workMinutes / 60).toFixed(2)
  const status  = STATUS_MAP[record.status] || { label: record.status, bg: '#F3F4F6', color: '#374151' }

  // FIX: use real break logs (populated by normalizeRecord in parent)
  const breakLogs = record.breakLogs || []

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 600, maxHeight: '90vh', margin: '0 16px' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ backgroundColor: PRIMARY }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-bold"
              style={{ color: PRIMARY }}
            >
              {record.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">{record.name}</p>
              <p className="text-orange-100 text-[11px] mt-0.5">
                {record.employeeCode} · {record.designation}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Date / Dept / Shift */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <Calendar size={12} color="#9CA3AF" />
              {record.date}
            </span>
            <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              {record.department || '—'}
            </span>
            <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              Shift: {record.shift || '—'}
            </span>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-3">Daily Timeline</p>
            <DetailTimeline
              checkIn={record.checkIn}         checkOut={record.checkOut}
              breakMinutes={record.breakMinutes} lateMinutes={record.lateMinutes}
              overtimeMinutes={record.overtimeMinutes}
            />
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile
              icon={<Clock size={16} color="#15803D" />}
              label="Work Hours" value={`${workHrs}h`}
              color="#15803D" bg="#F0FDF4"
            />
            <Tile
              icon={<Coffee size={16} color="#1D4ED8" />}
              label="Break (min)" value={record.breakMinutes}
              color="#1D4ED8" bg="#EFF6FF"
            />
            <Tile
              icon={<AlertTriangle size={16} color={record.lateMinutes > 0 ? PRIMARY : '#9CA3AF'} />}
              label="Late (min)"
              value={record.lateMinutes > 0 ? `+${record.lateMinutes}` : '0'}
              color={record.lateMinutes > 0 ? PRIMARY : '#9CA3AF'}
              bg={record.lateMinutes > 0 ? '#FDE8DD' : '#F9FAFB'}
            />
            <Tile
              icon={<TrendingUp size={16} color={record.overtimeMinutes > 0 ? '#7C3AED' : '#9CA3AF'} />}
              label="Overtime (min)"
              value={record.overtimeMinutes > 0 ? `+${record.overtimeMinutes}` : '0'}
              color={record.overtimeMinutes > 0 ? '#7C3AED' : '#9CA3AF'}
              bg={record.overtimeMinutes > 0 ? '#F5F3FF' : '#F9FAFB'}
            />
          </div>

          {/* Check-in / Check-out cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 p-4 bg-green-50">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Check In</p>
              <p className="text-2xl font-bold text-green-600">{fmt12(record.checkIn)}</p>
              {record.lateMinutes > 0 && (
                <p className="text-[10px] mt-1 font-medium" style={{ color: PRIMARY }}>
                  {record.lateMinutes} min late from shift start
                </p>
              )}
            </div>
            <div className="rounded-xl border border-gray-100 p-4 bg-red-50">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Check Out</p>
              <p className="text-2xl font-bold text-red-500">{fmt12(record.checkOut)}</p>
              {record.overtimeMinutes > 0 && (
                <p className="text-[10px] mt-1 font-medium text-purple-600">
                  +{record.overtimeMinutes} min overtime
                </p>
              )}
            </div>
          </div>

          {/* FIX: Real break log table (was MOCK_BREAKS) */}
          {breakLogs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Break Log</p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">#</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Break Start</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Break End</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakLogs.map((b, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-4 py-2.5 text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-4 py-2.5 text-gray-700">{fmt12(b.start)}</td>
                        <td className="px-4 py-2.5 text-gray-700">{b.end ? fmt12(b.end) : <span className="text-orange-400 font-semibold">Ongoing</span>}</td>
                        <td className="px-4 py-2.5 text-blue-600 font-medium">{b.duration} min</td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-gray-500">Total</td>
                      <td className="px-4 py-2 text-xs font-bold text-blue-600">{record.breakMinutes} min</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Regularization note — hidden when correction form is open */}
          {!showCorrection && (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl border"
              style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}
            >
              <AlertTriangle size={15} color="#854D0E" className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-yellow-800">Regularization Available</p>
                <p className="text-[11px] text-yellow-700 mt-0.5">
                  Use "Correct Attendance" below to manually adjust check-in / check-out times.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100">
          {/* FIX: Correction form replaces footer buttons when active */}
          {showCorrection ? (
            <CorrectionForm
              record={record}
              onCancel={() => setShowCorrection(false)}
              onSaved={() => {
                setShowCorrection(false)
                onCorrect?.()   // refresh parent table
                onClose()
              }}
            />
          ) : (
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setShowCorrection(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: PRIMARY }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A34A24')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
              >
                Correct Attendance
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}