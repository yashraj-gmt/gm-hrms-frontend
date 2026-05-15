

import { useEffect, useRef, useState } from 'react'
import { X, Trash2, AlertTriangle, Info } from 'lucide-react'

const VARIANTS = {
  danger: {
    iconBg:      '#FEE2E2',
    iconColor:   '#B91C1C',
    btnBg:       '#DC2626',
    btnHover:    '#B91C1C',
    Icon:        Trash2,
  },
  warning: {
    iconBg:      '#FEF9C3',
    iconColor:   '#854D0E',
    btnBg:       '#D97706',
    btnHover:    '#B45309',
    Icon:        AlertTriangle,
  },
  info: {
    iconBg:      '#DBEAFE',
    iconColor:   '#1E40AF',
    btnBg:       '#2563EB',
    btnHover:    '#1D4ED8',
    Icon:        Info,
  },
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title       = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  loading      = false,
}) {
  const overlayRef          = useRef(null)
  const [busy, setBusy]     = useState(false)
  const cfg                 = VARIANTS[variant] ?? VARIANTS.danger
  const { Icon }            = cfg
  const isLoading           = loading || busy

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape' && !isLoading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, isLoading, onClose])

  // Reset busy when modal closes
  useEffect(() => { if (!isOpen) setBusy(false) }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !isLoading) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full"
        style={{ maxWidth: 420, margin: '0 16px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: cfg.iconBg }}
            >
              <Icon size={14} color={cfg.iconColor} />
            </div>
            <h2 className="text-white font-semibold text-sm">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: cfg.iconBg }}
          >
          <Icon size={26} color={cfg.iconColor} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 mb-1">{title}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: cfg.btnBg }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = cfg.btnHover }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = cfg.btnBg }}
          >
            {isLoading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}