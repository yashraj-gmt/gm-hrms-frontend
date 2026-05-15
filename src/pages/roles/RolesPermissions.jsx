// src/pages/roles/RolesPermissions.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permissions — HR role only
// Fully wired to backend REST APIs via rolesService.
// All mutations show toast feedback; loading / error states handled throughout.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Shield, Users, Search, Clock, ChevronDown, X, Check,
  UserCheck, Lock, Calendar, AlertTriangle, Edit2, Save,
  Info, Loader2, RefreshCw,
} from 'lucide-react'
import rolesService      from '@/services/rolesService'
import { useToast }      from '@/components/shared/toast/ToastProvider'

const PRIMARY       = '#C35E33'
const PRIMARY_DARK  = '#A34A24'
const PRIMARY_LIGHT = '#FDE8DD'

// ── Module display labels (must match backend ModuleType enum)
const MODULE_LABELS = {
  DASHBOARD:        'Dashboard',
  EMPLOYEES:        'Employees',
  ATTENDANCE:       'Attendance',
  LEAVE_MANAGEMENT: 'Leave Management',
  TIMESHEET:        'Timesheet',
  ROLES_PERMISSION: 'Roles & Permission',
  PAYROLL:          'Payroll',
  PROJECTS:         'Projects',
  REPORT:           'Report',
}

// Ordered list so table rows are always in a predictable order
const MODULE_ORDER = Object.keys(MODULE_LABELS)

const COLS = [
  { key: 'canAll',    label: 'All'    },
  { key: 'canView',   label: 'View'   },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit',   label: 'Edit'   },
  { key: 'canDelete', label: 'Delete' },
]

// Helpers
function Avatar({ initials, size = 8, color = PRIMARY }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

function Checkbox({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-110'
      }`}
      style={{
        borderColor:     checked ? '#16A34A' : '#D1D5DB',
        backgroundColor: checked ? '#16A34A' : '#fff',
      }}
    >
      {checked && <Check size={11} color="#fff" strokeWidth={3} />}
    </button>
  )
}

function Spinner({ size = 16, color = '#fff' }) {
  return <Loader2 size={size} color={color} className="animate-spin" />
}

// ── Build empty perms map from module list ────────────────────────────────────
function emptyPerms() {
  return MODULE_ORDER.reduce((acc, mod) => {
    acc[mod] = { canAll: false, canView: false, canCreate: false, canEdit: false, canDelete: false }
    return acc
  }, {})
}

// ── Convert API response array → keyed map ────────────────────────────────────
function permsArrayToMap(arr = []) {
  const map = emptyPerms()
  arr.forEach((p) => {
    if (map[p.module] !== undefined) {
      map[p.module] = {
        canAll:    !!p.canAll,
        canView:   !!p.canView,
        canCreate: !!p.canCreate,
        canEdit:   !!p.canEdit,
        canDelete: !!p.canDelete,
      }
    }
  })
  return map
}

// ── Convert keyed map → API request array ─────────────────────────────────────
function permsMapToArray(map) {
  return Object.entries(map).map(([module, p]) => ({
    module,
    canAll:    p.canAll,
    canView:   p.canView,
    canCreate: p.canCreate,
    canEdit:   p.canEdit,
    canDelete: p.canDelete,
  }))
}

// =============================================================================
// ROLE TRANSFER MODAL
// =============================================================================
function RoleTransferModal({ onClose, allUsers, toast }) {
  const overlayRef = useRef(null)

  const [selectedUser,    setSelectedUser]    = useState(null)
  const [showUserPicker,  setShowUserPicker]  = useState(false)
  const [startDate,       setStartDate]       = useState('')
  const [endDate,         setEndDate]         = useState('')
  const [permanent,       setPermanent]       = useState(false)
  const [otp,             setOtp]             = useState('')
  const [reason,          setReason]          = useState('')

  const [otpSending,      setOtpSending]      = useState(false)
  const [otpVerifying,    setOtpVerifying]    = useState(false)
  const [otpSent,         setOtpSent]         = useState(false)
  const [otpVerified,     setOtpVerified]     = useState(false)
  const [submitting,      setSubmitting]      = useState(false)

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Reset OTP verified state when OTP input changes
  useEffect(() => { setOtpVerified(false) }, [otp])

  const duration = useMemo(() => {
    if (!startDate || !endDate) return '—'
    const days = Math.round((new Date(endDate) - new Date(startDate)) / 86400000)
    if (days <= 0) return '—'
    if (days < 7)  return `${days} Day${days !== 1 ? 's' : ''}`
    const weeks = Math.round(days / 7)
    return `${weeks} Week${weeks !== 1 ? 's' : ''}`
  }, [startDate, endDate])

  // ── Generate OTP ────────────────────────────────────────────────────────────
  const handleGenerateOtp = async () => {
    setOtpSending(true)
    try {
      await rolesService.generateOtp('ROLE_TRANSFER')
      setOtpSent(true)
      setOtp('')
      setOtpVerified(false)
      toast.success(
        'OTP sent to your registered office email. Valid for 5 minutes.',
        'OTP Generated'
      )
    } catch (err) {
      toast.error(err?.message || 'Failed to generate OTP. Please try again.', 'OTP Error')
    } finally {
      setOtpSending(false)
    }
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.warning('Please enter the 6-digit OTP before verifying.', 'Incomplete OTP')
      return
    }
    setOtpVerifying(true)
    try {
      await rolesService.verifyOtp('ROLE_TRANSFER', otp)
      setOtpVerified(true)
      toast.success('OTP verified. You may now confirm the transfer.', 'Verified')
    } catch (err) {
      setOtpVerified(false)
      toast.error(
        err?.message || 'Invalid or expired OTP. Please generate a new one.',
        'Verification Failed'
      )
    } finally {
      setOtpVerifying(false)
    }
  }

  // ── Confirm Transfer ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedUser) {
      toast.warning('Please select a recipient user.', 'Missing Field')
      return
    }
    if (!reason.trim()) {
      toast.warning('Please provide a reason for the transfer.', 'Missing Field')
      return
    }
    if (!permanent && (!startDate || !endDate)) {
      toast.warning('Please set start and end dates for a temporary transfer.', 'Missing Dates')
      return
    }
    if (!otpVerified) {
      toast.warning('Please verify your OTP before confirming.', 'OTP Required')
      return
    }

    setSubmitting(true)
    try {
      await rolesService.confirmRoleTransfer({
        recipientPersonId: selectedUser.personalInformationId,
        startDate:  permanent ? undefined : startDate,
        endDate:    permanent ? undefined : endDate,
        isPermanent: permanent,
        reason,
        otp,
      })
      toast.success(
        `HR role successfully transferred to ${selectedUser.fullName}.`,
        'Role Transfer Confirmed'
      )
      onClose()
    } catch (err) {
      toast.error(
        err?.message || 'Failed to confirm role transfer. Please try again.',
        'Transfer Failed'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const assignedUsers = allUsers.filter((u) => u.assigned)

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 520, maxHeight: '92vh', margin: '0 16px' }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: PRIMARY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield size={18} color="#fff" />
            </div>
            <h2 className="text-white text-lg font-bold">Role Transfer</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Source + Recipient */}
          <div className="grid grid-cols-2 gap-4">
            {/* Source Role (locked) */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Source Role</p>
              <div
                className="flex items-center gap-3 p-3.5 rounded-xl border-2 bg-orange-50"
                style={{ borderColor: PRIMARY + '40' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
                  <Shield size={18} color="#fff" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">Human Resources</p>
                  <p className="text-[11px] text-gray-500">Permission</p>
                </div>
                <Lock size={14} color="#9CA3AF" className="ml-auto flex-shrink-0" />
              </div>
            </div>

            {/* Recipient picker */}
            <div className="relative">
              <p className="text-xs font-semibold text-gray-700 mb-2">Recipient User</p>
              <button
                onClick={() => setShowUserPicker(!showUserPicker)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 hover:bg-gray-50 transition-colors text-left"
                style={{ borderColor: showUserPicker ? PRIMARY : '#E5E7EB' }}
              >
                {selectedUser ? (
                  <>
                    <Avatar initials={selectedUser.avatarInitials} size={10} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{selectedUser.fullName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{selectedUser.designation}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 flex-1">Select recipient…</p>
                )}
                <ChevronDown
                  size={14} color="#9CA3AF"
                  className={`flex-shrink-0 transition-transform ${showUserPicker ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 max-h-48 overflow-y-auto">
                  {allUsers.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-gray-400">No users available</p>
                  ) : (
                    allUsers.map((u) => (
                      <button
                        key={u.personalInformationId}
                        onClick={() => { setSelectedUser(u); setShowUserPicker(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 transition-colors text-left"
                      >
                        <Avatar initials={u.avatarInitials} size={7} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{u.fullName}</p>
                          <p className="text-[10px] text-gray-500 truncate">{u.designation}</p>
                        </div>
                        {selectedUser?.personalInformationId === u.personalInformationId && (
                          <Check size={13} color={PRIMARY} className="ml-auto" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Delegation Period */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-3">Delegation Period</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border-2 p-3.5" style={{ borderColor: PRIMARY + '50' }}>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: PRIMARY }}>Start Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={13} color={PRIMARY} />
                  <input
                    type="date" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={permanent}
                    className="text-sm font-semibold text-gray-800 border-none outline-none bg-transparent w-full disabled:opacity-40"
                  />
                </div>
              </div>
              <div className="rounded-xl border-2 p-3.5" style={{ borderColor: PRIMARY + '50' }}>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: PRIMARY }}>End Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={13} color={PRIMARY} />
                  <input
                    type="date" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={permanent}
                    className="text-sm font-semibold text-gray-800 border-none outline-none bg-transparent w-full disabled:opacity-40"
                  />
                </div>
              </div>
              <div className="rounded-xl p-3.5 flex flex-col justify-center" style={{ backgroundColor: '#111827' }}>
                <p className="text-[10px] text-gray-400 font-medium">Total Duration</p>
                <p className="text-base font-bold text-white mt-0.5">
                  {permanent ? 'Permanent' : duration}
                </p>
              </div>
            </div>
          </div>

          {/* Permanent toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setPermanent(!permanent)}
              className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer"
              style={{ borderColor: permanent ? PRIMARY : '#D1D5DB', backgroundColor: permanent ? PRIMARY : '#fff' }}
            >
              {permanent && <Check size={11} color="#fff" strokeWidth={3} />}
            </div>
            <span className="text-sm font-semibold text-gray-800">Permanent Role Transfer</span>
          </label>

          {/* OTP Section */}
          <div className="space-y-3">
            <button
              onClick={handleGenerateOtp}
              disabled={otpSending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#16A34A' }}
            >
              {otpSending ? <Spinner size={14} /> : <RefreshCw size={13} />}
              {otpSent ? 'Resend OTP' : 'Generate OTP'}
            </button>

            {otpSent && (
              <div className="flex gap-3">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 h-11 px-4 text-sm border-2 rounded-xl outline-none tracking-[0.4em] font-mono placeholder:tracking-normal transition-colors"
                  style={{
                    borderColor: otpVerified ? '#16A34A' : otp.length === 6 ? PRIMARY : '#E5E7EB',
                  }}
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || otpVerifying || otpVerified}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: otpVerified ? '#16A34A' : PRIMARY }}
                >
                  {otpVerifying ? <Spinner size={14} /> : null}
                  {otpVerified ? '✓ Verified' : 'Verify'}
                </button>
              </div>
            )}

            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Shield size={11} />
              Confirm Transfer will be enabled once your identity is verified via OTP.
            </p>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Reason of Declaration</p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide institutional justification for this elevated access…"
              className="w-full px-4 py-3 text-sm text-gray-700 border-2 rounded-xl outline-none resize-none placeholder:text-gray-400 focus:border-orange-300 transition-colors"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!otpVerified || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: PRIMARY }}
          >
            {submitting && <Spinner size={14} />}
            Confirm Declaration
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// DESIGNATION TRANSFER MODAL
// =============================================================================
function DesignationTransferModal({ onClose, allUsers, designations, toast }) {
  const overlayRef = useRef(null)

  const [selectedUser,   setSelectedUser]   = useState(null)
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [fromDesigId,    setFromDesigId]    = useState('')
  const [toDesigName,    setToDesigName]    = useState('')
  const [startDate,      setStartDate]      = useState('')
  const [endDate,        setEndDate]        = useState('')
  const [permanent,      setPermanent]      = useState(false)
  const [otp,            setOtp]            = useState('')
  const [reason,         setReason]         = useState('')

  const [otpSending,   setOtpSending]   = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpSent,      setOtpSent]      = useState(false)
  const [otpVerified,  setOtpVerified]  = useState(false)
  const [submitting,   setSubmitting]   = useState(false)

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  useEffect(() => { setOtpVerified(false) }, [otp])

  const duration = useMemo(() => {
    if (!startDate || !endDate) return '—'
    const days = Math.round((new Date(endDate) - new Date(startDate)) / 86400000)
    if (days <= 0) return '—'
    if (days < 7)  return `${days} Day${days !== 1 ? 's' : ''}`
    const weeks = Math.round(days / 7)
    return `${weeks} Week${weeks !== 1 ? 's' : ''}`
  }, [startDate, endDate])

  const handleGenerateOtp = async () => {
    setOtpSending(true)
    try {
      await rolesService.generateOtp('DESIGNATION_TRANSFER')
      setOtpSent(true)
      setOtp('')
      setOtpVerified(false)
      toast.success('OTP sent to your registered office email. Valid for 5 minutes.', 'OTP Generated')
    } catch (err) {
      toast.error(err?.message || 'Failed to generate OTP.', 'OTP Error')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.warning('Please enter the 6-digit OTP.', 'Incomplete OTP')
      return
    }
    setOtpVerifying(true)
    try {
      await rolesService.verifyOtp('DESIGNATION_TRANSFER', otp)
      setOtpVerified(true)
      toast.success('OTP verified. You may now confirm the designation transfer.', 'Verified')
    } catch (err) {
      setOtpVerified(false)
      toast.error(err?.message || 'Invalid or expired OTP.', 'Verification Failed')
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedUser) { toast.warning('Please select an employee.', 'Missing Field'); return }
    if (!fromDesigId)  { toast.warning('Please select the current designation.', 'Missing Field'); return }
    if (!toDesigName.trim()) { toast.warning('Please enter the target designation.', 'Missing Field'); return }
    if (!reason.trim())      { toast.warning('Please provide a reason.', 'Missing Field'); return }
    if (!permanent && (!startDate || !endDate)) {
      toast.warning('Please set start and end dates.', 'Missing Dates')
      return
    }
    if (!otpVerified) { toast.warning('Please verify your OTP first.', 'OTP Required'); return }

    setSubmitting(true)
    try {
      await rolesService.confirmDesignationTransfer({
        personId:          selectedUser.personalInformationId,
        fromDesignationId: Number(fromDesigId),
        toDesignationName: toDesigName.trim(),
        startDate:  permanent ? undefined : startDate,
        endDate:    permanent ? undefined : endDate,
        isPermanent: permanent,
        reason,
        otp,
      })
      toast.success(
        `Designation changed to "${toDesigName}" for ${selectedUser.fullName}.`,
        'Designation Transfer Confirmed'
      )
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Failed to confirm designation transfer.', 'Transfer Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 520, maxHeight: '92vh', margin: '0 16px' }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: PRIMARY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <UserCheck size={18} color="#fff" />
            </div>
            <h2 className="text-white text-lg font-bold">Designation Transfer</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Employee picker */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Employee</p>
            <div className="relative">
              <button
                onClick={() => setShowUserPicker(!showUserPicker)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 hover:bg-gray-50 transition-colors text-left"
                style={{ borderColor: showUserPicker ? PRIMARY : '#E5E7EB' }}
              >
                {selectedUser ? (
                  <>
                    <Avatar initials={selectedUser.avatarInitials} size={9} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{selectedUser.fullName}</p>
                      <p className="text-[11px] text-gray-500">{selectedUser.designation}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 flex-1">Select employee…</p>
                )}
                <ChevronDown size={14} color="#9CA3AF" className={`flex-shrink-0 transition-transform ${showUserPicker ? 'rotate-180' : ''}`} />
              </button>
              {showUserPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 max-h-40 overflow-y-auto">
                  {allUsers.map((u) => (
                    <button
                      key={u.personalInformationId}
                      onClick={() => { setSelectedUser(u); setFromDesigId(''); setShowUserPicker(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 transition-colors text-left"
                    >
                      <Avatar initials={u.avatarInitials} size={7} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{u.fullName}</p>
                        <p className="text-[10px] text-gray-500 truncate">{u.designation}</p>
                      </div>
                      {selectedUser?.personalInformationId === u.personalInformationId && <Check size={13} color={PRIMARY} className="ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* From / To Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">From Designation</p>
              <div className="relative">
                <select
                  value={fromDesigId}
                  onChange={(e) => setFromDesigId(e.target.value)}
                  className="w-full px-4 py-3 text-sm font-semibold text-gray-900 border-2 rounded-xl outline-none appearance-none bg-white cursor-pointer"
                  style={{ borderColor: PRIMARY + '50' }}
                >
                  <option value="">Select…</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#9CA3AF" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">To Designation</p>
              <input
                type="text"
                value={toDesigName}
                onChange={(e) => setToDesigName(e.target.value)}
                placeholder="New designation name…"
                className="w-full px-4 py-3 text-sm font-semibold text-gray-900 border-2 rounded-xl outline-none"
                style={{ borderColor: PRIMARY + '50' }}
              />
            </div>
          </div>

          {/* Delegation Period */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-3">Delegation Period</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border-2 p-3.5" style={{ borderColor: PRIMARY + '50' }}>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: PRIMARY }}>Start Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={13} color={PRIMARY} />
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={permanent}
                    className="text-sm font-semibold text-gray-800 border-none outline-none bg-transparent w-full disabled:opacity-40" />
                </div>
              </div>
              <div className="rounded-xl border-2 p-3.5" style={{ borderColor: PRIMARY + '50' }}>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: PRIMARY }}>End Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={13} color={PRIMARY} />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={permanent}
                    className="text-sm font-semibold text-gray-800 border-none outline-none bg-transparent w-full disabled:opacity-40" />
                </div>
              </div>
              <div className="rounded-xl p-3.5 flex flex-col justify-center" style={{ backgroundColor: '#111827' }}>
                <p className="text-[10px] text-gray-400 font-medium">Total Duration</p>
                <p className="text-base font-bold text-white mt-0.5">{permanent ? 'Permanent' : duration}</p>
              </div>
            </div>
          </div>

          {/* Permanent toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setPermanent(!permanent)}
              className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer"
              style={{ borderColor: permanent ? PRIMARY : '#D1D5DB', backgroundColor: permanent ? PRIMARY : '#fff' }}
            >
              {permanent && <Check size={11} color="#fff" strokeWidth={3} />}
            </div>
            <span className="text-sm font-semibold text-gray-800">Permanent Designation Transfer</span>
          </label>

          {/* OTP */}
          <div className="space-y-3">
            <button
              onClick={handleGenerateOtp}
              disabled={otpSending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#16A34A' }}
            >
              {otpSending ? <Spinner size={14} /> : <RefreshCw size={13} />}
              {otpSent ? 'Resend OTP' : 'Generate OTP'}
            </button>

            {otpSent && (
              <div className="flex gap-3">
                <input
                  type="text" maxLength={6} placeholder="• • • • • •"
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 h-11 px-4 text-sm border-2 rounded-xl outline-none tracking-[0.4em] font-mono placeholder:tracking-normal"
                  style={{ borderColor: otpVerified ? '#16A34A' : otp.length === 6 ? PRIMARY : '#E5E7EB' }}
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || otpVerifying || otpVerified}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: otpVerified ? '#16A34A' : PRIMARY }}
                >
                  {otpVerifying && <Spinner size={14} />}
                  {otpVerified ? '✓ Verified' : 'Verify'}
                </button>
              </div>
            )}

            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Shield size={11} />
              Confirm Transfer will be enabled once your identity is verified via OTP.
            </p>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Reason of Declaration</p>
            <textarea
              rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide institutional justification…"
              className="w-full px-4 py-3 text-sm text-gray-700 border-2 rounded-xl outline-none resize-none placeholder:text-gray-400 focus:border-orange-300 transition-colors"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose} disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!otpVerified || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: PRIMARY }}
          >
            {submitting && <Spinner size={14} />}
            Confirm Declaration
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ASSIGN USERS MODAL
// =============================================================================
function AssignUsersModal({ allUsers, onClose, onSave, toast }) {
  const [localUsers, setLocalUsers] = useState(allUsers.map((u) => ({ ...u })))
  const [search,     setSearch]     = useState('')
  const [saving,     setSaving]     = useState(false)

  const filtered = useMemo(() =>
    localUsers.filter((u) =>
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.designation?.toLowerCase().includes(search.toLowerCase())
    ), [localUsers, search])

  const toggle = (id) => {
    setLocalUsers((prev) =>
      prev.map((u) => u.personalInformationId === id ? { ...u, assigned: !u.assigned } : u)
    )
  }

  const assignedCount = localUsers.filter((u) => u.assigned).length

  const handleSave = async () => {
    setSaving(true)
    try {
      const ids = localUsers.filter((u) => u.assigned).map((u) => u.personalInformationId)
      await rolesService.assignUsers('HR', ids)
      toast.success(
        `${ids.length} user${ids.length !== 1 ? 's' : ''} assigned to Human Resources role.`,
        'Assignment Saved'
      )
      onSave(localUsers)
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Failed to save assignments. Please try again.', 'Save Failed')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      onClick={(e) => { if (e.currentTarget === e.target) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 460, maxHeight: '85vh', margin: '0 16px' }}
      >
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: '#111827' }}>
          <div>
            <p className="text-white font-semibold text-sm">Assign Users to Role</p>
            <p className="text-gray-400 text-[11px] mt-0.5">Human Resources · {assignedCount} assigned</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <label className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 h-9 border border-gray-200">
            <Search size={13} color="#9CA3AF" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="border-none outline-none text-[13px] text-gray-900 bg-transparent flex-1"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No users match your search.</p>
          ) : (
            filtered.map((u) => (
              <div
                key={u.personalInformationId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => toggle(u.personalInformationId)}
              >
                <Avatar initials={u.avatarInitials} size={9} color={u.assigned ? PRIMARY : '#9CA3AF'} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.fullName}</p>
                  <p className="text-[11px] text-gray-500 truncate">{u.designation}</p>
                </div>
                <div
                  className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0"
                  style={{ borderColor: u.assigned ? '#16A34A' : '#D1D5DB', backgroundColor: u.assigned ? '#16A34A' : '#fff' }}
                >
                  {u.assigned && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: PRIMARY }}
          >
            {saving && <Spinner size={14} />}
            Save Assignment
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================
export default function RolesPermissions() {
  const { toast } = useToast()

  // ── State ───────────────────────────────────────────────────────────────────
  const [perms,       setPerms]       = useState(emptyPerms())
  const [allUsers,    setAllUsers]    = useState([])
  const [designations, setDesignations] = useState([])
  const [roleInfo,    setRoleInfo]    = useState({ assignedUserCount: 0 })

  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [dirty,       setDirty]       = useState(false)

  const [showRole,    setShowRole]    = useState(false)
  const [showDesig,   setShowDesig]   = useState(false)
  const [showAssign,  setShowAssign]  = useState(false)

  // ── Initial data load ───────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [matrixRes, usersRes] = await Promise.all([
        rolesService.getPermissions('HR'),
        rolesService.getAssignedUsers('HR'),
      ])

      setPerms(permsArrayToMap(matrixRes?.permissions ?? []))
      setRoleInfo({ assignedUserCount: matrixRes?.assignedUserCount ?? 0 })
      setAllUsers(usersRes ?? [])

      // Extract unique designations from user list for the designation transfer dropdown
      const seen = new Set()
      const desigs = []
      ;(usersRes ?? []).forEach((u) => {
        if (u.designation && !seen.has(u.designation)) {
          seen.add(u.designation)
          desigs.push({ id: u.designation, name: u.designation }) // use name as id fallback
        }
      })
      setDesignations(desigs)

      setDirty(false)
    } catch (err) {
      toast.error(
        err?.message || 'Failed to load roles & permissions. Please refresh.',
        'Load Error'
      )
    } finally {
      setLoading(false)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  // ── Toggle a single permission cell ─────────────────────────────────────────
  const togglePerm = (moduleKey, col) => {
    setPerms((prev) => {
      const current = { ...prev[moduleKey] }

      if (col === 'canAll') {
        const newAll = !current.canAll
        return {
          ...prev,
          [moduleKey]: {
            canAll: newAll, canView: newAll, canCreate: newAll,
            canEdit: newAll, canDelete: newAll,
          },
        }
      }

      const updated = { ...current, [col]: !current[col] }
      updated.canAll = updated.canView && updated.canCreate && updated.canEdit && updated.canDelete
      return { ...prev, [moduleKey]: updated }
    })
    setDirty(true)
    setSaved(false)
  }

  // ── Save permissions ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await rolesService.savePermissions({
        roleType: 'HR',
        permissions: permsMapToArray(perms),
      })
      setPerms(permsArrayToMap(updated?.permissions ?? []))
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success(
        'Permission matrix saved. Changes are effective immediately.',
        'Permissions Saved'
      )
    } catch (err) {
      toast.error(
        err?.message || 'Failed to save permissions. Please try again.',
        'Save Failed'
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Handle user assignment update ────────────────────────────────────────────
  const handleAssignSave = (updatedUsers) => {
    setAllUsers(updatedUsers)
    const count = updatedUsers.filter((u) => u.assigned).length
    setRoleInfo((prev) => ({ ...prev, assignedUserCount: count }))
  }

  const assignedUsers = allUsers.filter((u) => u.assigned)

  // ── Skeleton rows ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={28} color={PRIMARY} />
          <p className="text-sm text-gray-400">Loading permissions…</p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Roles &amp; Permissions</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage access control for Human Resources</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── Left panel ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4" style={{ width: 240, flexShrink: 0 }}>

          {/* Role Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Roles</p>
              <Info size={14} color="#9CA3AF" />
            </div>
            <div className="p-3">
              <div
                className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer"
                style={{ borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
                  <Shield size={16} color="#fff" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">Human Resources</p>
                  <p className="text-[11px] text-gray-500">
                    {String(roleInfo.assignedUserCount).padStart(2, '0')} Users assigned
                  </p>
                </div>
                <button className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/60 transition-colors">
                  <Edit2 size={12} color={PRIMARY} />
                </button>
              </div>
            </div>
          </div>

          {/* Assigned Users Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Assigned Users</p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                {assignedUsers.length}
              </span>
            </div>
            <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
              {assignedUsers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No users assigned.</p>
              ) : (
                assignedUsers.map((u) => (
                  <div
                    key={u.personalInformationId}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar initials={u.avatarInitials} size={7} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{u.fullName}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.designation}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-3 pb-3">
              <button
                onClick={() => setShowAssign(true)}
                className="w-full py-2 rounded-xl text-xs font-semibold border-2 border-dashed transition-colors hover:bg-orange-50"
                style={{ borderColor: PRIMARY, color: PRIMARY }}
              >
                + Manage Users
              </button>
            </div>
          </div>
        </div>

        {/* ── Right panel: Permission Table ─────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Table header bar */}
          <div
            className="flex items-center justify-between px-5 py-4 rounded-t-2xl flex-wrap gap-3"
            style={{ backgroundColor: PRIMARY }}
          >
            <p className="text-white font-bold text-sm">Permissions : Human Resources</p>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowRole(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/40 text-xs font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                <Shield size={12} />
                Role Transfer
              </button>
              <button
                onClick={() => setShowDesig(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                style={{ backgroundColor: '#111827', color: '#fff' }}
              >
                <UserCheck size={12} />
                Designation Transfer
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-50"
                style={{
                  borderColor:     '#fff',
                  color:           '#fff',
                  backgroundColor: saved ? '#16A34A' : 'transparent',
                }}
              >
                {saving ? (
                  <><Spinner size={12} /> Saving…</>
                ) : saved ? (
                  <><Check size={12} /> Saved!</>
                ) : (
                  <><Save size={12} /> Save Changes</>
                )}
              </button>
            </div>
          </div>

          {/* Permissions Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-900">
                    Module Name
                  </th>
                  {COLS.map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-5 py-3.5 text-center text-xs font-semibold"
                      style={{ color: key === 'canAll' ? PRIMARY : '#111827' }}
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-700">
                    Schedule
                  </th>
                </tr>
              </thead>
              <tbody>
                {MODULE_ORDER.map((moduleKey, idx) => {
                  const p = perms[moduleKey] || {}
                  return (
                    <tr
                      key={moduleKey}
                      className="hover:bg-orange-50/40 transition-colors"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                    >
                      <td className="px-5 py-4 border-b border-gray-50">
                        <span className="text-sm font-medium text-gray-800">
                          {MODULE_LABELS[moduleKey]}
                        </span>
                      </td>
                      {COLS.map(({ key }) => (
                        <td key={key} className="px-5 py-4 border-b border-gray-50 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={!!p[key]}
                              onChange={() => togglePerm(moduleKey, key)}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-5 py-4 border-b border-gray-50 text-center">
                        <button className="w-7 h-7 mx-auto flex items-center justify-center rounded-full border border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                          <Clock size={13} color={PRIMARY} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Warning bar */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
            <AlertTriangle size={12} color="#854D0E" />
            <p className="text-[11px] text-yellow-800">
              Changes to permissions take effect immediately upon saving. Review carefully before saving.
            </p>
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showRole && (
        <RoleTransferModal
          onClose={() => setShowRole(false)}
          allUsers={allUsers}
          toast={toast}
        />
      )}
      {showDesig && (
        <DesignationTransferModal
          onClose={() => setShowDesig(false)}
          allUsers={allUsers}
          designations={designations}
          toast={toast}
        />
      )}
      {showAssign && (
        <AssignUsersModal
          allUsers={allUsers}
          onClose={() => setShowAssign(false)}
          onSave={handleAssignSave}
          toast={toast}
        />
      )}
    </>
  )
}