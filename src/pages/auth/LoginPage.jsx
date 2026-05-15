// src/pages/auth/LoginPage.jsx
import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthPageLayout   from '@/components/auth/AuthPageLayout'
import { useAuthStore } from '@/store/authStore'
import { useToast }     from '@/components/shared/toast/ToastProvider'
import authService      from '@/services/authService'
import { ROUTES }       from '@/constants/routes'

const isValidEmail  = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const normaliseEmail = (v) => v.trim().toLowerCase()

// SVG Icons
const IconMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function LoginPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const loginStore = useAuthStore((s) => s.login)
  const { toast }  = useToast()
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.email)                    next.email    = 'Email is required.'
    else if (!isValidEmail(form.email)) next.email    = 'Please enter a valid email address.'
    if (!form.password)                 next.password = 'Password is required.'
    else if (form.password.length < 6)  next.password = 'Password must be at least 6 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await authService.login(normaliseEmail(form.email), form.password)
      loginStore(res.data)
      toast.success('Welcome back! Redirecting to your dashboard.', 'Login Successful')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Invalid credentials. Please try again.', 'Login Failed')
    } finally {
      setLoading(false)
    }
  }

  const isFormFilled = form.email.trim() && form.password

  return (
    <AuthPageLayout
      title={<>Login to <span className="text-[#C35E33]">GM HRMS</span></>}
    >
      <form onSubmit={handleSubmit} noValidate>

        {/* Email */}
        <div className="mb-5">
          <label className="block font-medium text-gray-800 text-sm mb-2">
            Enter Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              placeholder="yourname@company.com"
              value={form.email}
              onChange={set('email')}
              autoFocus
              autoComplete="email"
              className="apl-input w-full bg-white border border-[#C35E33] rounded-xl text-gray-900 text-sm transition-all"
              style={{ height: '52px', padding: '0 46px 0 16px', fontFamily: 'inherit' }}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C35E33] pointer-events-none flex">
              <IconMail />
            </span>
          </div>
          {errors.email && (
            <p className="mt-1.5 text-red-500" style={{ fontSize: '11.5px' }}>{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block font-medium text-gray-800 text-sm mb-2">
            Enter Your Password
          </label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••••"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
              className="apl-input w-full bg-white border border-[#C35E33] rounded-xl text-gray-900 text-sm transition-all"
              style={{ height: '52px', padding: '0 46px 0 16px', fontFamily: 'inherit' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C35E33] hover:text-[#a84d28] transition-colors flex p-0.5"
            >
              {showPwd ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-red-500" style={{ fontSize: '11.5px' }}>{errors.password}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isFormFilled || loading}
          className="w-full flex items-center justify-center gap-2 font-bold text-white bg-[#C35E33] hover:bg-[#a84d28] rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0"
          style={{
            height:     '52px',
            fontSize:   '15px',
            letterSpacing: '0.2px',
            boxShadow:  '0 6px 22px rgba(195,94,51,0.38)',
          }}
        >
          {loading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white flex-shrink-0"
                style={{ animation: 'spinBtn 0.65s linear infinite' }}
              />
              Signing in…
            </>
          ) : 'Sign in'}
        </button>

      </form>

      {/* Forgot password */}
      <div className="flex justify-end mt-4">
        <Link
          to={ROUTES.FORGOT_PASSWORD}
          className="text-gray-500 hover:text-[#C35E33] transition-colors font-medium"
          style={{ fontSize: '13px' }}
        >
          Forgot Password ?
        </Link>
      </div>
    </AuthPageLayout>
  )
}