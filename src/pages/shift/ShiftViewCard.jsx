import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sun, Coffee, ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import shiftService from '@/services/shiftService'

const PRIMARY = '#C35E33'
const PRIMARY_DARK = '#A34A24'

const ALL_DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN']

// Map backend DayOfWeek enum → display label
const DAY_LABEL_MAP = {
  MONDAY:'MON', TUESDAY:'TUE', WEDNESDAY:'WED',
  THURSDAY:'THU', FRIDAY:'FRI', SATURDAY:'SAT', SUNDAY:'SUN',
}

const fmt12 = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`
}

function InfoRow({ label, value, valueStyle }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold" style={valueStyle || { color: PRIMARY }}>{value ?? '—'}</span>
    </div>
  )
}

function Badge({ children, style }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={style}>
      {children}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50">
      <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
    </div>
  )
}

export default function ShiftViewCard() {
  const navigate   = useNavigate()
  const { id }     = useParams()
  const { toast }  = useToast()

  const [shift,    setShift]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    shiftService.getById(id)
      .then(res => setShift(res.data))
      .catch(err => {
        toast.error(err?.message || 'Failed to load shift details', 'Error')
        navigate('/shifts')
      })
      .finally(() => setLoading(false))
  }, [id])

  // ── Toggle active status ─────────────────────────────────────────────
  const handleToggle = async () => {
    setToggling(true)
    try {
      const res = await shiftService.toggleStatus(id)
      setShift(res.data)
      toast.success(
        `${shift.shiftName} has been ${shift.isActive ? 'deactivated' : 'activated'}`,
        shift.isActive ? 'Shift Deactivated' : 'Shift Activated'
      )
    } catch (err) {
      toast.error(err?.message || 'Failed to update status', 'Error')
    } finally {
      setToggling(false)
    }
  }

  // ── Soft delete ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${shift?.shiftName}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await shiftService.delete(id)
      toast.success(`${shift.shiftName} has been deleted`, 'Shift Deleted')
      navigate('/shifts')
    } catch (err) {
      toast.error(err?.message || 'Failed to delete shift', 'Error')
      setDeleting(false)
    }
  }

  // ── Derive display values from API response ──────────────────────────
  const statusStyle = shift?.isActive
    ? { bg: '#DCFCE7', color: '#15803D' }
    : { bg: '#FEE2E2', color: '#B91C1C' }

  // For NORMAL shift — which days are working vs off
  const getWorkingDays = () => {
    if (!shift?.normalTiming) return []
    return ALL_DAYS.filter(d => {
      if (d === 'SAT') return !shift.normalTiming.saturdayOff
      if (d === 'SUN') return !shift.normalTiming.sundayOff
      return true
    })
  }

  // For CUSTOM shift — which days are off
  const getCustomDayStatus = (displayKey) => {
    if (!shift?.dayConfigs) return { isOff: true }
    const backendKey = Object.entries(DAY_LABEL_MAP).find(([, v]) => v === displayKey)?.[0]
    const dc = shift.dayConfigs.find(d => d.dayOfWeek === backendKey)
    return { isOff: dc?.isWeekOff ?? true, dc }
  }

  const workingDays = shift?.shiftType === 'NORMAL'
    ? getWorkingDays()
    : ALL_DAYS.filter(d => !getCustomDayStatus(d).isOff)

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/shifts')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-1" />
            <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-center min-h-48">
            <Loader2 size={24} color={PRIMARY} className="animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (!shift) return null

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/shifts')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Shift Detail</h1>
          <p className="text-xs text-gray-400 mt-0.5">Complete shift configuration at a glance</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LEFT — main card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#FDE8DD' }}>
                <Sun size={16} color={PRIMARY} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{shift.shiftName}</p>
                <p className="text-[11px] text-gray-400">#{String(shift.id).padStart(4,'0')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white"
                style={{ backgroundColor: shift.shiftType === 'NORMAL' ? PRIMARY : '#111827' }}>
                {shift.shiftType}
              </span>
              <Badge style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                {shift.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Start / End time highlight — NORMAL only */}
          {shift.normalTiming && (
            <div className="grid grid-cols-2 gap-3 p-5">
              <div className="rounded-xl p-4" style={{ backgroundColor: PRIMARY }}>
                <p className="text-[10px] font-semibold text-orange-200 uppercase tracking-wider mb-1">
                  Start time
                </p>
                <p className="text-2xl font-bold text-white">
                  {fmt12(shift.normalTiming.startTime)}
                </p>
              </div>
              <div className="rounded-xl p-4 border border-gray-200 bg-gray-50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  End time
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {fmt12(shift.normalTiming.endTime)}
                </p>
              </div>
            </div>
          )}

          {/* Custom shift timing banner */}
          {shift.shiftType === 'CUSTOM' && (
            <div className="mx-5 mt-5 px-4 py-3 rounded-xl"
              style={{ backgroundColor: '#FDE8DD' }}>
              <p className="text-xs font-semibold" style={{ color: PRIMARY }}>
                Day-wise configuration — timings vary per day
              </p>
            </div>
          )}

          {/* Detail rows */}
          <div className="px-5 pb-4 mt-2">
            {shift.normalTiming && (
              <>
                <InfoRow
                  label="Check-in window"
                  value={`${fmt12(shift.normalTiming.checkinStartWindow)} – ${fmt12(shift.normalTiming.checkinEndWindow)}`}
                />
                <InfoRow
                  label="Check-out window"
                  value={`${fmt12(shift.normalTiming.checkoutStartWindow)} – ${fmt12(shift.normalTiming.checkoutEndWindow)}`}
                />
              </>
            )}
            <InfoRow label="Grace period"    value={`${shift.graceMinutes ?? '—'} min`} />
            <InfoRow label="Late mark after" value={`${shift.lateMarkAfterMinutes ?? '—'} min`} />
            <InfoRow label="Late mark limit" value={`${shift.lateMarkLimit ?? '—'} times`} />
            <InfoRow label="Min work hours"  value={`${shift.minimumWorkHours ?? '—'} hrs`} />

            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-gray-500">Overtime</span>
              <Badge style={{ backgroundColor: '#111827', color: '#fff' }}>
                {shift.overtimeAllowed
                  ? `After ${shift.overtimeAfterMinutes ?? '?'} min`
                  : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-gray-500">Auto checkout</span>
              <Badge style={{ backgroundColor: shift.autoCheckout ? PRIMARY : '#9CA3AF', color: '#fff' }}>
                {shift.autoCheckout ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            {/* Week off grid */}
            <div className="py-3">
              <p className="text-sm font-semibold mb-3" style={{ color: PRIMARY }}>
                Weekly schedule
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ALL_DAYS.map(day => {
                  const isWorking = workingDays.includes(day)
                  return (
                    <div key={day}
                      className="flex flex-col items-center px-2 py-2 rounded-lg min-w-[42px]"
                      style={{
                        border:          isWorking ? `2px solid ${PRIMARY}` : '2px solid #E5E7EB',
                        backgroundColor: isWorking ? '#FDE8DD' : '#F9FAFB',
                      }}>
                      <span className="text-[10px] font-bold"
                        style={{ color: isWorking ? PRIMARY : '#9CA3AF' }}>
                        {day}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full mt-1"
                        style={{ backgroundColor: isWorking ? PRIMARY : '#D1D5DB' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Custom day timing table */}
            {shift.shiftType === 'CUSTOM' && shift.dayConfigs?.length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: PRIMARY }}>
                      {['Day','Start','End','Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-white font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shift.dayConfigs.map((dc, idx) => (
                      <tr key={dc.dayOfWeek}
                        style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td className="px-3 py-2 font-semibold text-gray-700">
                          {DAY_LABEL_MAP[dc.dayOfWeek] ?? dc.dayOfWeek}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {dc.isWeekOff ? '—' : (dc.startTime?.slice(0,5) ?? '—')}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {dc.isWeekOff ? '—' : (dc.endTime?.slice(0,5) ?? '—')}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: dc.isWeekOff ? '#F3F4F6' : '#DCFCE7',
                              color:           dc.isWeekOff ? '#6B7280'  : '#15803D',
                            }}>
                            {dc.isWeekOff ? 'Off' : 'Working'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — breaks + audit */}
        <div className="space-y-4">

          {/* Break policies */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#FDE8DD' }}>
                <Coffee size={14} color={PRIMARY} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Break policies</p>
                <p className="text-xs text-gray-400">
                  {shift.breaks?.length ?? 0} break type{shift.breaks?.length !== 1 ? 's' : ''} assigned
                </p>
              </div>
            </div>

            {(!shift.breaks || shift.breaks.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-4">No break policies assigned</p>
            ) : (
              <div className="space-y-2">
                {shift.breaks.map(b => (
                  <div key={b.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ backgroundColor: b.isPaid ? PRIMARY : '#111827' }}>
                    <span className="text-sm font-semibold text-white">{b.breakName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-200">{b.breakDurationMinutes} min</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: b.isPaid ? '#111827' : '#fff',
                          color:           b.isPaid ? '#fff'    : '#111827',
                        }}>
                        {b.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#6B7280" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Audit info</p>
                <p className="text-xs text-gray-400">Created &amp; last modified</p>
              </div>
            </div>
            <div>
              {[
                { label: 'Shift ID',      value: `#${String(shift.id).padStart(4,'0')}` },
                { label: 'Created at',    value: shift.createdAt
                    ? new Date(shift.createdAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })
                    : '—' },
                { label: 'Created by',    value: shift.createdBy ?? '—' },
                { label: 'Status',        value: shift.isActive ? 'Active' : 'Inactive' },
              ].map(({ label, value }) => (
                <div key={label}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold" style={{ color: PRIMARY }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 mt-6 pb-6">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {toggling && <Loader2 size={13} className="animate-spin" />}
          {shift.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          style={{ backgroundColor: '#111827' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#111827'}
        >
          {deleting && <Loader2 size={13} className="animate-spin" />}
          Delete shift
        </button>
        <button
          onClick={() => navigate(`/shifts/${id}/edit`)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = PRIMARY_DARK}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}
        >
          Edit Shift
        </button>
      </div>
    </>
  )
}