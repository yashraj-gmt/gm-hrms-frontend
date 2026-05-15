// src/pages/ComingSoon.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable placeholder for Phase 2 modules
// Usage: <ComingSoon /> — auto-detects page from URL
// ─────────────────────────────────────────────────────────────────────────────

import { useLocation } from 'react-router-dom'
import { FolderKanban, ClipboardList, FileText, Wallet, Rocket, Clock } from 'lucide-react'

const PRIMARY      = '#C35E33'
const PRIMARY_LIGHT = '#FDE8DD'

const PAGE_META = {
  '/projects':  { label: 'Project Management', icon: FolderKanban, desc: 'Track projects, milestones, tasks and team assignments in one place.'   },
  '/timesheet': { label: 'Time Sheet',          icon: ClipboardList,desc: 'Log daily work hours, review timesheets and generate reports.'          },
  '/reports':   { label: 'Reports',             icon: FileText,     desc: 'Powerful analytics, exportable reports and workforce insights.'         },
  '/payroll':   { label: 'Payroll',             icon: Wallet,       desc: 'Automated payroll processing, payslips, deductions and tax management.' },
}

const FEATURES = [
  'Real-time data sync',
  'Export to PDF / Excel',
  'Role-based access',
  'Email notifications',
  'Audit trail & logs',
  'Mobile responsive',
]

export default function ComingSoon() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || { label: 'Feature', icon: Rocket, desc: 'This feature is currently under development.' }
  const Icon = meta.icon

  return (
    <div className="flex flex-col items-center justify-center min-h-[72vh] px-4 select-none">

      {/* Icon bubble */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: PRIMARY }}>
          <Icon size={44} color="#fff" strokeWidth={1.5} />
        </div>
        {/* pulse ring */}
        <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
          style={{ backgroundColor: PRIMARY, animationDuration: '2s' }} />
      </div>

      {/* Badge */}
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4"
        style={{ backgroundColor: PRIMARY_LIGHT, color: PRIMARY }}>
        <Clock size={11} strokeWidth={2.5} />
        Phase 2 - Coming Soon
      </span>

      {/* Title + desc */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">{meta.label}</h1>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-8 leading-relaxed">{meta.desc}</p>

      {/* Feature chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-md mb-8">
        {FEATURES.map((f) => (
          <span key={f} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 bg-white">
            ✦ {f}
          </span>
        ))}
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border max-w-sm w-full"
        style={{ borderColor: PRIMARY + '30', backgroundColor: PRIMARY_LIGHT }}>
        <Rocket size={16} color={PRIMARY} className="flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-700 leading-relaxed">
          This module is actively being developed and will be available in <span className="font-semibold" style={{ color: PRIMARY }}>Phase 2</span> of the HRMS rollout. Stay tuned for updates!
        </p>
      </div>

    </div>
  )
}