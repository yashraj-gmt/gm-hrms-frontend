// src/components/auth/AuthInput.jsx
import { useState } from 'react'

const EyeIcon = ({ open }) => (
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
)

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

/**
 * AuthInput
 * ─────────────────────────────────────────────────────────────
 * Props
 *   label       – field label text
 *   type        – 'text' | 'email' | 'password'
 *   placeholder – placeholder text
 *   value       – controlled value
 *   onChange    – change handler
 *   error       – error message string (shows red state)
 *   autoFocus   – boolean
 */
export default function AuthInput({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  autoFocus = false,
  id,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)

  const inputId     = id || label?.toLowerCase().replace(/\s+/g, '-')
  const inputType   = type === 'password' ? (showPassword ? 'text' : 'password') : type
  const isPassword  = type === 'password'
  const isEmail     = type === 'email'

  const borderColor = error
    ? '#DC2626'
    : focused
    ? '#C35E33'
    : '#E8C9B8'

  return (
    <div className="mb-5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[13px] font-semibold text-gray-800 mb-1.5"
        >
          {label}
        </label>
      )}

      <div
        className="flex items-center rounded-xl px-4 h-[52px] transition-all duration-200"
        style={{
          border: `1.5px solid ${borderColor}`,
          backgroundColor: '#FDF8F5',
          boxShadow: focused ? `0 0 0 3px rgba(195,94,51,0.10)` : 'none',
        }}
      >
        <input
          id={inputId}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder-gray-400 font-medium"
          {...rest}
        />

        {/* Right icon */}
        <span
          className="ml-2 flex-shrink-0 transition-colors duration-150"
          style={{ color: focused ? '#C35E33' : '#B0A9A4' }}
        >
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="outline-none cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          ) : isEmail ? (
            <MailIcon />
          ) : null}
        </span>
      </div>

      {error && (
        <p className="mt-1.5 text-[12px] text-red-600 font-medium">{error}</p>
      )}
    </div>
  )
}