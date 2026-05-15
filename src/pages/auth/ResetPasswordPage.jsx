// src/pages/auth/ResetPasswordPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthPageLayout from '@/components/auth/AuthPageLayout'
import { useToast }   from '@/components/shared/toast/ToastProvider'
import authService    from '@/services/authService'
import { ROUTES }     from '@/constants/routes'

// ── Password strength bar ─────────────────────────────────────
function StrengthBar({ password }) {
  if (!password) return null
  let score = 0
  if (password.length >= 8)          score++
  if (/[A-Z]/.test(password))        score++
  if (/[0-9]/.test(password))        score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#16A34A']

  return (
    <div className="mt-1.5 mb-4">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: s <= score ? colors[score] : '#E5E7EB' }}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium" style={{ color: colors[score] }}>
        {labels[score]} password
      </p>
    </div>
  )
}

// SVG eye icons
const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// ── Password input with show/hide toggle ──────────────────────
function PasswordField({ label, placeholder, value, onChange, error, autoFocus }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block font-medium text-gray-800 text-sm mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          autoComplete="new-password"
          className="apl-input w-full bg-white border border-[#C35E33] rounded-xl text-gray-900 text-sm transition-all"
          style={{ height: '52px', padding: '0 46px 0 16px', fontFamily: 'inherit' }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C35E33] hover:text-[#a84d28] transition-colors flex p-0.5"
        >
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-red-500" style={{ fontSize: '11.5px' }}>{error}</p>}
    </div>
  )
}

export default function ResetPasswordPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { toast } = useToast()

  const email = location.state?.email || ''
  const otp   = location.state?.otp   || ''

  useEffect(() => {
    if (!email || !otp) {
      toast.warning('Please complete OTP verification first.', 'Access Denied')
      navigate(ROUTES.FORGOT_PASSWORD, { replace: true })
    }
  }, [email, otp]) // eslint-disable-line

  const [form,    setForm]    = useState({ newPassword: '', confirmPassword: '' })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.newPassword)
      next.newPassword = 'New password is required.'
    else if (form.newPassword.length < 8)
      next.newPassword = 'Password must be at least 8 characters.'
    if (!form.confirmPassword)
      next.confirmPassword = 'Please confirm your new password.'
    else if (form.newPassword !== form.confirmPassword)
      next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await authService.resetPassword(email, otp, form.newPassword)
      toast.success(res.message || 'Password reset successfully. Please log in.', 'Password Reset')
      setSuccess(true)
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2500)
    } catch (err) {
      const msg = err?.message || 'Failed to reset password. Please try again.'
      toast.error(msg, 'Reset Failed')
      if (err?.status === 400 || err?.status === 404) setErrors({ newPassword: msg })
    } finally {
      setLoading(false)
    }
  }

  const isFormFilled = form.newPassword && form.confirmPassword

  return (
    <AuthPageLayout
      title={<>Reset <span className="text-[#C35E33]">Password</span></>}
      subtitle="Set a new password and keep your account safe"
    >
      {success ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F0FDF4', border: '2px solid #16A34A' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                 stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <p className="text-[16px] font-bold text-gray-900">Password Reset!</p>
          <p className="text-[13px] text-gray-500">Redirecting you to login…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>

          {/* New password */}
          <div className="mb-1">
            <PasswordField
              label="New Password"
              placeholder="Min. 8 characters"
              value={form.newPassword}
              onChange={set('newPassword')}
              error={errors.newPassword}
              autoFocus
            />
          </div>
          <StrengthBar password={form.newPassword} />

          {/* Confirm password */}
          <div className="mb-6">
            <PasswordField
              label="Confirm Password"
              placeholder="Re-enter your new password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={errors.confirmPassword}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormFilled || loading}
            className="w-full flex items-center justify-center gap-2 font-bold text-white bg-[#C35E33] hover:bg-[#a84d28] rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0"
            style={{
              height:    '52px',
              fontSize:  '15px',
              boxShadow: '0 6px 22px rgba(195,94,51,0.38)',
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white flex-shrink-0"
                      style={{ animation: 'spinBtn 0.65s linear infinite' }} />
                Resetting…
              </>
            ) : 'Reset Password'}
          </button>

        </form>
      )}

      {/* Back link */}
      <p className="mt-5 text-center text-gray-500" style={{ fontSize: '13px' }}>
        <Link to={ROUTES.LOGIN} className="font-semibold hover:underline" style={{ color: '#C35E33' }}>
          ← Back to Login
        </Link>
      </p>
    </AuthPageLayout>
  )
}