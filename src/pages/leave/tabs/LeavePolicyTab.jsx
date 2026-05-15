// src/pages/leave/tabs/LeavePolicyTab.jsx
// All policy modals are co-located at the bottom of this file.
import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Eye, X, ChevronDown, Search } from 'lucide-react'
import { useLeavePolicies } from '@/hooks/leave/useLeavePolicies'
import { useAuthStore }     from '@/store/authStore'
import { ROLES }            from '@/constants/roles'
import ConfirmModal         from '@/components/shared/ConfirmModal'

const PRIMARY = '#C35E33'

const SUB_TABS = [
  { key: 'policy',      label: 'Leave Policy' },
  { key: 'policytype',  label: 'Policy Type' },
  { key: 'eligibility', label: 'Eligibility Rule' },
  { key: 'application', label: 'Application Rule' },
]

const EMPLOYMENT_TYPES = ['EMPLOYEE', 'INTERN', 'TRAINEE']
const ACCRUAL_TYPES    = ['MONTHLY', 'YEARLY', 'QUARTERLY']

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function TableSkeleton({ cols = 5 }) {
  return (
    <tbody>
      {[...Array(4)].map((_, i) => (
        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-3.5 py-4 border-b border-gray-50">
              <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '60%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function EmptyRow({ cols, message = 'No records found.' }) {
  return (
    <tbody>
      <tr><td colSpan={cols} className="px-4 py-14 text-center text-sm text-gray-400">{message}</td></tr>
    </tbody>
  )
}

function TableHeader({ headers }) {
  return (
    <thead>
      <tr style={{ backgroundColor: PRIMARY }}>
        {headers.map((h) => (
          <th key={h} className="px-3.5 py-3.5 text-left text-xs font-semibold whitespace-nowrap text-white">{h}</th>
        ))}
      </tr>
    </thead>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: value ? PRIMARY : '#D1D5DB' }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: value ? '18px' : '2px' }} />
    </button>
  )
}

function FormInput({ label, required, error, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span style={{ color: PRIMARY }}> *</span>}
      </label>
      <input
        {...props}
        className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 placeholder:text-gray-300 transition-colors"
        onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
        onBlur={(e)  => (e.target.style.borderColor = '#E5E7EB')}
      />
      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

function FormSelect({ label, required, children, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span style={{ color: PRIMARY }}> *</span>}
      </label>
      <div className="relative">
        <select
          {...props}
          className="w-full h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 appearance-none"
          onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
          onBlur={(e)  => (e.target.style.borderColor = '#E5E7EB')}>
          {children}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

function ModalShell({ title, onClose, onSubmit, saving, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 620, margin: '0 16px' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white hover:text-white/70 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#111827' }}>
            {saving && <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Leave Policy Sub-tab ─────────────────────────────────────────────────────

function LeavePolicySub({ policies, loading, saving, deleting, isAdmin, onCreate, onEdit, onDelete }) {
  const [search, setSearch]   = useState('')
  const [modal,  setModal]    = useState(null) // null | { mode:'add'|'edit', data? }
  const [confirm,setConfirm]  = useState(null)
  const [form,   setForm]     = useState({
    policyName: '', employmentType: 'EMPLOYEE', description: '',
    effectiveFrom: '', effectiveTo: '', requiresApproval: true,
    allowHalfDay: true, allowBackdatedLeave: false, sandwichRuleEnabled: false,
  })
  const [errors, setErrors] = useState({})

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return policies.filter((p) => p.policyName?.toLowerCase().includes(q) || p.employmentType?.toLowerCase().includes(q))
  }, [search, policies])

  const openAdd = () => {
    setForm({ policyName: '', employmentType: 'EMPLOYEE', description: '', effectiveFrom: '', effectiveTo: '', requiresApproval: true, allowHalfDay: true, allowBackdatedLeave: false, sandwichRuleEnabled: false })
    setErrors({})
    setModal({ mode: 'add' })
  }

  const openEdit = (p) => {
    setForm({ ...p })
    setErrors({})
    setModal({ mode: 'edit', data: p })
  }

  const validate = () => {
    const e = {}
    if (!form.policyName?.trim()) e.policyName = 'Policy name is required'
    if (!form.effectiveFrom)      e.effectiveFrom = 'Effective from is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const ok = modal.mode === 'add'
      ? await onCreate(form)
      : await onEdit(modal.data.id, form)
    if (ok) setModal(null)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text">
          <Search size={13} color="#9CA3AF" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policy…"
            className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-44" />
        </label>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: PRIMARY }}>
          <Plus size={14} /> Add Policy
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 720 }}>
            <TableHeader headers={['Policy Name', 'Employment Type', 'Effective From', 'Effective To', 'Status', 'Actions']} />
            {loading ? <TableSkeleton cols={6} /> :
             filtered.length === 0 ? <EmptyRow cols={6} /> : (
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-3.5 py-4 text-[13px] font-semibold text-gray-900 border-b border-gray-50">{p.policyName}</td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: '#F5EBE5', color: PRIMARY }}>{p.employmentType}</span>
                    </td>
                    <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50">{p.effectiveFrom}</td>
                    <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50">{p.effectiveTo ?? '—'}</td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] transition-all">
                          <Edit2 size={12} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => setConfirm(p.id)}
                            disabled={deleting === p.id}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40">
                            {deleting === p.id ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : <Trash2 size={12} />}
                          </button>
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

      {/* Add / Edit Modal */}
      {modal && (
        <ModalShell
          title={modal.mode === 'add' ? 'Add Leave Policy' : 'Edit Leave Policy'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          saving={saving}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Policy Name" required placeholder="e.g. General Leave Policy"
              value={form.policyName} onChange={(e) => setForm((p) => ({ ...p, policyName: e.target.value }))}
              error={errors.policyName} />
            <FormSelect label="Employment Type" required value={form.employmentType}
              onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Optional description..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 resize-none"
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e)  => (e.target.style.borderColor = '#E5E7EB')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Effective From" required type="date" value={form.effectiveFrom}
              onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
              error={errors.effectiveFrom} />
            <FormInput label="Effective To" type="date" value={form.effectiveTo}
              onChange={(e) => setForm((p) => ({ ...p, effectiveTo: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'requiresApproval',    label: 'Requires Approval' },
              { key: 'allowHalfDay',        label: 'Allow Half Day' },
              { key: 'allowBackdatedLeave', label: 'Allow Backdated' },
              { key: 'sandwichRuleEnabled', label: 'Sandwich Rule' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <Toggle value={!!form[key]} onChange={(v) => setForm((p) => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => { await onDelete(confirm); setConfirm(null) }}
        title="Delete Policy"
        description="This will soft-delete the policy. Existing leave data will be preserved."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  )
}


// ─── Policy Type (Mapping) Sub-tab ────────────────────────────────────────────

function PolicyTypeSub({ mappings, policies, loading, saving, deleting, isAdmin, onCreate, onDelete }) {
  const [modal,  setModal]  = useState(false)
  const [confirm,setConfirm]= useState(null)
  const [form,   setForm]   = useState({ policyId: '', leaveTypeId: '', totalLeaves: '', accrualType: 'MONTHLY', accrualValue: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.policyId)    e.policyId    = 'Policy is required'
    if (!form.leaveTypeId) e.leaveTypeId = 'Leave type is required'
    if (!form.totalLeaves) e.totalLeaves = 'Total leaves is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const ok = await onCreate({ ...form, policyId: Number(form.policyId), leaveTypeId: Number(form.leaveTypeId), totalLeaves: Number(form.totalLeaves), accrualValue: Number(form.accrualValue) })
    if (ok) { setModal(false); setForm({ policyId: '', leaveTypeId: '', totalLeaves: '', accrualType: 'MONTHLY', accrualValue: '' }) }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setErrors({}); setModal(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}>
          <Plus size={14} /> Add Mapping
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <TableHeader headers={['Policy', 'Leave Type', 'Total Leaves', 'Accrual Type', 'Accrual Value', 'Actions']} />
            {loading ? <TableSkeleton cols={6} /> :
             mappings.length === 0 ? <EmptyRow cols={6} /> : (
              <tbody>
                {mappings.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-3.5 py-4 text-[13px] font-medium text-gray-800 border-b border-gray-50">{m.policyName ?? m.leavePolicy?.policyName}</td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#F5EBE5', color: PRIMARY }}>
                        {m.leaveTypeCode ?? m.leaveType?.code}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 text-[12px] font-bold border-b border-gray-50" style={{ color: PRIMARY }}>{m.totalLeaves}</td>
                    <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50">{m.accrualType}</td>
                    <td className="px-3.5 py-4 text-[12px] text-gray-600 border-b border-gray-50">{m.accrualValue ?? '—'}</td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      {isAdmin && (
                        <button onClick={() => setConfirm(m.id)}
                          disabled={deleting === m.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {modal && (
        <ModalShell title="Add Policy Type Mapping" onClose={() => setModal(false)} onSubmit={handleSubmit} saving={saving}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Leave Policy" required value={form.policyId}
              onChange={(e) => setForm((p) => ({ ...p, policyId: e.target.value }))}>
              <option value="">Select policy</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}
            </FormSelect>
            <FormInput label="Leave Type ID" required placeholder="Enter leave type ID"
              value={form.leaveTypeId} onChange={(e) => setForm((p) => ({ ...p, leaveTypeId: e.target.value }))}
              error={errors.leaveTypeId} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Total Leaves" required type="number" placeholder="12"
              value={form.totalLeaves} onChange={(e) => setForm((p) => ({ ...p, totalLeaves: e.target.value }))}
              error={errors.totalLeaves} />
            <FormSelect label="Accrual Type" value={form.accrualType}
              onChange={(e) => setForm((p) => ({ ...p, accrualType: e.target.value }))}>
              {ACCRUAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
            <FormInput label="Accrual Value" type="number" placeholder="1"
              value={form.accrualValue} onChange={(e) => setForm((p) => ({ ...p, accrualValue: e.target.value }))} />
          </div>
        </ModalShell>
      )}

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={async () => { await onDelete(confirm); setConfirm(null) }}
        title="Delete Mapping" description="Remove this policy-type mapping?" confirmLabel="Delete" variant="danger" />
    </>
  )
}


// ─── Eligibility Rule Sub-tab ─────────────────────────────────────────────────

function EligibilitySub({ eligRules, policies, loading, saving, deleting, isAdmin, onCreate, onEdit, onDelete }) {
  const [modal,  setModal]  = useState(null)
  const [confirm,setConfirm]= useState(null)
  const [form,   setForm]   = useState({ policyId: '', probationPeriodInMonths: '', allowCompOff: true })
  const [errors, setErrors] = useState({})

  const openAdd  = () => { setForm({ policyId: '', probationPeriodInMonths: '', allowCompOff: true }); setErrors({}); setModal({ mode: 'add' }) }
  const openEdit = (r) => { setForm({ policyId: r.policyId ?? r.leavePolicy?.id, probationPeriodInMonths: r.probationPeriodInMonths, allowCompOff: r.allowCompOff }); setErrors({}); setModal({ mode: 'edit', data: r }) }

  const validate = () => {
    const e = {}
    if (!form.policyId) e.policyId = 'Policy is required'
    if (form.probationPeriodInMonths === '') e.probationPeriodInMonths = 'Probation period is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const dto = { ...form, policyId: Number(form.policyId), probationPeriodInMonths: Number(form.probationPeriodInMonths) }
    const ok = modal.mode === 'add' ? await onCreate(dto) : await onEdit(modal.data.id, dto)
    if (ok) setModal(null)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus size={14} /> Add Rule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 600 }}>
            <TableHeader headers={['Policy', 'Probation (Months)', 'Allow Comp Off', 'System', 'Actions']} />
            {loading ? <TableSkeleton cols={5} /> :
             eligRules.length === 0 ? <EmptyRow cols={5} /> : (
              <tbody>
                {eligRules.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-3.5 py-4 text-[13px] font-medium text-gray-800 border-b border-gray-50">{r.policyName ?? r.leavePolicy?.policyName}</td>
                    <td className="px-3.5 py-4 text-[12px] font-bold border-b border-gray-50" style={{ color: PRIMARY }}>{r.probationPeriodInMonths}</td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.allowCompOff ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.allowCompOff ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.isSystemDefined ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.isSystemDefined ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5">
                        {!r.isSystemDefined && (
                          <>
                            <button onClick={() => openEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] transition-all"><Edit2 size={12} /></button>
                            {isAdmin && (
                              <button onClick={() => setConfirm(r.id)} disabled={deleting === r.id}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40">
                                <Trash2 size={12} />
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

      {modal && (
        <ModalShell title={modal.mode === 'add' ? 'Add Eligibility Rule' : 'Edit Eligibility Rule'}
          onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Leave Policy" required value={form.policyId}
              onChange={(e) => setForm((p) => ({ ...p, policyId: e.target.value }))}>
              <option value="">Select policy</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}
            </FormSelect>
            <FormInput label="Probation Period (Months)" required type="number" placeholder="6"
              value={form.probationPeriodInMonths}
              onChange={(e) => setForm((p) => ({ ...p, probationPeriodInMonths: e.target.value }))}
              error={errors.probationPeriodInMonths} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 w-fit gap-4">
            <span className="text-xs font-medium text-gray-700">Allow Comp Off</span>
            <Toggle value={!!form.allowCompOff} onChange={(v) => setForm((p) => ({ ...p, allowCompOff: v }))} />
          </div>
        </ModalShell>
      )}

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={async () => { await onDelete(confirm); setConfirm(null) }}
        title="Delete Eligibility Rule" description="Remove this eligibility rule?" confirmLabel="Delete" variant="danger" />
    </>
  )
}


// ─── Application Rule Sub-tab ─────────────────────────────────────────────────

function ApplicationSub({ appRules, policies, loading, saving, deleting, isAdmin, onCreate, onEdit, onDelete }) {
  const [modal,  setModal]  = useState(null)
  const [confirm,setConfirm]= useState(null)
  const [form,   setForm]   = useState({
    policyId: '', allowHalfDay: true, minLeaveDuration: '0.5',
    maxConsecutiveDays: '', applyBeforeDays: '0',
    allowBackdatedLeave: false, sandwichRuleEnabled: false,
    includeHolidays: false, includeWeekends: false,
  })
  const [errors, setErrors] = useState({})

  const openAdd  = () => { setForm({ policyId: '', allowHalfDay: true, minLeaveDuration: '0.5', maxConsecutiveDays: '', applyBeforeDays: '0', allowBackdatedLeave: false, sandwichRuleEnabled: false, includeHolidays: false, includeWeekends: false }); setErrors({}); setModal({ mode: 'add' }) }
  const openEdit = (r) => { setForm({ ...r, policyId: r.policyId ?? r.leavePolicy?.id }); setErrors({}); setModal({ mode: 'edit', data: r }) }

  const validate = () => {
    const e = {}
    if (!form.policyId)         e.policyId         = 'Policy is required'
    if (!form.maxConsecutiveDays) e.maxConsecutiveDays = 'Max consecutive days required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const dto = {
      ...form,
      policyId: Number(form.policyId),
      minLeaveDuration: parseFloat(form.minLeaveDuration),
      maxConsecutiveDays: Number(form.maxConsecutiveDays),
      applyBeforeDays: Number(form.applyBeforeDays),
    }
    const ok = modal.mode === 'add' ? await onCreate(dto) : await onEdit(modal.data.id, dto)
    if (ok) setModal(null)
  }

  const TOGGLES = [
    { key: 'allowHalfDay',        label: 'Allow Half Day' },
    { key: 'allowBackdatedLeave', label: 'Allow Backdated' },
    { key: 'sandwichRuleEnabled', label: 'Sandwich Rule' },
    { key: 'includeHolidays',     label: 'Include Holidays' },
    { key: 'includeWeekends',     label: 'Include Weekends' },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus size={14} /> Add Rule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 720 }}>
            <TableHeader headers={['Policy', 'Min Duration', 'Max Consecutive', 'Apply Before', 'Half Day', 'Backdated', 'Sandwich', 'Actions']} />
            {loading ? <TableSkeleton cols={8} /> :
             appRules.length === 0 ? <EmptyRow cols={8} /> : (
              <tbody>
                {appRules.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-orange-50 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-3.5 py-4 text-[13px] font-medium text-gray-800 border-b border-gray-50">{r.policyName ?? r.leavePolicy?.policyName}</td>
                    <td className="px-3.5 py-4 text-[12px] font-bold border-b border-gray-50" style={{ color: PRIMARY }}>{r.minLeaveDuration}d</td>
                    <td className="px-3.5 py-4 text-[12px] text-gray-700 border-b border-gray-50">{r.maxConsecutiveDays}d</td>
                    <td className="px-3.5 py-4 text-[12px] text-gray-700 border-b border-gray-50">{r.applyBeforeDays}d</td>
                    {['allowHalfDay','allowBackdatedLeave','sandwichRuleEnabled'].map((k) => (
                      <td key={k} className="px-3.5 py-4 border-b border-gray-50">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r[k] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r[k] ? 'Yes' : 'No'}</span>
                      </td>
                    ))}
                    <td className="px-3.5 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5">
                        {!r.isSystemDefined && (
                          <>
                            <button onClick={() => openEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] transition-all"><Edit2 size={12} /></button>
                            {isAdmin && (
                              <button onClick={() => setConfirm(r.id)} disabled={deleting === r.id}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40">
                                <Trash2 size={12} />
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

      {modal && (
        <ModalShell title={modal.mode === 'add' ? 'Add Application Rule' : 'Edit Application Rule'}
          onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Leave Policy" required value={form.policyId}
              onChange={(e) => setForm((p) => ({ ...p, policyId: e.target.value }))}>
              <option value="">Select policy</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}
            </FormSelect>
            <FormInput label="Min Leave Duration (days)" required type="number" placeholder="0.5" step="0.5"
              value={form.minLeaveDuration} onChange={(e) => setForm((p) => ({ ...p, minLeaveDuration: e.target.value }))} />
            <FormInput label="Max Consecutive Days" required type="number" placeholder="30"
              value={form.maxConsecutiveDays} onChange={(e) => setForm((p) => ({ ...p, maxConsecutiveDays: e.target.value }))}
              error={errors.maxConsecutiveDays} />
            <FormInput label="Apply Before Days" type="number" placeholder="0"
              value={form.applyBeforeDays} onChange={(e) => setForm((p) => ({ ...p, applyBeforeDays: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <Toggle value={!!form[key]} onChange={(v) => setForm((p) => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={async () => { await onDelete(confirm); setConfirm(null) }}
        title="Delete Rule" description="Remove this application rule?" confirmLabel="Delete" variant="danger" />
    </>
  )
}


// ─── Main LeavePolicyTab ──────────────────────────────────────────────────────

export default function LeavePolicyTab() {
  const [sub, setSub] = useState('policy')
  const { user } = useAuthStore()
  const isAdmin = user?.role === ROLES.ADMIN

  const {
    policies, mappings, appRules, eligRules,
    loading, saving, deleting,
    createPolicy, updatePolicy, deletePolicy,
    createMapping, deleteMapping,
    createAppRule, updateAppRule, deleteAppRule,
    createEligRule, updateEligRule, deleteEligRule,
  } = useLeavePolicies()

  return (
    <>
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200 overflow-hidden">
        {SUB_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setSub(key)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0"
            style={{ borderBottomColor: sub === key ? PRIMARY : 'transparent', color: sub === key ? PRIMARY : '#6B7280' }}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'policy' && (
        <LeavePolicySub
          policies={policies} loading={loading} saving={saving} deleting={deleting} isAdmin={isAdmin}
          onCreate={createPolicy} onEdit={updatePolicy} onDelete={deletePolicy} />
      )}
      {sub === 'policytype' && (
        <PolicyTypeSub
          mappings={mappings} policies={policies} loading={loading} saving={saving} deleting={deleting} isAdmin={isAdmin}
          onCreate={createMapping} onDelete={deleteMapping} />
      )}
      {sub === 'eligibility' && (
        <EligibilitySub
          eligRules={eligRules} policies={policies} loading={loading} saving={saving} deleting={deleting} isAdmin={isAdmin}
          onCreate={createEligRule} onEdit={updateEligRule} onDelete={deleteEligRule} />
      )}
      {sub === 'application' && (
        <ApplicationSub
          appRules={appRules} policies={policies} loading={loading} saving={saving} deleting={deleting} isAdmin={isAdmin}
          onCreate={createAppRule} onEdit={updateAppRule} onDelete={deleteAppRule} />
      )}
    </>
  )
}