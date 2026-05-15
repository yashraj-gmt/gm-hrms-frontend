import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ChevronDown, ArrowLeft, UserCheck, Calendar, Clock, Loader2 } from 'lucide-react'
import { useToast } from '@/components/shared/toast/ToastProvider'
import shiftService from '@/services/shiftService'
 
const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'
 
function Avatar({ name, size = 32 }) {
  const initials = (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('')
  return (
    <div className="rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: PRIMARY, fontSize: 10 }}>
      {initials}
    </div>
  )
}
 
function EmployeeChip({ emp, onRemove }) {
  return (
    <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-xs font-medium border"
      style={{ borderColor: PRIMARY, backgroundColor: '#FDE8DD', color: PRIMARY }}>
      <Avatar name={emp.fullName} size={20} />
      <span>{emp.fullName}</span>
      <button onClick={() => onRemove(emp.personalInformationId)} className="ml-0.5 hover:opacity-70">
        <X size={11} strokeWidth={2.5} />
      </button>
    </div>
  )
}
 
export default function AssignShift() {
  const navigate = useNavigate()
  const { toast } = useToast()
 
  const [persons,       setPersons]       = useState([])
  const [shifts,        setShifts]        = useState([])
  const [loadingData,   setLoadingData]   = useState(true)
  const [empSearch,     setEmpSearch]     = useState('')
  const [selectedEmps,  setSelectedEmps]  = useState([])
  const [selectedShift, setSelectedShift] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [endDate,       setEndDate]       = useState('')
  const [note,          setNote]          = useState('')
  const [empDropOpen,   setEmpDropOpen]   = useState(false)
  const [shiftDropOpen, setShiftDropOpen] = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [success,       setSuccess]       = useState(false)
 
  // Load persons & shifts on mount
  useEffect(() => {
    Promise.all([
      shiftService.searchEligiblePersons(''),
      shiftService.getAll(0, 100),
    ])
      .then(([personsRes, shiftsRes]) => {
        setPersons(personsRes.data ?? [])
        setShifts(shiftsRes.data?.content ?? [])
      })
      .catch(err => toast.error(err?.message || 'Failed to load data', 'Error'))
      .finally(() => setLoadingData(false))
  }, [])
 
  // Search persons with debounce
  useEffect(() => {
    if (!empSearch) return
    const t = setTimeout(() => {
      shiftService.searchEligiblePersons(empSearch)
        .then(res => setPersons(res.data ?? []))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [empSearch])
 
  const filteredPersons = useMemo(() =>
    persons.filter(p => !selectedEmps.find(s => s.personalInformationId === p.personalInformationId)),
    [persons, selectedEmps]
  )
 
  const addPerson    = p  => { setSelectedEmps(prev => [...prev, p]); setEmpDropOpen(false); setEmpSearch('') }
  const removePerson = id => setSelectedEmps(prev => prev.filter(p => p.personalInformationId !== id))
  const chosenShift  = shifts.find(s => s.id === Number(selectedShift))
  const canSubmit    = selectedEmps.length > 0 && selectedShift && effectiveDate
 
  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await shiftService.assign({
        personalInformationIds: selectedEmps.map(e => e.personalInformationId),
        shiftId: Number(selectedShift),
        effectiveFrom: effectiveDate,
        effectiveTo: endDate || null,
        note: note || null,
      })
      toast.success(
        `${selectedEmps.length} employee(s) assigned to ${chosenShift?.shiftName}`,
        'Shift Assigned'
      )
      setSuccess(true)
      setTimeout(() => navigate('/shifts'), 1800)
    } catch (err) {
      toast.error(err?.message || 'Failed to assign shift', 'Error')
    } finally {
      setSubmitting(false)
    }
  }
 
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 size={28} color={PRIMARY} className="animate-spin" />
      </div>
    )
  }
 
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
          <UserCheck size={28} color="#15803D" />
        </div>
        <p className="text-lg font-bold text-gray-900">Shift Assigned Successfully!</p>
        <p className="text-sm text-gray-500">{selectedEmps.length} employee(s) assigned to {chosenShift?.shiftName}</p>
      </div>
    )
  }
 
  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/shifts')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Assign Shift</h1>
          <p className="text-xs text-gray-400 mt-0.5">Map employees to a shift schedule</p>
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
 
          {/* Employee selector */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Select Employees <span style={{ color: PRIMARY }}>*</span>
            </label>
            {selectedEmps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 p-2.5 rounded-xl border border-dashed" style={{ borderColor: PRIMARY }}>
                {selectedEmps.map(emp => (
                  <EmployeeChip key={emp.personalInformationId} emp={emp} onRemove={removePerson} />
                ))}
              </div>
            )}
            <div className="relative">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 h-11 transition-colors"
                style={{ borderColor: empDropOpen ? PRIMARY : '#E5E7EB' }}>
                <Search size={14} color="#9CA3AF" />
                <input type="text" value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setEmpDropOpen(true) }}
                  onFocus={() => setEmpDropOpen(true)}
                  placeholder="Search by name or code…"
                  className="flex-1 border-none outline-none text-sm text-gray-900 bg-transparent placeholder:text-gray-400" />
              </div>
              {empDropOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setEmpDropOpen(false)} />
                  <div className="absolute top-12 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {filteredPersons.length === 0
                      ? <p className="px-4 py-6 text-sm text-gray-400 text-center">No results</p>
                      : filteredPersons.map(p => (
                        <button key={p.personalInformationId} onClick={() => addPerson(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left border-b border-gray-50 last:border-0">
                          <Avatar name={p.fullName} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{p.fullName}</p>
                            <p className="text-[10px] text-gray-400">{p.code} · {p.employmentType}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] text-gray-400">Current</p>
                            <p className="text-[10px] font-medium" style={{ color: PRIMARY }}>{p.currentShift}</p>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          </div>
 
          {/* Shift selector */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Select Shift <span style={{ color: PRIMARY }}>*</span>
            </label>
            <div className="relative">
              <button onClick={() => setShiftDropOpen(!shiftDropOpen)}
                className="w-full flex items-center justify-between px-4 h-11 bg-white border border-gray-200 rounded-xl text-sm transition-colors"
                style={{ borderColor: shiftDropOpen ? PRIMARY : '#E5E7EB' }}>
                {chosenShift
                  ? <span className="text-gray-800 font-medium">{chosenShift.shiftName}</span>
                  : <span className="text-gray-400">Select a shift…</span>
                }
                <ChevronDown size={14} color="#9CA3AF" />
              </button>
              {shiftDropOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShiftDropOpen(false)} />
                  <div className="absolute top-12 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {shifts.filter(s => s.isActive).map(s => {
                      const timingLabel = s.normalTiming
                        ? `${s.normalTiming.startTime} – ${s.normalTiming.endTime}`
                        : 'Day-wise Config'
                      return (
                        <button key={s.id} onClick={() => { setSelectedShift(String(s.id)); setShiftDropOpen(false) }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FDE8DD' }}>
                              <Clock size={14} color={PRIMARY} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-gray-900">{s.shiftName}</p>
                              <p className="text-[10px] text-gray-400">{timingLabel}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                            style={{ backgroundColor: s.shiftType === 'NORMAL' ? PRIMARY : '#111827' }}>
                            {s.shiftType}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
 
          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Effective Date <span style={{ color: PRIMARY }}>*</span>
              </label>
              <div className="relative">
                <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full h-11 px-4 pr-10 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl outline-none transition-colors"
                  onFocus={e => (e.target.style.borderColor = PRIMARY)}
                  onBlur={e  => (e.target.style.borderColor = '#E5E7EB')} />
                <Calendar size={14} color="#9CA3AF" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                End Date <span className="text-gray-400 text-[11px] font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input type="date" value={endDate} min={effectiveDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full h-11 px-4 pr-10 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl outline-none transition-colors"
                  onFocus={e => (e.target.style.borderColor = PRIMARY)}
                  onBlur={e  => (e.target.style.borderColor = '#E5E7EB')} />
                <Calendar size={14} color="#9CA3AF" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
 
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Note <span className="text-gray-400 text-[11px] font-normal">(optional)</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this assignment…" rows={3}
              className="w-full px-4 py-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl outline-none resize-none placeholder:text-gray-400"
              onFocus={e => (e.target.style.borderColor = PRIMARY)}
              onBlur={e  => (e.target.style.borderColor = '#E5E7EB')} />
          </div>
        </div>
 
        {/* Summary panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 sticky top-4">
          <p className="text-sm font-bold text-gray-900">Assignment Summary</p>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#FDE8DD' }}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Selected Shift</p>
            {chosenShift ? (
              <>
                <p className="text-base font-bold" style={{ color: PRIMARY }}>{chosenShift.shiftName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{chosenShift.shiftType}</p>
              </>
            ) : <p className="text-sm text-gray-400">No shift selected</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Employees ({selectedEmps.length})</p>
            {selectedEmps.length === 0
              ? <p className="text-xs text-gray-400">No employees selected</p>
              : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {selectedEmps.map(emp => (
                    <div key={emp.personalInformationId} className="flex items-center gap-2.5">
                      <Avatar name={emp.fullName} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{emp.fullName}</p>
                        <p className="text-[10px] text-gray-400">{emp.code}</p>
                      </div>
                      <button onClick={() => removePerson(emp.personalInformationId)} className="ml-auto text-gray-300 hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
          {effectiveDate && (
            <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Effective From</p>
              <p className="text-sm font-semibold text-gray-800">{effectiveDate}</p>
              {endDate && <p className="text-xs text-gray-400">Until {endDate}</p>}
            </div>
          )}
          <div className="h-px bg-gray-100" />
          <div className="space-y-2">
            <button onClick={handleSubmit} disabled={!canSubmit || submitting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={e => { if (canSubmit && !submitting) e.currentTarget.style.backgroundColor = PRIMARY_DARK }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = PRIMARY}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Assign Shift
            </button>
            <button onClick={() => navigate('/shifts')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}