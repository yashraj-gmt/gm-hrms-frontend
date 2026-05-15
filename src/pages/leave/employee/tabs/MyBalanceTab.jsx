// src/pages/leave/employee/tabs/MyBalanceTab.jsx
import { Calendar, TrendingDown, TrendingUp, Info, RefreshCw } from 'lucide-react'

const PRIMARY = '#C35E33'

const TYPE_COLORS = {
  CL: { color: '#2563EB', bg: '#DBEAFE' },
  SL: { color: '#16A34A', bg: '#DCFCE7' },
  EL: { color: '#7C3AED', bg: '#EDE9FE' },
  AL: { color: PRIMARY,   bg: '#F5EBE5' },
  CO: { color: '#0891B2', bg: '#CFFAFE' },
  UL: { color: '#9D174D', bg: '#FCE7F3' },
}

function getColor(code) {
  return TYPE_COLORS[code] ?? { color: '#374151', bg: '#F3F4F6' }
}

function BalanceRing({ used, total, color }) {
  const pct   = total > 0 ? Math.round((used / total) * 100) : 0
  const r     = 28
  const circ  = 2 * Math.PI * r
  const dash  = circ * (1 - pct / 100)
  return (
    <svg width="72" height="72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#F3F4F6" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="36" y="40" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {100 - pct}%
      </text>
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 animate-pulse">
      <div className="w-[72px] h-[72px] rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-2 w-full bg-gray-100 rounded" />
        <div className="h-3 w-32 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

export default function MyBalanceTab({ balances, loading, onRefresh }) {
  const totalRemaining = balances.reduce((s, b) => s + (b.remainingLeaves ?? 0), 0)
  const totalUsed      = balances.reduce((s, b) => s + (b.usedLeaves ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: `linear-gradient(135deg, ${PRIMARY}, #8B3A1A)` }}>
        <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-orange-100 text-xs font-medium mb-1">Total Available Balance</p>
            <p className="text-4xl font-bold text-white leading-none">
              {loading ? '—' : totalRemaining.toFixed(1)}
            </p>
            <p className="text-orange-200 text-sm mt-1">days across all leave types</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-orange-100 text-[11px] font-medium">Used This Year</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '—' : totalUsed.toFixed(1)}
              </p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-orange-100 text-[11px] font-medium">Leave Types</p>
              <p className="text-2xl font-bold text-white">{balances.length}</p>
            </div>
            <button onClick={onRefresh}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <RefreshCw size={15} color="white" className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Balance cards */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          Leave Breakdown{' '}
          <span className="text-xs font-normal text-gray-400">— {new Date().getFullYear()}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? [...Array(5)].map((_, i) => <SkeletonCard key={i} />)
            : balances.length === 0
              ? (
                <div className="col-span-3 py-12 text-center">
                  <p className="text-sm text-gray-400">No leave balance data found for this year.</p>
                </div>
              )
              : balances.map((b) => {
                  const { color, bg } = getColor(b.leaveTypeCode)
                  const total    = b.totalLeaves ?? 0
                  const used     = b.usedLeaves ?? 0
                  const remaining = b.remainingLeaves ?? 0
                  return (
                    <div key={b.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                      <BalanceRing used={used} total={total} color={color} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: bg, color }}>{b.leaveTypeCode}</span>
                          <span className="text-[12px] font-semibold text-gray-800 truncate">{b.leaveTypeName}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${total > 0 ? (used / total) * 100 : 0}%`, backgroundColor: color }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">Used <span className="font-bold text-gray-600">{used}</span></span>
                          <span className="text-gray-400">Left <span className="font-bold" style={{ color }}>{remaining}</span></span>
                          <span className="text-gray-400">Total <span className="font-bold text-gray-600">{total}</span></span>
                        </div>
                      </div>
                    </div>
                  )
                })
          }
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border"
        style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}>
        <Info size={15} color="#2563EB" className="flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-blue-800 leading-relaxed">
          Balances update automatically after leave approval or cancellation.
          Monthly accruals post on the 1st of each month. Contact HR for discrepancies.
        </p>
      </div>
    </div>
  )
}