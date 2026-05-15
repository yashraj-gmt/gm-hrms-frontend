// src/components/shared/SearchableSelect.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react'

const PRIMARY = '#C35E33'

/**
 * Portal-based searchable select dropdown.
 *
 * Props:
 *   value       – currently selected display label (string)
 *   onChange    – (item) => void  — called with the full option object
 *   options     – [{ id, name, ... }]
 *   labelKey    – key used for display text          (default: 'name')
 *   valueKey    – key stored as `value`              (default: 'name')
 *   placeholder – hint text when nothing is selected (default: 'Select…')
 *   error       – error message string
 *   loading     – show spinner while fetching
 *   disabled    – disables interaction
 */
export default function SearchableSelect({
  value        = '',
  onChange,
  options      = [],
  labelKey     = 'name',
  valueKey     = 'name',
  placeholder  = 'Select…',
  error,
  loading      = false,
  disabled     = false,
}) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef   = useRef(null)
  const inputRef = useRef(null)
  const menuRef  = useRef(null)

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filtered = options.filter(opt =>
    String(opt[labelKey] ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const selectedLabel = options.find(o => String(o[valueKey]) === String(value))?.[labelKey]
    ?? value
    ?? ''

  // ── Close on outside click / scroll ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onDown   = (e) => {
      if (
        menuRef.current  && !menuRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  // ── Auto-focus search when opened ─────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  // ── Toggle ────────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    if (disabled || loading) return
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width })
      setQuery('')
    }
    setOpen(v => !v)
  }, [disabled, loading, open])

  const handleSelect = useCallback((opt) => {
    onChange?.(opt)
    setOpen(false)
    setQuery('')
  }, [onChange])

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        ref={btnRef}
        onClick={handleToggle}
        disabled={disabled}
        className={[
          'w-full h-9 px-3 text-sm flex items-center justify-between gap-2',
          'bg-gray-50 border rounded-lg outline-none transition-colors',
          error    ? 'border-red-400'
          : open   ? 'border-[#C35E33] bg-white'
                   : 'border-gray-200 hover:border-gray-300',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className={`truncate text-left ${selectedLabel ? 'text-gray-700' : 'text-gray-400'}`}>
          {loading ? 'Loading…' : (selectedLabel || placeholder)}
        </span>
        {loading
          ? <Loader2 size={14} className="text-gray-400 animate-spin flex-shrink-0" />
          : <ChevronDown
              size={14}
              className="text-gray-400 flex-shrink-0 transition-transform duration-150"
              style={{ transform: open ? 'rotate(180deg)' : 'none' }}
            />
        }
      </button>

      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}

      {/* Portal dropdown */}
      {open && createPortal(
        <div
          ref={menuRef}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:  'fixed',
            top:       menuPos.top,
            left:      menuPos.left,
            width:     Math.max(menuPos.width, 200),
            zIndex:    9999,
            maxHeight: 300,
          }}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
        >
          {/* Search bar */}
          <div className="p-2 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 h-8">
              <Search size={12} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Option list */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-5">No results found</p>
            ) : (
              filtered.map(opt => {
                const key     = opt.id ?? opt[valueKey]
                const label   = opt[labelKey]
                const isActive = String(opt[valueKey]) === String(value)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={[
                      'w-full flex items-center justify-between px-3 py-2.5 text-xs text-left',
                      'transition-colors',
                      isActive ? 'bg-orange-50' : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className={isActive ? 'font-semibold' : 'text-gray-700'} style={{ color: isActive ? PRIMARY : undefined }}>
                      {label}
                    </span>
                    {isActive && <Check size={12} color={PRIMARY} className="flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}