// src/pages/leave/tabs/LeaveEncashmentTab.jsx
import { useState, useMemo } from 'react'
import {
  Plus, Eye, Search, ChevronLeft, ChevronRight,
  RefreshCw, Edit2, Trash2, ChevronDown,
} from 'lucide-react'
import { useLeaveEncashment } from '@/hooks/leave/useLeaveEncashment'
import { useAuthStore }       from '@/store/authStore'
import { ROLES }              from '@/constants/roles'
import ConfirmModal            from '@/components/shared/ConfirmModal'
 
const PRIMARY = '#C35E33'
 
const SUB_TABS = [
  { key: 'requests', label: 'Encashment Requests' },
  { key: 'rules',    label: 'Encashment Rules'    },
]
 
const STATUS_MAP2 = {
  APPROVED: { label: 'Approved', bg: '#DCFCE7', color: '#15803D' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
  PENDING:  { label: 'Pending',  bg: '#F3F4F6', color: '#374151' },
}
 
const TIMING_OPTS = ['YEAR_END', 'RESIGNATION', 'BOTH']
const EMPTY_RULE  = { policyId: '', isEnabled: true, maxEncashment: '', timing: 'YEAR_END' }
 
function Toggle2({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: value ? PRIMARY : '#D1D5DB' }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: value ? '18px' : '2px' }} />
    </button>
  )
}
 
// ── Encashment Requests ────────────────────────────────────────────────────
function RequestsView({ requests, loading, saving, totalPages, totalElements, page, setPage, onAdd, refresh }) {
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employeeName: '', employeeId: '', dateRange: '', totalDays: '', reason: '' })
 
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return requests.filter((r) =>
      !q || r.name?.toLowerCase().includes(q) || r.employeeCode?.toLowerCase().includes(q),
    )
  }, [requests, search])
 
  const handleAdd = async () => {
    if (!form.employeeId || !form.dateRange || !form.totalDays) return
    const ok = await onAdd({ ...form, totalDays: Number(form.totalDays) })
    if (ok) { setShowForm(false); setForm({ employeeName: '', employeeId: '', dateRange: '', totalDays: '', reason: '' }) }
  }
 
  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text flex-1 max-w-xs">
          <Search size={13} color="#9CA3AF" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-full" />
        </label>
        <button onClick={refresh}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-[#C35E33] hover:border-[#C35E33] transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <button onClick={() => setShowForm(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}>
          <Plus size={14} /> New Request
        </button>
      </div>
 
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Employee ID', 'Employee Name', 'Date Range', 'Total Days', 'Applied On', 'Status', 'View'].map((h) => (
                  <th key={h} className="px-3.5 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            {loading ? (
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-3.5 py-4 border-b border-gray-50">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : filtered.length === 0 ? (
              <tbody><tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No encashment requests found.</td></tr></tbody>
            ) : (
              <tbody>
                {filtered.map((r, idx) => {
                  const s = STATUS_MAP2[r.status] ?? { label: r.status, bg: '#F3F4F6', color: '#374151' }
                  return (
                    <tr key={r.id} className="hover:bg-orange-50 transition-colors"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-3.5 py-4 text-[11px] font-bold border-b border-gray-50" style={{ color: PRIMARY }}>
                        {r.employeeCode ?? '—'}
                      </td>
                      <td className="px-3.5 py-4 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: PRIMARY }}>{(r.name ?? '?')[0]}</div>
                          <span className="text-[13px] font-semibold text-gray-900">{r.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">{r.dateRange ?? r.startDate}</td>
                      <td className="px-3.5 py-4 text-[12px] font-bold border-b border-gray-50" style={{ color: PRIMARY }}>{r.totalDays}</td>
                      <td className="px-3.5 py-4 text-[12px] text-gray-500 border-b border-gray-50 whitespace-nowrap">{r.appliedOn ?? r.createdAt}</td>
                      <td className="px-3.5 py-4 border-b border-gray-50">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>
                      </td>
                      <td className="px-3.5 py-4 border-b border-gray-50">
                        <button onClick={() => setDetail(r)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] hover:bg-orange-50 transition-all">
                          <Eye size={14} strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
            <p className="text-xs text-gray-500">
              Showing {page * 10 + 1}–{Math.min((page + 1) * 10, totalElements)} of {totalElements}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border"
                  style={{ borderColor: page === i ? PRIMARY : '#E5E7EB', backgroundColor: page === i ? PRIMARY : 'transparent', color: page === i ? '#fff' : '#6B7280' }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
 
      {/* Add Request Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 540, margin: '0 16px' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
              <h2 className="text-sm font-semibold text-white">Leave Encashment Request</h2>
              <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Employee Name', key: 'employeeName', placeholder: 'Full name' },
                  { label: 'Employee ID',   key: 'employeeId',   placeholder: 'e.g. EMP-001' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
                    <input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 placeholder:text-gray-300"
                      onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                      onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date Range <span style={{ color: PRIMARY }}>*</span></label>
                  <input type="date" value={form.dateRange} onChange={(e) => setForm((p) => ({ ...p, dateRange: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50"
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Total Days <span style={{ color: PRIMARY }}>*</span></label>
                  <input type="number" min="1" value={form.totalDays} onChange={(e) => setForm((p) => ({ ...p, totalDays: e.target.value }))}
                    placeholder="e.g. 5"
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 placeholder:text-gray-300"
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Reason for encashment..." rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 resize-none placeholder:text-gray-300"
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#111827' }}>
                {saving && <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Detail view (simple) */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 420, margin: '0 16px' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
              <h2 className="text-sm font-semibold text-white">Encashment Details</h2>
              <button onClick={() => setDetail(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                ['Employee', detail.name],
                ['Date Range', detail.dateRange ?? detail.startDate],
                ['Total Days', detail.totalDays],
                ['Applied On', detail.appliedOn ?? detail.createdAt],
                ['Status', detail.status],
                ['Reason', detail.reason],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{val ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
 
// ── Encashment Rules ───────────────────────────────────────────────────────
function RulesView({ rules, policies, loading, saving, deleting, isAdmin, onCreate, onUpdate, onDelete }) {
  const [modal,   setModal]   = useState(null) // { mode, data? }
  const [confirm, setConfirm] = useState(null)
  const [form,    setForm]    = useState(EMPTY_RULE)
  const [errors,  setErrors]  = useState({})
 
  const openAdd  = () => { setForm(EMPTY_RULE); setErrors({}); setModal({ mode: 'add' }) }
  const openEdit = (r) => {
    setForm({ policyId: r.policyId ?? r.leavePolicy?.id ?? '', isEnabled: r.isEnabled, maxEncashment: r.maxEncashment, timing: r.timing ?? 'YEAR_END' })
    setErrors({})
    setModal({ mode: 'edit', data: r })
  }
 
  const validate = () => {
    const e = {}
    if (!form.policyId)       e.policyId       = 'Policy required'
    if (!form.maxEncashment)  e.maxEncashment   = 'Max encashment required'
    setErrors(e)
    return Object.keys(e).length === 0
  }
 
  const handleSubmit = async () => {
    if (!validate()) return
    const dto = { ...form, policyId: Number(form.policyId), maxEncashment: Number(form.maxEncashment) }
    const ok  = modal.mode === 'add' ? await onCreate(dto) : await onUpdate(modal.data.id, dto)
    if (ok) setModal(null)
  }
 
  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}>
          <Plus size={14} /> Add Rule
        </button>
      </div>
 
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Policy', 'Enabled', 'Max Encashment', 'Timing', 'System', 'Actions'].map((h) => (
                  <th key={h} className="px-3.5 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            {loading ? (
              <tbody>
                {[...Array(3)].map((_, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-3.5 py-4 border-b border-gray-50">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : rules.length === 0 ? (
              <tbody><tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No encashment rules configured.</td></tr></tbody>
            ) : (
              <tbody>
                {rules.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-3.5 py-4 text-[13px] font-medium text-gray-800 border-b border-gray-50">
                      {r.policyName ?? r.leavePolicy?.policyName ?? '—'}
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 text-[12px] font-bold border-b border-gray-50" style={{ color: PRIMARY }}>
                      {r.maxEncashment} days
                    </td>
                    <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50">{r.timing ?? '—'}</td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.isSystemDefined ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.isSystemDefined ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5">
                        {!r.isSystemDefined && (
                          <>
                            <button onClick={() => openEdit(r)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] transition-all">
                              <Edit2 size={12} />
                            </button>
                            {isAdmin && (
                              <button onClick={() => setConfirm(r.id)} disabled={deleting === r.id}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40">
                                {deleting === r.id
                                  ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                  : <Trash2 size={12} />}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
 
      {/* Add / Edit Rule Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 520, margin: '0 16px' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
              <h2 className="text-sm font-semibold text-white">
                {modal.mode === 'add' ? 'Add Encashment Rule' : 'Edit Encashment Rule'}
              </h2>
              <button onClick={() => setModal(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Leave Policy <span style={{ color: PRIMARY }}>*</span></label>
                  <div className="relative">
                    <select value={form.policyId} onChange={(e) => setForm((p) => ({ ...p, policyId: e.target.value }))}
                      className="w-full h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 appearance-none"
                      onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                      onBlur={(e) => (e.target.style.borderColor = errors.policyId ? '#F87171' : '#E5E7EB')}>
                      <option value="">Select Policy</option>
                      {policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.policyId && <p className="text-[11px] text-red-500 mt-0.5">{errors.policyId}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Max Encashment Days <span style={{ color: PRIMARY }}>*</span></label>
                  <input type="number" min="1" value={form.maxEncashment} onChange={(e) => setForm((p) => ({ ...p, maxEncashment: e.target.value }))}
                    placeholder="e.g. 15"
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50"
                    style={{ borderColor: errors.maxEncashment ? '#F87171' : '#E5E7EB' }}
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = errors.maxEncashment ? '#F87171' : '#E5E7EB')} />
                  {errors.maxEncashment && <p className="text-[11px] text-red-500 mt-0.5">{errors.maxEncashment}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Timing</label>
                  <div className="relative">
                    <select value={form.timing} onChange={(e) => setForm((p) => ({ ...p, timing: e.target.value }))}
                      className="w-full h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 appearance-none"
                      onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                      onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}>
                      {TIMING_OPTS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 mt-5">
                  <span className="text-xs font-medium text-gray-600">Encashment Enabled</span>
                  <Toggle2 value={form.isEnabled} onChange={(v) => setForm((p) => ({ ...p, isEnabled: v }))} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#111827' }}>
                {saving && <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
 
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => { await onDelete(confirm); setConfirm(null) }}
        title="Delete Encashment Rule"
        description="Remove this encashment rule? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting === confirm}
      />
    </>
  )
}
 
// ── Main Encashment Tab ────────────────────────────────────────────────────
export function LeaveEncashmentTab() {
  const [sub, setSub] = useState('requests')
  const { user }      = useAuthStore()
  const isAdmin       = user?.role === ROLES.ADMIN
 
  const {
    requests, rules, loading, saving, deleting, totalPages, totalElements, page, setPage,
    createRequest, createRule, updateRule, deleteRule, refresh,
  } = useLeaveEncashment()
 
  // Need policies for the rules form - import useLeavePolicies
  const [policies, setPolicies] = useState([])
  // In real app: const { policies } = useLeavePolicies()
 
  return (
    <>
      {/* Sub tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
        {SUB_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setSub(key)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0"
            style={{ borderBottomColor: sub === key ? PRIMARY : 'transparent', color: sub === key ? PRIMARY : '#6B7280' }}>
            {label}
          </button>
        ))}
      </div>
 
      {sub === 'requests' && (
        <RequestsView
          requests={requests}
          loading={loading}
          saving={saving}
          totalPages={totalPages}
          totalElements={totalElements}
          page={page}
          setPage={setPage}
          onAdd={createRequest}
          refresh={refresh}
        />
      )}
 
      {sub === 'rules' && (
        <RulesView
          rules={rules}
          policies={policies}
          loading={loading}
          saving={saving}
          deleting={deleting}
          isAdmin={isAdmin}
          onCreate={createRule}
          onUpdate={updateRule}
          onDelete={deleteRule}
        />
      )}
    </>
  )
}
 
export default LeaveEncashmentTab