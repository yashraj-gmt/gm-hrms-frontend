// src/pages/auth/ForgotPasswordPage.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthPageLayout from '@/components/auth/AuthPageLayout'
import { useToast }   from '@/components/shared/toast/ToastProvider'
import authService    from '@/services/authService'
import { ROUTES }     from '@/constants/routes'

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

// ── Shared input style (mirrors LoginPage field look) ─────────
const fieldInput =
  'apl-input w-full bg-white border border-[#C35E33] rounded-xl text-gray-900 text-sm transition-all'
const fieldStyle = { height: '52px', padding: '0 16px', fontFamily: 'inherit' }

// SVG icons
const IconMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)

export default function ForgotPasswordPage() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!email.trim()) { setError('Email address is required.');          return }
    if (!isValidEmail(email)) { setError('Please enter a valid email.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authService.forgotPassword(email.trim().toLowerCase())
      toast.success(res.message || 'OTP sent! Check your inbox.', 'Email Sent')
      setSent(true)
      setTimeout(() => {
        navigate(ROUTES.VERIFY_OTP, { state: { email: email.trim().toLowerCase() } })
      }, 1800)
    } catch (err) {
      const msg = err?.message || 'Something went wrong. Please try again.'
      setError(msg)
      toast.error(msg, 'Request Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout
      title={<>Forgot <span className="text-[#C35E33]">Password</span></>}
      subtitle="Reset your password in just a few steps"
    >
      {sent ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FDF5F1', border: '2px solid #C35E33' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="#C35E33" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-gray-800">OTP Sent Successfully!</p>
          <p className="text-[13px] text-gray-500 max-w-xs">
            We sent a 6-digit code to <strong>{email}</strong>.{' '}
            It expires in <strong>5 minutes</strong>.
          </p>
          <p className="text-[12px] text-gray-400">Redirecting to verification…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>

          {/* Email field */}
          <div className="mb-6">
            <label className="block font-medium text-gray-800 text-sm mb-2">
              Enter Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="yourname@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                autoFocus
                autoComplete="email"
                className={fieldInput}
                style={{ ...fieldStyle, paddingRight: '46px' }}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C35E33] pointer-events-none flex">
                <IconMail />
              </span>
            </div>
            {error && (
              <p className="mt-1.5 text-red-500" style={{ fontSize: '11.5px' }}>{error}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full flex items-center justify-center gap-2 font-bold text-white bg-[#C35E33] hover:bg-[#a84d28] rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0"
            style={{
              height:     '52px',
              fontSize:   '15px',
              boxShadow:  '0 6px 22px rgba(195,94,51,0.38)',
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white flex-shrink-0"
                      style={{ animation: 'spinBtn 0.65s linear infinite' }} />
                Sending…
              </>
            ) : 'Send OTP'}
          </button>

        </form>
      )}

      {/* Back to login */}
      <p className="mt-5 text-center text-gray-500" style={{ fontSize: '13px' }}>
        Remember your password?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="font-semibold hover:underline"
          style={{ color: '#C35E33' }}
        >
          Sign In
        </Link>
      </p>
    </AuthPageLayout>
  )
}