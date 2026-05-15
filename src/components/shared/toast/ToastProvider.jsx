// src/components/shared/toast/ToastProvider.jsx
// ─── Zero-dependency toast system ────────────────────────────────────────────
// Usage anywhere in the app:
//   const { toast } = useToast()
//   toast.success('Saved!')
//   toast.error('Something went wrong.')
//   toast.warning('Check your inputs.')
//   toast.info('New update available.')
//   toast.custom({ title: 'Done', message: 'Employee added.', type: 'success', duration: 5000 })

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'

// ─── Theme ────────────────────────────────────────────────────────────────────
const TYPES = {
  success: {
    accent:  '#22C55E',
    bg:      '#0D1F14',
    icon:    CheckCircle2,
    label:   'Success',
  },
  error: {
    accent:  '#EF4444',
    bg:      '#1F0D0D',
    icon:    XCircle,
    label:   'Error',
  },
  warning: {
    accent:  '#F59E0B',
    bg:      '#1F1A0D',
    icon:    AlertTriangle,
    label:   'Warning',
  },
  info: {
    accent:  '#C35E33',
    bg:      '#1A1209',
    icon:    Info,
    label:   'Info',
  },
}

// ─── Inject keyframes once ────────────────────────────────────────────────────
const STYLE_ID = 'hrms-toast-styles'
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes hrms-slide-in {
      from { opacity: 0; transform: translateX(110%); }
      to   { opacity: 1; transform: translateX(0);    }
    }
    @keyframes hrms-slide-out {
      from { opacity: 1; transform: translateX(0);    max-height: 120px; margin-bottom: 10px; }
      to   { opacity: 0; transform: translateX(110%); max-height: 0;     margin-bottom: 0;   }
    }
    @keyframes hrms-progress {
      from { width: 100%; }
      to   { width: 0%;   }
    }
    .hrms-toast-enter  { animation: hrms-slide-in  0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .hrms-toast-exit   { animation: hrms-slide-out 0.3s  ease-in                         forwards; }
    .hrms-progress-bar { animation: hrms-progress linear forwards; }
  `
  document.head.appendChild(style)
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null)

let _toastId = 0

// ─── Single Toast Item ────────────────────────────────────────────────────────
function ToastItem({ id, type = 'info', title, message, duration = 4000, onRemove }) {
  const cfg       = TYPES[type] || TYPES.info
  const Icon      = cfg.icon
  const timerRef  = useRef(null)
  const [exiting, setExiting] = useState(false)
  const [paused,  setPaused]  = useState(false)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onRemove(id), 300)
  }, [id, onRemove])

  // Auto-dismiss
  useEffect(() => {
    timerRef.current = setTimeout(dismiss, duration)
    return () => clearTimeout(timerRef.current)
  }, [dismiss, duration])

  // Pause on hover
  const handleMouseEnter = () => {
    setPaused(true)
    clearTimeout(timerRef.current)
  }
  const handleMouseLeave = () => {
    setPaused(false)
    timerRef.current = setTimeout(dismiss, 800) // short grace after re-hover
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={exiting ? 'hrms-toast-exit' : 'hrms-toast-enter'}
      style={{
        position:      'relative',
        display:       'flex',
        flexDirection: 'column',
        width:         360,
        maxWidth:      'calc(100vw - 32px)',
        borderRadius:  14,
        overflow:      'hidden',
        backgroundColor: cfg.bg,
        border:        `1px solid ${cfg.accent}28`,
        boxShadow:     `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px ${cfg.accent}14`,
        marginBottom:  10,
        cursor:        'default',
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position:        'absolute',
          left:            0,
          top:             0,
          bottom:          0,
          width:           4,
          backgroundColor: cfg.accent,
          borderRadius:    '14px 0 0 14px',
        }}
      />

      {/* Body */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px 14px 18px' }}>
        {/* Icon */}
        <div
          style={{
            flexShrink:      0,
            width:           32,
            height:          32,
            borderRadius:    8,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            backgroundColor: `${cfg.accent}18`,
          }}
        >
          <Icon size={17} color={cfg.accent} strokeWidth={2.2} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F9FAFB', lineHeight: 1.3 }}>
            {title || cfg.label}
          </p>
          {message && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
              {message}
            </p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          style={{
            flexShrink:      0,
            width:           24,
            height:          24,
            borderRadius:    6,
            border:          'none',
            backgroundColor: 'transparent',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            cursor:          'pointer',
            color:           '#6B7280',
            transition:      'color 0.15s, background-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F9FAFB'; e.currentTarget.style.backgroundColor = '#374151' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Progress bar */}
      {!paused && (
        <div style={{ height: 3, backgroundColor: `${cfg.accent}22`, position: 'relative' }}>
          <div
            className="hrms-progress-bar"
            style={{
              position:        'absolute',
              left:            0,
              top:             0,
              height:          '100%',
              backgroundColor: cfg.accent,
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
      {paused && (
        <div style={{ height: 3, backgroundColor: `${cfg.accent}22` }}>
          <div style={{ height: '100%', width: '60%', backgroundColor: `${cfg.accent}55` }} />
        </div>
      )}
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  injectStyles()
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++_toastId
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }])
    return id
  }, [])

  // Convenience methods exposed via context
  const toast = {
    success: (msg, title)  => addToast({ type: 'success', message: msg, title }),
    error:   (msg, title)  => addToast({ type: 'error',   message: msg, title }),
    warning: (msg, title)  => addToast({ type: 'warning', message: msg, title }),
    info:    (msg, title)  => addToast({ type: 'info',    message: msg, title }),
    custom:  (opts)        => addToast(opts),
    dismiss: removeToast,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* ── Toast Viewport ─────────────────────────────────────── */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position:  'fixed',
          bottom:    24,
          right:     24,
          zIndex:    9999,
          display:   'flex',
          flexDirection: 'column-reverse',
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem {...t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}