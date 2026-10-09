// src/pages/masterdata/branch/BranchModal.jsx
import { useEffect, useRef, useState } from 'react'
import { X, Building, ChevronDown } from 'lucide-react'

const PRIMARY   = '#C35E33'
const COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Australia', 'UAE']

// ─── Input sanitisation helpers ──────────────────────────────────────────────
/**
 * Allow only digits (0-9).
 */
const numericOnly = (v) => v.replace(/\D/g, '')

/**
 * Allow only alphabetic characters and spaces.
 */
const alphaOnly = (v) => v.replace(/[^a-zA-Z\s]/g, '')

/**
 * Branch Name / Code – allow letters, digits, spaces and hyphens.
 * Restricts all other special characters.
 */
const alphaNumHyphen = (v) => v.replace(/[^a-zA-Z0-9\s\-]/g, '')

/**
 * State – same as alphaOnly but kept separate so the label can be different.
 */
const alphaOnlyState = (v) => v.replace(/[^a-zA-Z\s]/g, '')

// ─── Field must live OUTSIDE BranchModal so React never remounts it ───────────
// Defining it inside the function body causes a new component type on every
// render, which makes React unmount → remount the <input>, stealing focus after
// the first keystroke.
function Field({
  label,
  fieldKey,
  placeholder,
  required,
  form,
  onSetField,
  errors,
  loading,
  sanitize,        // optional (v: string) => string
  inputMode,       // optional html inputMode attr
  maxLength,       // optional
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span style={{ color: PRIMARY }}> *</span>}
      </label>
      <input
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        value={form[fieldKey] ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          const val = sanitize ? sanitize(raw) : raw
          onSetField(fieldKey, val)
        }}
        placeholder={placeholder}
        disabled={loading}
        className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
        style={{ borderColor: errors[fieldKey] ? '#EF4444' : '#E5E7EB' }}
        onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
        onBlur={(e)  => { e.target.style.borderColor = errors[fieldKey] ? '#EF4444' : '#E5E7EB' }}
      />
      {errors[fieldKey] && (
        <p className="text-[11px] text-red-500 mt-0.5">⚠ {errors[fieldKey]}</p>
      )}
    </div>
  )
}

// ─── Country ComboBox – dropdown list + free-text fallback ────────────────────
// NOTE: The dropdown is rendered via a fixed-position portal so it escapes the
// modal's overflow:hidden / overflow-y-auto scroll container and never causes
// the modal body to grow or show an unwanted scrollbar.
function CountryComboBox({ value, onChange, disabled }) {
  const [open,     setOpen]     = useState(false)
  // isTyping tracks whether the user is actively typing; when false (just
  // opened via chevron / focus) we show ALL countries unfiltered.
  const [isTyping, setIsTyping] = useState(false)
  const [inputVal, setInputVal] = useState(value || '')
  const wrapRef    = useRef(null)
  const [dropPos,  setDropPos]  = useState({ top: 0, left: 0, width: 0 })

  // Keep local input in sync when parent resets / switches edit↔add
  useEffect(() => { setInputVal(value || '') }, [value])

  // Recalculate dropdown position whenever it opens
  useEffect(() => {
    if (open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
  }, [open])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setIsTyping(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Show all countries when not typing; filter only while the user types
  const displayList = isTyping
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(inputVal.toLowerCase()))
    : COUNTRIES

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '')
    setInputVal(val)
    onChange(val)
    setIsTyping(true)
    setOpen(true)
  }

  const handleFocus = () => {
    setIsTyping(false)   // opening fresh – show full list
    setOpen(true)
  }

  const handleChevronClick = () => {
    setIsTyping(false)   // always show full list via chevron
    setOpen((p) => !p)
  }

  const handleSelect = (country) => {
    setInputVal(country)
    onChange(country)
    setIsTyping(false)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Country</label>

      {/* Text input with dropdown toggle */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Select or type country"
          disabled={disabled}
          className="w-full h-10 px-3.5 pr-8 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
          onFocusCapture={(e) => { e.target.style.borderColor = PRIMARY }}
          onBlur={(e) => { e.target.style.borderColor = '#E5E7EB' }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={handleChevronClick}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronDown
            size={15}
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>
      </div>

      {/* Dropdown – rendered at fixed position to escape modal overflow */}
      {open && displayList.length > 0 && (
        <ul
          style={{
            position: 'fixed',
            zIndex: 9999,
            top:   dropPos.top,
            left:  dropPos.left,
            width: dropPos.width,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: 200,
            overflowY: 'auto',
            padding: '4px 0',
            margin: 0,
            listStyle: 'none',
          }}
        >
          {displayList.map((c) => (
            <li
              key={c}
              onMouseDown={() => handleSelect(c)}
              style={{
                padding: '9px 14px',
                fontSize: 13,
                cursor: 'pointer',
                color: c === value ? PRIMARY : '#374151',
                fontWeight: c === value ? 600 : 400,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF3EE' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Branch Modal (Add / Edit) ────────────────────────────────────────────────
export default function BranchModal({ mode, initial, onClose, onSave, loading = false }) {
  const overlayRef = useRef(null)
  const isEdit     = mode === 'edit'

  const blank = {
    name:     '',
    code:     '',
    address:  '',
    landmark: '',
    city:     '',
    district: '',
    state:    '',
    pincode:  '',
    country:  'India',
    active:   true,
  }

  // ── Initialise form ─ map ALL address sub-fields defensively ──────────────
  const [form, setForm]     = useState(() =>
    initial
      ? {
          name:     initial.name     ?? '',
          code:     initial.code     ?? '',
          address:  initial.address  ?? '',
          landmark: initial.landmark ?? '',
          city:     initial.city     ?? '',
          district: initial.district ?? '',
          state:    initial.state    ?? '',
          pincode:  initial.pincode  ?? '',
          country:  initial.country  || 'India',
          active:   initial.active   ?? true,
        }
      : blank
  )
  const [errors, setErrors] = useState({})

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, loading])

  // When switching from add→edit (unlikely but safe)
  useEffect(() => {
    if (initial) {
      setForm({
        name:     initial.name     ?? '',
        code:     initial.code     ?? '',
        address:  initial.address  ?? '',
        landmark: initial.landmark ?? '',
        city:     initial.city     ?? '',
        district: initial.district ?? '',
        state:    initial.state    ?? '',
        pincode:  initial.pincode  ?? '',
        country:  initial.country  || 'India',
        active:   initial.active   ?? true,
      })
    }
  }, [initial])

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}

    // Required fields
    if (!form.name.trim())    e.name    = 'Branch name is required'
    if (!form.code.trim())    e.code    = 'Branch code is required'
    if (!form.city.trim())    e.city    = 'City is required'

    // Format checks
    if (form.pincode && !/^\d+$/.test(form.pincode))
      e.pincode = 'Pincode must contain digits only'

    if (form.pincode && (form.pincode.length < 4 || form.pincode.length > 10))
      e.pincode = 'Pincode must be between 4 and 10 digits'

    if (form.city && !/^[a-zA-Z\s]+$/.test(form.city.trim()))
      e.city = 'City must contain letters only'

    if (form.district && !/^[a-zA-Z\s]+$/.test(form.district.trim()))
      e.district = 'District must contain letters only'

    if (form.state && !/^[a-zA-Z\s]+$/.test(form.state.trim()))
      e.state = 'State must contain letters only'

    if (form.country && !/^[a-zA-Z\s]+$/.test(form.country.trim()))
      e.country = 'Country must contain letters only'

    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form })
  }

  // Shared props for every <Field />
  const fieldProps = { form, onSetField: setField, errors, loading }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !loading) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 680, maxHeight: '92vh', margin: '0 16px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}
            >
              <Building size={16} color="#fff" />
            </div>
            <h2 className="text-white font-semibold text-sm">
              {isEdit ? 'Edit Branch' : 'Add Branch'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="border rounded-xl p-5" style={{ borderColor: PRIMARY }}>

            {/* Row 1 – name + code */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field
                label="Branch Name"
                fieldKey="name"
                placeholder="Enter Branch Name"
                required
                sanitize={alphaNumHyphen}
                {...fieldProps}
              />
              <Field
                label="Branch Code"
                fieldKey="code"
                placeholder="GMT001"
                required
                sanitize={alphaNumHyphen}
                {...fieldProps}
              />
            </div>

            {/* Row 2 – address + landmark */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder="Enter full address"
                  rows={3}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Landmark</label>
                <input
                  type="text"
                  value={form.landmark}
                  onChange={(e) => setField('landmark', e.target.value)}
                  placeholder="Near landmark"
                  disabled={loading}
                  className="w-full h-10 px-3.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-colors disabled:opacity-60"
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E5E7EB' }}
                />
              </div>
            </div>

            {/* Row 3 – city + district + state */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* City (required – uses Field component for validation display) */}
              <Field
                label="City"
                fieldKey="city"
                placeholder="City"
                required
                sanitize={alphaOnly}
                {...fieldProps}
              />
              <Field
                label="District"
                fieldKey="district"
                placeholder="District"
                sanitize={alphaOnly}
                {...fieldProps}
              />
              <Field
                label="State"
                fieldKey="state"
                placeholder="Gujarat"
                sanitize={alphaOnlyState}
                {...fieldProps}
              />
            </div>

            {/* Row 4 – pincode + country + status */}
            <div className="grid grid-cols-3 gap-4">
              <Field
                label="Pincode"
                fieldKey="pincode"
                placeholder="380054"
                sanitize={numericOnly}
                inputMode="numeric"
                maxLength={10}
                {...fieldProps}
              />

              {/* Country – ComboBox (select OR free-type) */}
              <div>
                <CountryComboBox
                  value={form.country}
                  onChange={(val) => setField('country', val)}
                  disabled={loading}
                />
                {errors.country && (
                  <p className="text-[11px] text-red-500 mt-0.5">⚠ {errors.country}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
                <div className="flex items-center gap-5 mt-1">
                  {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map(({ label, val }) => (
                    <label
                      key={label}
                      className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600"
                      onClick={() => !loading && setField('active', val)}
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{
                          borderColor:     form.active === val ? PRIMARY : '#D1D5DB',
                          backgroundColor: form.active === val ? PRIMARY : 'transparent',
                        }}
                      >
                        {form.active === val && <span className="w-2 h-2 rounded-full bg-white" />}
                      </span>
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#111827' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#111827')}
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isEdit ? 'Update Branch' : 'Save Branch'}
          </button>
        </div>
      </div>
    </div>
  )
}