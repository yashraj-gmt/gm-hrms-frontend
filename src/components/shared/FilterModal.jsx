// src/components/shared/FilterModal.jsx
// ─── Reusable Filter Modal — drop it anywhere in the project ─────────────────
// Usage:
//   import FilterModal from '@/components/shared/FilterModal'
//   <FilterModal
//     isOpen={showFilter}
//     onClose={() => setShowFilter(false)}
//     onApply={(filters) => { /* use filters */ }}
//     onReset={() => { /* clear */ }}
//     config={FILTER_CONFIG}   ← see shape below
//   />
//
// config shape:
//   [
//     { key: 'status',     label: 'Status',     type: 'multi',  options: ['Active','Inactive','Hold'] },
//     { key: 'type',       label: 'Type',        type: 'multi',  options: ['Employee','Internship','Training'] },
//     { key: 'dept',       label: 'Department',  type: 'select', options: ['IT-Based','HR','Finance'] },
//     { key: 'dateFrom',   label: 'Date From',   type: 'date'  },
//     { key: 'dateTo',     label: 'Date To',     type: 'date'  },
//     { key: 'search',     label: 'Search',      type: 'text',  placeholder: 'Name, email…' },
//   ]

import { useState, useEffect, useRef } from 'react'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer"
      style={{
        borderColor:     active ? PRIMARY : '#E5E7EB',
        backgroundColor: active ? PRIMARY : '#fff',
        color:           active ? '#fff'  : '#6B7280',
      }}
    >
      {label}
    </button>
  )
}

export default function FilterModal({ isOpen, onClose, onApply, onReset, config = [] }) {
  const overlayRef = useRef(null)

  // Build initial state from config
  const buildInitial = () => {
    const init = {}
    config.forEach(({ key, type }) => {
      init[key] = type === 'multi' ? [] : ''
    })
    return init
  }

  const [values, setValues] = useState(buildInitial)

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) setValues(buildInitial())
  }, [isOpen])

  // Close on overlay click
  const handleOverlay = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  const toggleChip = (key, val) => {
    setValues((prev) => {
      const arr = prev[key]
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
      }
    })
  }

  const handleApply = () => {
    onApply?.(values)
    onClose()
  }

  const handleReset = () => {
    setValues(buildInitial())
    onReset?.()
  }

  // Count active filters
  const activeCount = Object.values(values).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== ''
  ).length

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
    >
      {/* Panel — slides in from right */}
      <div
        className="relative flex flex-col h-full bg-white shadow-2xl"
        style={{ width: '100%', maxWidth: 360 }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="text-sm font-semibold text-white">Filters</span>
            {activeCount > 0 && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {config.map(({ key, label, type, options = [], placeholder }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">{label}</p>

              {/* Multi-chip */}
              {type === 'multi' && (
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={values[key].includes(opt)}
                      onClick={() => toggleChip(key, opt)}
                    />
                  ))}
                </div>
              )}

              {/* Select dropdown */}
              {type === 'select' && (
                <select
                  value={values[key]}
                  onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C35E33] appearance-none cursor-pointer"
                >
                  <option value="">All</option>
                  {options.map((o) => <option key={o}>{o}</option>)}
                </select>
              )}

              {/* Date */}
              {type === 'date' && (
                <input
                  type="date"
                  value={values[key]}
                  onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C35E33]"
                />
              )}

              {/* Text */}
              {type === 'text' && (
                <input
                  type="text"
                  placeholder={placeholder || `Filter by ${label}…`}
                  value={values[key]}
                  onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full h-9 px-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C35E33] placeholder:text-gray-400"
                />
              )}

              {/* Divider */}
              <div className="mt-4 h-px bg-gray-100" />
            </div>
          ))}
        </div>

        {/* ── Footer buttons ───────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}