// src/pages/auth/VerifyOTPPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthPageLayout from '@/components/auth/AuthPageLayout'
import { useToast }   from '@/components/shared/toast/ToastProvider'
import authService    from '@/services/authService'
import { ROUTES }     from '@/constants/routes'

const OTP_LENGTH     = 6
const TIMER_DURATION = 5 * 60
const STORAGE_KEY    = 'otp_expiry_ts'

function getRemainingSeconds() {
  const expiry = sessionStorage.getItem(STORAGE_KEY)
  if (!expiry) return 0
  return Math.max(0, Math.floor((Number(expiry) - Date.now()) / 1000))
}
function saveExpiryTimestamp() {
  sessionStorage.setItem(STORAGE_KEY, String(Date.now() + TIMER_DURATION * 1000))
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function CountdownTimer({ seconds }) {
  const mm    = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss    = String(seconds % 60).padStart(2, '0')
  const isLow = seconds <= 60
  return (
    <p className="text-[15px] font-bold transition-colors" style={{ color: isLow ? '#DC2626' : '#C35E33' }}>
      {mm}:{ss}
    </p>
  )
}

const OtpBox = ({ digit, index, stableRef, onDigitChange, onKeyDown, onPaste, hasError }) => {
  const [focused, setFocused] = useState(false)

  const border = hasError
    ? '#DC2626'
    : focused
    ? '#C35E33'
    : digit
    ? '#C35E33'
    : '#E8C9B8'

  return (
    <input
      ref={stableRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={digit}
      onChange={(e) => onDigitChange(index, e)}
      onKeyDown={(e) => onKeyDown(index, e)}
      onPaste={onPaste}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoComplete="one-time-code"
      aria-label={`OTP digit ${index + 1}`}
      className="rounded-xl text-center text-[20px] font-bold text-gray-900
                 outline-none transition-colors duration-200"
      style={{
        width: 'clamp(38px,6vw,52px)',
        height: 'clamp(46px,7vw,60px)',
        border: `1.5px solid ${border}`,
        backgroundColor: digit ? '#FDF5F1' : '#FAFAFA',
        boxShadow: focused ? '0 0 0 3px rgba(195,94,51,0.12)' : 'none',
      }}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function VerifyOTPPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { toast } = useToast()
  const email     = location.state?.email || ''

  useEffect(() => {
    if (!email) navigate(ROUTES.FORGOT_PASSWORD, { replace: true })
  }, [email, navigate])

  const [otp,       setOtp]       = useState(Array(OTP_LENGTH).fill(''))
  const [hasError,  setHasError]  = useState(false)
  const [errorMsg,  setErrorMsg]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [resending, setResending] = useState(false)

  const [timer, setTimer] = useState(() => {
    const rem = getRemainingSeconds()
    if (rem > 0) return rem
    saveExpiryTimestamp()
    return TIMER_DURATION
  })

  const domRefs = useRef(Array(OTP_LENGTH).fill(null))

  // One stable useCallback per index stored in an array.
  // We build this once on mount and never recreate it.
  const stableRefCallbacks = useRef(
    Array.from({ length: OTP_LENGTH }, (_, i) =>
      (el) => { domRefs.current[i] = el }
    )
  )

  const focus = useCallback((index) => {
    if (index < 0 || index >= OTP_LENGTH) return
    domRefs.current[index]?.focus()
  }, [])

  const clearError = useCallback(() => {
    setHasError(false)
    setErrorMsg('')
  }, [])

  const resetAll = useCallback(() => {
    setOtp(Array(OTP_LENGTH).fill(''))
    clearError()
  }, [clearError])

const handleDigitChange = useCallback((index, e) => {
  const value = e.target.value.replace(/\D/g, '')

  if (!value) {
    setOtp((prev) => {
      const next = [...prev]
      next[index] = ''
      return next
    })
    return
  }

  clearError()

  setOtp((prev) => {
    const next = [...prev]
    next[index] = value[0]
    return next
  })

  // Auto move to next field
  if (index < OTP_LENGTH - 1) {
    setTimeout(() => {
      focus(index + 1)
    }, 0)
  }
}, [focus, clearError])

  const handleKeyDown = useCallback((index, e) => {
  const { key } = e

  if (key === 'ArrowLeft') {
    e.preventDefault()
    focus(index - 1)
    return
  }

  if (key === 'ArrowRight') {
    e.preventDefault()
    focus(index + 1)
    return
  }

  if (key === 'Tab') return

  if (key === 'Backspace') {
    setOtp((prev) => {
      const next = [...prev]

      if (prev[index]) {
        next[index] = ''
      } else if (index > 0) {
        next[index - 1] = ''
        focus(index - 1)
      }

      return next
    })

    clearError()
  }
}, [focus, clearError])

  // ── Paste ─────────────────────────────────────────────────────────────────
  const handlePaste = useCallback((e) => {
    e.preventDefault()
    clearError()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!digits) return
    setOtp((prev) => {
      const next = [...prev]
      digits.split('').forEach((d, i) => { next[i] = d })
      return next
    })
    focus(Math.min(digits.length, OTP_LENGTH - 1))
  }, [focus, clearError])

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer(getRemainingSeconds()), 1000)
    return () => clearInterval(id)
  }, [timer])

  useEffect(() => {
    if (timer === 0) toast.warning('Your OTP has expired. Please request a new one.', 'OTP Expired')
  }, [timer]) // eslint-disable-line

  // ── Verify ────────────────────────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    const code = otp.join('')
    if (code.length < OTP_LENGTH) {
      setHasError(true); setErrorMsg('Please enter all 6 digits of your OTP.'); return
    }
    if (timer <= 0) {
      setHasError(true); setErrorMsg('Your OTP has expired. Please request a new one.'); return
    }
    setLoading(true)
    try {
      const res = await authService.verifyOtp(email, code)
      toast.success(res.message || 'OTP verified. You can now reset your password.', 'Verified')
      sessionStorage.removeItem(STORAGE_KEY)
      navigate(ROUTES.RESET_PASSWORD, { state: { email, otp: code } })
    } catch (err) {
      const msg = err?.message || 'Invalid OTP. Please check and try again.'
      setHasError(true); setErrorMsg(msg)
      toast.error(msg, 'Verification Failed')
      resetAll()
      focus(0)
    } finally {
      setLoading(false)
    }
  }, [otp, email, navigate, toast, timer, focus, resetAll])

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (timer > 0 || resending) return
    setResending(true)
    try {
      const res = await authService.forgotPassword(email)
      toast.success(res.message || 'A new OTP has been sent to your email.', 'OTP Resent')
      resetAll()
      saveExpiryTimestamp()
      setTimer(TIMER_DURATION)
      setTimeout(() => focus(0), 50)
    } catch (err) {
      toast.error(err?.message || 'Failed to resend OTP.', 'Error')
    } finally {
      setResending(false)
    }
  }, [email, toast, timer, resending, focus, resetAll])

  const isComplete = otp.every(Boolean)

  return (
    <AuthPageLayout
      title={<>Verify <span className="text-[#C35E33]">OTP</span></>}
      subtitle={email ? `Code sent to ${email}` : 'Enter the 6-digit code sent to your email'}
    >
      {/* Paste wrapper — catches paste on any child input */}
      <div onPaste={handlePaste}>

        {/* OTP boxes */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {otp.map((digit, i) => (
            <OtpBox
  key={i}
  index={i}
  digit={digit}
  stableRef={stableRefCallbacks.current[i]}
  onDigitChange={handleDigitChange}
  onKeyDown={handleKeyDown}
  onPaste={handlePaste}
  hasError={hasError}
/>
          ))}
        </div>

        {errorMsg && (
          <p className="mt-1.5 mb-3 text-red-500 text-center font-medium" style={{ fontSize: '11.5px' }}>
            {errorMsg}
          </p>
        )}

        {/* Timer */}
        <div className="flex flex-col items-center gap-1 mb-5 mt-3">
          <p className="text-gray-400 font-medium" style={{ fontSize: '12px' }}>
            {timer > 0 ? 'Code expires in' : 'Code expired'}
          </p>
          <CountdownTimer seconds={timer} />
          <button
            type="button"
            onClick={handleResend}
            disabled={timer > 0 || resending}
            className="font-bold transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: '13px', color: timer <= 0 ? '#C35E33' : '#9CA3AF' }}
          >
            {resending ? 'Sending…' : "Didn't receive it? Resend OTP"}
          </button>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={!isComplete || timer <= 0 || loading}
          className="w-full flex items-center justify-center gap-2 font-bold text-white
                     bg-[#C35E33] hover:bg-[#a84d28] rounded-xl transition-all
                     disabled:opacity-55 disabled:cursor-not-allowed
                     hover:-translate-y-px active:translate-y-0"
          style={{ height: '52px', fontSize: '15px', boxShadow: '0 6px 22px rgba(195,94,51,0.38)' }}
        >
          {loading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white flex-shrink-0"
                style={{ animation: 'spinBtn 0.65s linear infinite' }}
              />
              Verifying…
            </>
          ) : 'Verify OTP'}
        </button>

      </div>

      {/* Back link */}
      <p className="mt-5 text-center text-gray-500" style={{ fontSize: '13px' }}>
        <Link to={ROUTES.FORGOT_PASSWORD} className="font-semibold hover:underline" style={{ color: '#C35E33' }}>
          ← Change email address
        </Link>
      </p>
    </AuthPageLayout>
  )
}