// src/pages/leave/LeaveManagement.jsx
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Wallet, Settings, UserCheck,
  GitBranch, RefreshCw, ClipboardList, ChevronRight
} from 'lucide-react'
import LeaveOverviewTab     from './tabs/LeaveOverviewTab'
import LeaveBalanceTab      from './tabs/LeaveBalanceTab'
import LeavePolicyTab       from './tabs/LeavePolicyTab'
import LeaveTypeTab         from './tabs/LeaveTypeTab'
import CompOffRequestTab    from './tabs/CompOffRequestTab'
import LeaveEncashmentTab   from './tabs/LeaveEncashmentTab'

const PRIMARY      = '#C35E33'
const PRIMARY_DARK = '#A34A24'
const PRIMARY_MUTED= '#F5EBE5'

const TABS = [
  { key: 'overview',     label: 'Leave Overview',        icon: LayoutDashboard,  desc: 'Transactions & approvals' },
  { key: 'balance',      label: 'Leave Balance',         icon: Wallet,           desc: 'Employee leave balances' },
  { key: 'policy',       label: 'Leave Policy',          icon: FileText,         desc: 'Policy rules & settings' },
  { key: 'type',         label: 'Leave Types',           icon: GitBranch,        desc: 'Leave field configuration' },
  { key: 'compoff',      label: 'Comp Off',              icon: RefreshCw,        desc: 'Compensatory off requests' },
  { key: 'encashment',   label: 'Leave Encashment',      icon: ClipboardList,    desc: 'Encashment rules' },
]

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':   return <LeaveOverviewTab />
      case 'balance':    return <LeaveBalanceTab />
      case 'policy':     return <LeavePolicyTab />
      case 'type':       return <LeaveTypeTab />
      case 'compoff':    return <CompOffRequestTab />
      case 'encashment': return <LeaveEncashmentTab />
      default:           return <LeaveOverviewTab />
    }
  }

  return (
    <div className="min-h-screen" >
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3  ">
        <div>
          {/* <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>HR Management</span>
            <ChevronRight size={12} />
            <span style={{ color: PRIMARY }} className="font-medium">Leave Management</span>
          </div> */}
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employee leaves, policies and balances</p>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide flex-nowrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border flex-shrink-0"
            style={activeTab === key
              ? { backgroundColor: PRIMARY, color: '#fff', borderColor: PRIMARY, boxShadow: '0 2px 8px rgba(195,94,51,0.35)' }
              : { backgroundColor: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }
            }
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div>{renderTab()}</div>
    </div>
  )
}