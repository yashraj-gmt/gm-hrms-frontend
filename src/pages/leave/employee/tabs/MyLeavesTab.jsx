// src/pages/leave/employee/tabs/MyLeavesTab.jsx
import { useState, useMemo } from 'react'
import {
  Eye, XCircle, ChevronLeft, ChevronRight, Search, Filter,
  CalendarDays, Clock, CheckCircle2, XCircle as XC, Calendar,
  AlertTriangle,
} from 'lucide-react'
import FilterModal from '@/components/shared/FilterModal'
import { useToast } from '@/components/shared/toast/ToastProvider'
import LeaveDetailModal from '../modals/LeaveDetailModal'
import CancelConfirmModal from '../modals/CancelConfirmModal'

const PRIMARY   = '#C35E33'
const PAGE_SIZE = 6

const MY_LEAVES_INIT = [
  {
    id: 1,  leaveType: 'Annual Leave', code: 'AL',
    startDate: '2026-10-12', endDate: '2026-10-15',
    totalDays: 4, appliedOn: '2026-10-01', status: 'PENDING',
    reason: 'Family vacation out of state', startDayType: 'FULL', endDayType: 'FULL',
    cancelledDates: ['2026-10-13', '2026-10-14'], activeDays: 2,
  },
  {
    id: 2,  leaveType: 'Sick Leave', code: 'SL',
    startDate: '2026-09-05', endDate: '2026-09-06',
    totalDays: 2, appliedOn: '2026-09-05', status: 'APPROVED',
    reason: 'Fever and doctor advised rest', startDayType: 'FULL', endDayType: 'FULL',
    cancelledDates: [], activeDays: 2,
  },
  {
    id: 3,  leaveType: 'Casual Leave', code: 'CL',
    startDate: '2026-08-18', endDate: '2026-08-18',
    totalDays: 1, appliedOn: '2026-08-15', status: 'REJECTED',
    reason: 'Personal errand', startDayType: 'FULL', endDayType: 'FULL',
    cancelledDates: [], activeDays: 1,
  },
  {
    id: 4,  leaveType: 'Earned Leave', code: 'EL',
    startDate: '2026-07-01', endDate: '2026-07-05',
    totalDays: 5, appliedOn: '2026-06-20', status: 'APPROVED',
    reason: 'Annual trip', startDayType: 'FULL', endDayType: 'FULL',
    cancelledDates: [], activeDays: 5,
  },
  {
    id: 5,  leaveType: 'Sick Leave', code: 'SL',
    startDate: '2026-06-10', endDate: '2026-06-10',
    totalDays: 0.5, appliedOn: '2026-06-10', status: 'APPROVED',
    reason: 'Dental appointment', startDayType: 'FIRST_HALF', endDayType: 'FIRST_HALF',
    cancelledDates: [], activeDays: 0.5,
  },
  {
    id: 6,  leaveType: 'Casual Leave', code: 'CL',
    startDate: '2026-05-22', endDate: '2026-05-22',
    totalDays: 1, appliedOn: '2026-05-20', status: 'CANCELLED',
    reason: 'Home repair work', startDayType: 'FULL', endDayType: 'FULL',
    cancelledDates: [], activeDays: 0,
  },
]

const FILTER_CONFIG = [
  { key: 'status',    label: 'Status',     type: 'multi',  options: ['PENDING','APPROVED','REJECTED','CANCELLED'] },
  { key: 'leaveType', label: 'Leave Type', type: 'select', options: ['Annual Leave','Sick Leave','Casual Leave','Earned Leave','Unpaid Leave','Comp Off'] },
  { key: 'dateFrom',  label: 'Date From',  type: 'date' },
  { key: 'dateTo',    label: 'Date To',    type: 'date' },
]

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: '#FEF9C3', color: '#854D0E', icon: Clock      },
  APPROVED:  { label: 'Approved',  bg: '#DCFCE7', color: '#15803D', icon: CheckCircle2 },
  REJECTED:  { label: 'Rejected',  bg: '#FEE2E2', color: '#DC2626', icon: XC         },
  CANCELLED: { label: 'Cancelled', bg: '#F3F4F6', color: '#6B7280', icon: XC         },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#F3F4F6', color: '#374151' }
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  )
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
        <Icon size={18} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  )
}

export default function MyLeavesTab({ employee }) {
  const { toast } = useToast()

  const [leaves,        setLeaves]        = useState(MY_LEAVES_INIT)
  const [search,        setSearch]        = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [activeTab,     setActiveTab]     = useState('All')
  const [page,          setPage]          = useState(1)
  const [viewRecord,    setViewRecord]    = useState(null)
  const [cancelRecord,  setCancelRecord]  = useState(null)

  const tabCounts = {
    All:       leaves.length,
    PENDING:   leaves.filter((l) => l.status === 'PENDING').length,
    APPROVED:  leaves.filter((l) => l.status === 'APPROVED').length,
    REJECTED:  leaves.filter((l) => l.status === 'REJECTED').length,
    CANCELLED: leaves.filter((l) => l.status === 'CANCELLED').length,
  }

  const TAB_LIST = [
    { key: 'All',       label: 'All' },
    { key: 'PENDING',   label: 'Pending' },
    { key: 'APPROVED',  label: 'Approved' },
    { key: 'REJECTED',  label: 'Rejected' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leaves.filter((l) => {
      const tabMatch    = activeTab === 'All' || l.status === activeTab
      const searchMatch = !q || l.leaveType.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
      const statusMatch = !activeFilters.status?.length || activeFilters.status.includes(l.status)
      const typeMatch   = !activeFilters.leaveType || l.leaveType === activeFilters.leaveType
      return tabMatch && searchMatch && statusMatch && typeMatch
    })
  }, [leaves, activeTab, search, activeFilters])

  const paginated   = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const filterCount = Object.values(activeFilters).filter((v) => Array.isArray(v) ? v.length > 0 : !!v).length

  const handleCancel = (id, reason) => {
    setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: 'CANCELLED' } : l))
    toast.success('Your leave application has been cancelled.', 'Leave Cancelled')
    setCancelRecord(null)
  }

  return (
    <>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <SummaryCard icon={CalendarDays} label="Total Applied"  value={leaves.length}                                              color="#111827" bg="#F3F4F6" />
        <SummaryCard icon={Clock}        label="Pending"         value={leaves.filter((l) => l.status === 'PENDING').length}        color="#854D0E" bg="#FEF9C3" />
        <SummaryCard icon={CheckCircle2} label="Approved"        value={leaves.filter((l) => l.status === 'APPROVED').length}       color="#15803D" bg="#DCFCE7" />
        <SummaryCard icon={XC}           label="Rejected"         value={leaves.filter((l) => l.status === 'REJECTED').length}       color="#DC2626" bg="#FEE2E2" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Status tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TAB_LIST.map(({ key, label }) => (
            <button key={key} onClick={() => { setActiveTab(key); setPage(1) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all whitespace-nowrap"
              style={{
                borderColor:     activeTab === key ? '#111827' : '#E5E7EB',
                color:           activeTab === key ? '#111827' : '#6B7280',
                backgroundColor: activeTab === key ? '#F9FAFB' : '#fff',
                fontWeight:      activeTab === key ? 600 : 500,
              }}>
              {label}
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ backgroundColor: activeTab === key ? '#111827' : '#F3F4F6', color: activeTab === key ? '#fff' : '#6B7280' }}>
                {tabCounts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 border border-gray-200 cursor-text">
            <Search size={13} color="#9CA3AF" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search leave type…"
              className="border-none outline-none text-[13px] text-gray-900 bg-transparent w-36" />
          </label>
          <button onClick={() => setShowFilter(true)}
            className="relative flex items-center gap-1.5 bg-white border rounded-lg px-3 h-9 text-[13px] font-medium"
            style={{ borderColor: filterCount > 0 ? PRIMARY : '#E5E7EB', color: filterCount > 0 ? PRIMARY : '#374151' }}>
            <Filter size={13} />
            Filter
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: PRIMARY }}>{filterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY }}>
                {['Leave Type','Start Date','End Date','Days','Applied On','Status','Actions'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-white whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar size={32} color="#D1D5DB" />
                      <p className="text-sm text-gray-400">No leave records found.</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map((l, idx) => (
                <tr key={l.id}
                  className="hover:bg-orange-50 transition-colors"
                  style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td className="px-4 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: '#F5EBE5', color: PRIMARY }}>{l.code}</span>
                      <span className="text-[13px] font-semibold text-gray-900">{l.leaveType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">{l.startDate}</td>
                  <td className="px-4 py-4 text-[12px] text-gray-600 border-b border-gray-50 whitespace-nowrap">{l.endDate}</td>
                  <td className="px-4 py-4 border-b border-gray-50">
                    <span className="text-[12px] font-bold" style={{ color: PRIMARY }}>{l.totalDays}d</span>
                  </td>
                  <td className="px-4 py-4 text-[12px] text-gray-500 border-b border-gray-50 whitespace-nowrap">{l.appliedOn}</td>
                  <td className="px-4 py-4 border-b border-gray-50"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewRecord(l)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#C35E33] hover:text-[#C35E33] hover:bg-orange-50 transition-all"
                        title="View Details">
                        <Eye size={14} strokeWidth={1.8} />
                      </button>
                      {l.status === 'PENDING' && (
                        <button
                          onClick={() => setCancelRecord(l)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Cancel Leave">
                          <XCircle size={14} strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-800">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-gray-800">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i+1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
                  style={{ borderColor: page===p ? PRIMARY : '#E5E7EB', backgroundColor: page===p ? PRIMARY : 'transparent', color: page===p ? '#fff' : '#6B7280' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewRecord   && <LeaveDetailModal   record={viewRecord}  onClose={() => setViewRecord(null)} onCancel={(r) => setCancelRecord(r)} />}
      {cancelRecord && <CancelConfirmModal record={cancelRecord} onClose={() => setCancelRecord(null)} onConfirm={handleCancel} />}

      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(f) => { setActiveFilters(f); setPage(1) }}
        onReset={() => setActiveFilters({})}
        config={FILTER_CONFIG}
      />
    </>
  )
}