// src/components/shared/DateFilter.jsx
import { useState, useRef, useEffect } from 'react'
import { Filter, ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']

const PRESETS = [
  { label: 'Today',        days: 0  },
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'This month',   days: -1 },
  { label: 'Last 3 months',days: 90 },
  { label: 'Custom range', days: -2 },
]

function isSameDay(a, b) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()   
  )
}

function isBetween(date, start, end) {
  if (!start || !end) return false
  const d = date.getTime()
  return d > start.getTime() && d < end.getTime()
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function startDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function formatDate(date) {
  if (!date) return ''
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function applyPreset(days) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (days === 0) return { start: today, end: today }
  if (days === -1) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { start, end: today }
  }
  if (days === -2) return { start: null, end: null }
  const start = new Date(today)
  start.setDate(today.getDate() - days)
  return { start, end: today }
}

// ─── Mini Calendar
function MiniCalendar({ value, hovered, onSelect, onHover, rangeStart, selecting }) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(value?.getFullYear()  ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(value?.getMonth()     ?? today.getMonth())

  const totalDays  = daysInMonth(viewYear, viewMonth)
  const startDay   = startDayOfMonth(viewYear, viewMonth)
  const cells      = Array.from({ length: startDay + totalDays }, (_, i) =>
    i < startDay ? null : new Date(viewYear, viewMonth, i - startDay + 1)
  )

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const rangeEnd = selecting ? hovered : null

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(195,94,51,0.1)] transition-colors border-0 bg-transparent cursor-pointer"
        >
          <ChevronLeft size={15} color="#6B7280" />
        </button>
        <span className="text-[13px] font-semibold text-[#111827]">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(195,94,51,0.1)] transition-colors border-0 bg-transparent cursor-pointer"
        >
          <ChevronRight size={15} color="#6B7280" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[#9CA3AF] py-0.5">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />

          const isSelected  = isSameDay(date, value)
          const isRangeStart= isSameDay(date, rangeStart)
          const isRangeEnd  = isSameDay(date, rangeEnd)
          const inRange     = rangeStart && rangeEnd
            ? isBetween(date, rangeStart, rangeEnd)
            : false
          const isToday     = isSameDay(date, today)

          let cellClass = 'relative flex items-center justify-center h-7 text-[11px] cursor-pointer rounded-md transition-colors '
          let textClass = ''

          if (isSelected || isRangeStart || isRangeEnd) {
            cellClass += 'text-white'
            textClass  = 'bg-primary rounded-md z-10 w-7 h-7 flex items-center justify-center'
          } else if (inRange) {
            cellClass += 'bg-[rgba(195,94,51,0.12)] text-[#111827] rounded-none'
          } else if (isToday) {
            cellClass += 'font-bold text-primary'
          } else {
            cellClass += 'text-[#374151] hover:bg-[rgba(195,94,51,0.08)]'
          }

          return (
            <div
              key={idx}
              className={cellClass}
              onClick={() => onSelect(date)}
              onMouseEnter={() => onHover(date)}
            >
              <span className={textClass}>{date.getDate()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main DateFilter Component
export default function DateFilter({ onChange }) {
  const [open,         setOpen]         = useState(false)
  const [activePreset, setActivePreset] = useState(null)
  const [startDate,    setStartDate]    = useState(null)
  const [endDate,      setEndDate]      = useState(null)
  const [hoveredDate,  setHoveredDate]  = useState(null)
  const [selecting,    setSelecting]    = useState('start') // 'start' | 'end'

  const wrapperRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handlePreset(preset) {
    setActivePreset(preset.label)
    if (preset.days === -2) {
      // Custom range — let user pick manually
      setStartDate(null)
      setEndDate(null)
      setSelecting('start')
      return
    }
    const { start, end } = applyPreset(preset.days)
    setStartDate(start)
    setEndDate(end)
    setSelecting('start')
    onChange?.({ start, end, label: preset.label })
  }

  function handleCalendarSelect(date) {
    if (selecting === 'start') {
      setStartDate(date)
      setEndDate(null)
      setSelecting('end')
    } else {
      if (date < startDate) {
        // swap
        setEndDate(startDate)
        setStartDate(date)
      } else {
        setEndDate(date)
      }
      setSelecting('start')
    }
  }

  function handleApply() {
    if (startDate) {
      onChange?.({ start: startDate, end: endDate ?? startDate, label: 'Custom' })
    }
    setOpen(false)
  }

  function handleClear() {
    setStartDate(null)
    setEndDate(null)
    setActivePreset(null)
    setSelecting('start')
    onChange?.({ start: null, end: null, label: null })
  }

  const hasSelection = startDate || endDate

  // Label shown in button
  const btnLabel = activePreset && activePreset !== 'Custom range'
    ? activePreset
    : startDate
      ? `${formatDate(startDate)}${endDate && !isSameDay(startDate, endDate) ? ' – ' + formatDate(endDate) : ''}`
      : 'Date filter'

  const isCompact = btnLabel.length > 14

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-white text-[11px] px-2.5 py-[5px] rounded-md border-0 cursor-pointer transition-colors duration-150 whitespace-nowrap"
        style={{ backgroundColor: open ? PRIMARY_DARK : PRIMARY }}
      >
        <Filter size={10} strokeWidth={2.5} />
        <span className={isCompact ? 'max-w-[110px] truncate' : ''}>{btnLabel}</span>
        {hasSelection && (
          <span
            className="ml-0.5 flex items-center"
            onClick={(e) => { e.stopPropagation(); handleClear() }}
          >
            <X size={10} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl border border-[#E8E8E8] shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden"
          style={{ width: 540, minWidth: 320 }}
        >
          <div className="flex">
            {/* ── Presets sidebar ── */}
            <div className="w-[145px] shrink-0 border-r border-[#F3F4F6] p-3 flex flex-col gap-0.5 bg-[#FAFAFA]">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1.5 px-1">
                Quick select
              </p>
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className="text-left text-[12px] px-3 py-1.5 rounded-lg cursor-pointer border-0 transition-colors font-medium"
                  style={{
                    backgroundColor: activePreset === preset.label
                      ? 'rgba(195,94,51,0.10)'
                      : 'transparent',
                    color: activePreset === preset.label ? PRIMARY : '#374151',
                  }}
                  onMouseEnter={e => {
                    if (activePreset !== preset.label)
                      e.currentTarget.style.backgroundColor = 'rgba(195,94,51,0.05)'
                  }}
                  onMouseLeave={e => {
                    if (activePreset !== preset.label)
                      e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* ── Calendar area ── */}
            <div className="flex-1 p-4 flex flex-col">
              {/* Selected range display */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px]"
                  style={{
                    borderColor: selecting === 'start' ? PRIMARY : '#E8E8E8',
                    backgroundColor: selecting === 'start' ? 'rgba(195,94,51,0.04)' : '#FAFAFA',
                  }}
                >
                  <CalendarDays size={13} color="#9CA3AF" />
                  <span className={startDate ? 'text-[#111827]' : 'text-[#9CA3AF]'}>
                    {startDate ? formatDate(startDate) : 'Start date'}
                  </span>
                </div>
                <span className="text-[#9CA3AF] text-[11px]">→</span>
                <div
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px]"
                  style={{
                    borderColor: selecting === 'end' ? PRIMARY : '#E8E8E8',
                    backgroundColor: selecting === 'end' ? 'rgba(195,94,51,0.04)' : '#FAFAFA',
                  }}
                >
                  <CalendarDays size={13} color="#9CA3AF" />
                  <span className={endDate ? 'text-[#111827]' : 'text-[#9CA3AF]'}>
                    {endDate ? formatDate(endDate) : 'End date'}
                  </span>
                </div>
              </div>

              {/* Calendar grid */}
              <div className="flex gap-4">
                {/* Left calendar — start month */}
                <div className="flex-1">
                  <MiniCalendar
                    value={startDate}
                    hovered={hoveredDate}
                    onSelect={handleCalendarSelect}
                    onHover={setHoveredDate}
                    rangeStart={startDate}
                    selecting={selecting === 'end'}
                  />
                </div>

                <div className="w-px bg-[#F3F4F6] mx-0.5" />

                {/* Right calendar — next month or end month */}
                <div className="flex-1">
                  <MiniCalendar
                    value={endDate}
                    hovered={hoveredDate}
                    onSelect={handleCalendarSelect}
                    onHover={setHoveredDate}
                    rangeStart={startDate}
                    selecting={selecting === 'end'}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F3F4F6]">
                <button
                  onClick={handleClear}
                  className="text-[12px] text-[#6B7280] hover:text-[#374151] border-0 bg-transparent cursor-pointer px-2 py-1 rounded transition-colors"
                >
                  Clear
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="text-[12px] text-[#374151] border border-[#E8E8E8] bg-transparent hover:bg-[#F9FAFB] cursor-pointer px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!startDate}
                    className="text-[12px] text-white border-0 cursor-pointer px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: PRIMARY }}
                    onMouseEnter={e => startDate && (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}