// src/pages/dashboard/EmployeeDashboard.jsx
import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Label,
} from 'recharts'
import {
  CalendarCheck, Umbrella, FolderKanban, Clock,
  MessageSquare, CheckCircle2, AlertCircle, Circle,
} from 'lucide-react'
import DateFilter from '../../components/shared/DateFilter'

const PRIMARY = '#C35E33'

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'My Attendance',     value: 18,  sub: 'days this month', Icon: CalendarCheck },
  { label: 'Leave Balance',     value: 8,   sub: 'days remaining',  Icon: Umbrella      },
  { label: 'Assigned Projects', value: 5,   sub: 'active',          Icon: FolderKanban  },
  { label: 'Hours Logged',      value: 142, sub: 'this month',      Icon: Clock         },
]

const ATTENDANCE_SUMMARY = [
  { week: 'W1', Present: 5, Late: 0, Absent: 0 },
  { week: 'W2', Present: 4, Late: 1, Absent: 0 },
  { week: 'W3', Present: 3, Late: 0, Absent: 2 },
  { week: 'W4', Present: 5, Late: 0, Absent: 0 },
  { week: 'W5', Present: 1, Late: 0, Absent: 0 },
]

const LEAVE_BALANCE_DATA = [
  { name: 'Paid Leave',   used: 4, remaining: 8, total: 12, color: '#C35E33' },
  { name: 'Sick Leave',   used: 2, remaining: 8, total: 10, color: '#6366F1' },
  { name: 'Casual Leave', used: 3, remaining: 4, total: 7,  color: '#22C55E' },
  { name: 'Comp Off',     used: 1, remaining: 2, total: 3,  color: '#F97316' },
]

const LEAVE_DONUT = [
  { name: 'Used',      value: 10, color: '#C35E33' },
  { name: 'Remaining', value: 22, color: '#E8C5A8' },
]

const ASSIGNED_PROJECTS = [
  { name: 'HR Portal Redesign',  status: 'In Progress', progress: 65,  dueDate: 'May 15', color: '#C35E33' },
  { name: 'Payroll Integration', status: 'In Progress', progress: 40,  dueDate: 'Jun 01', color: '#6366F1' },
  { name: 'Onboarding Workflow', status: 'Completed',   progress: 100, dueDate: 'Apr 10', color: '#22C55E' },
  { name: 'Analytics Dashboard', status: 'Not Started', progress: 0,   dueDate: 'Jul 20', color: '#9CA3AF' },
  { name: 'Mobile App UI',       status: 'In Progress', progress: 25,  dueDate: 'Jun 30', color: '#F97316' },
]

const TIMESHEET_DATA = [
  { day: 'Mon', Target: 7,  Overtime: 0, Undertime: 1 },
  { day: 'Tu',  Target: 8,  Overtime: 1, Undertime: 0 },
  { day: 'Wed', Target: 9,  Overtime: 0, Undertime: 0 },
  { day: 'Thu', Target: 8,  Overtime: 0, Undertime: 0 },
  { day: 'Fri', Target: 8,  Overtime: 0, Undertime: 2 },
  { day: 'Sat', Target: 6,  Overtime: 0, Undertime: 0 },
  { day: 'Sun', Target: 4,  Overtime: 0, Undertime: 0 },
]

const CHAT_DATA = [
  { name: 'Aethalia Putri', status: 'Last seen yesterday',  online: false, color: '#E91E63', init: 'AP' },
  { name: 'Erlan Sadewa',   status: 'Online',                online: true,  color: '#9C27B0', init: 'ES' },
  { name: 'Midala Huera',   status: 'Last seen 3 hours ago', online: false, color: '#2196F3', init: 'MH' },
  { name: 'Nafisa Gitari',  status: 'Online',                online: true,  color: '#4CAF50', init: 'NG' },
  { name: 'Nadia Santoso',  status: 'Online',                online: true,  color: '#FF9800', init: 'NS' },
]

const ttStyle = {
  fontSize: 12, borderRadius: 8,
  border: '1px solid #E8E8E8',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}
const lgFmt = (sz) => (v) => <span style={{ color: '#6B7280', fontSize: sz }}>{v}</span>

function StatusIcon({ status }) {
  if (status === 'Completed')   return <CheckCircle2 size={14} color="#16A34A" />
  if (status === 'In Progress') return <AlertCircle  size={14} color={PRIMARY}  />
  return <Circle size={14} color="#9CA3AF" />
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-surface rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-border box-border ${className}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="m-0 text-[13px] font-semibold text-text">{title}</h3>
        <DateFilter />
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, Icon }) {
  return (
    <div className="bg-surface rounded-xl px-4 py-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-border flex flex-col justify-between min-w-0 box-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-[28px] font-bold text-text leading-none">{value}</p>
          <p className="m-0 mt-[6px] text-[11px] text-text-muted leading-snug">{label}</p>
          {sub && <p className="m-0 mt-0.5 text-[10px] text-text-muted opacity-70">{sub}</p>}
        </div>
        <div className="flex items-center justify-center w-[34px] h-[34px] rounded-lg shrink-0"
          style={{ backgroundColor: 'rgba(195,94,51,0.10)' }}>
          <Icon size={17} color={PRIMARY} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}

function ChatRow({ person, highlighted }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`flex items-center gap-2.5 px-[14px] py-[10px] border-b border-[#F9FAFB] cursor-pointer transition-colors duration-100 box-border ${
        highlighted ? 'bg-[rgba(195,94,51,0.06)]' : hover ? 'bg-[#F9FAFB]' : 'bg-transparent'
      }`}>
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
          style={{ backgroundColor: person.color }}>{person.init}</div>
        {person.online && <span className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-green-500 border-2 border-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-xs font-semibold text-text truncate">{person.name}</p>
        <p className={`m-0 text-[11px] truncate ${person.online ? 'text-green-500' : 'text-text-muted'}`}>{person.status}</p>
      </div>
      <button className="flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer shrink-0 hover:bg-gray-100 transition-colors">
        <MessageSquare size={15} color="#9CA3AF" strokeWidth={1.8} />
      </button>
    </div>
  )
}

function RightPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-border">
        <div className="px-4 py-3 bg-primary text-white text-[13px] font-semibold text-center">Quick Link</div>
        <div className="p-[14px] flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button className="text-xs py-2 rounded-lg font-medium border border-primary text-primary bg-transparent hover:bg-[rgba(195,94,51,0.06)] transition-colors cursor-pointer">
              Apply Leave
            </button>
            <button className="text-xs py-2 rounded-lg font-medium border-0 text-white bg-primary hover:bg-primary-dark transition-colors cursor-pointer">
              View Payslip
            </button>
          </div>
          <button className="w-full text-xs py-2 rounded-lg font-medium border-0 text-white bg-secondary hover:bg-secondary-light transition-colors cursor-pointer">
            Mark Attendance
          </button>
        </div>
      </div>
      <div className="bg-surface rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-border">
        <div className="px-4 py-3 bg-primary text-white text-[13px] font-semibold text-center">Chat Box</div>
        <div>{CHAT_DATA.map((p, i) => <ChatRow key={i} person={p} highlighted={i === 0} />)}</div>
      </div>
    </div>
  )
}

export default function EmployeeDashboard() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const isMd = width < 900
  const isLg = width >= 1200

  return (
    <div className="min-h-full box-border">
      <h1 className="m-0 mb-5 text-[22px] font-bold text-text font-display">My Dashboard</h1>

      <div className={isLg ? 'flex gap-5 items-start' : 'block'}>
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Stats */}
          <div className={`grid gap-4 ${isMd ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Row 2: Attendance Summary + Leave Balance */}
          <div className={`grid gap-4 ${isMd ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <ChartCard title="My Attendance Summary">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={ATTENDANCE_SUMMARY} barSize={16} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={[0, 6]} />
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={lgFmt(11)} />
                  <Bar dataKey="Present" fill="#1F2937" radius={[3,3,0,0]} name="Present" />
                  <Bar dataKey="Late"    fill={PRIMARY}  radius={[3,3,0,0]} name="Late In" />
                  <Bar dataKey="Absent"  fill="#E8C5A8"  radius={[3,3,0,0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Leave Balance">
              <div className="flex items-center gap-4">
                <div className="shrink-0" style={{ width: 130, height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={LEAVE_DONUT} cx="50%" cy="50%"
                        innerRadius={42} outerRadius={58} paddingAngle={3}
                        dataKey="value" startAngle={90} endAngle={-270}>
                        {LEAVE_DONUT.map((item, i) => <Cell key={i} fill={item.color} />)}
                        <Label content={({ viewBox }) => {
                          const { cx, cy } = viewBox
                          return (
                            <>
                              <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central"
                                fontSize={15} fontWeight={700} fill="#111827">22</text>
                              <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="central"
                                fontSize={8} fill="#6B7280">remaining</text>
                            </>
                          )
                        }} />
                      </Pie>
                      <Tooltip contentStyle={ttStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                  {LEAVE_BALANCE_DATA.map(leave => (
                    <div key={leave.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-text-muted truncate">{leave.name}</span>
                        <span className="text-[11px] font-semibold text-text shrink-0 ml-2">
                          {leave.remaining}/{leave.total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${(leave.remaining / leave.total) * 100}%`, backgroundColor: leave.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Row 3: Assigned Projects + Timesheet */}
          <div className={`grid gap-4 ${isMd ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <ChartCard title="Assigned Projects">
              <div className="flex flex-col gap-2">
                {ASSIGNED_PROJECTS.map(proj => (
                  <div key={proj.name} className="flex flex-col gap-1 p-2.5 rounded-lg bg-surface-alt border border-border box-border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon status={proj.status} />
                        <span className="text-[12px] font-medium text-text truncate">{proj.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: proj.status === 'Completed'
                              ? 'rgba(34,197,94,0.1)'
                              : proj.status === 'In Progress'
                                ? 'rgba(195,94,51,0.1)'
                                : 'rgba(156,163,175,0.15)',
                            color: proj.status === 'Completed'
                              ? '#16A34A'
                              : proj.status === 'In Progress'
                                ? PRIMARY
                                : '#6B7280',
                          }}>
                          {proj.status}
                        </span>
                        <span className="text-[10px] text-text-muted">{proj.dueDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${proj.progress}%`, backgroundColor: proj.color }} />
                      </div>
                      <span className="text-[10px] text-text-muted w-8 text-right shrink-0">{proj.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="My Timesheet OverView">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={TIMESHEET_DATA} barSize={13} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={[0, 10]} />
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={lgFmt(10)} />
                  <Bar dataKey="Target"    fill="#1F2937" radius={[3,3,0,0]} name="Exactly 8 hrs (Target)" />
                  <Bar dataKey="Overtime"  fill={PRIMARY}  radius={[3,3,0,0]} name="> 8 hrs (Overtime)" />
                  <Bar dataKey="Undertime" fill="#9CA3AF"  radius={[3,3,0,0]} name="< 8 hrs (Undertime)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {!isLg && <RightPanel />}
        </div>

        {isLg && <div className="w-[290px] shrink-0"><RightPanel /></div>}
      </div>
    </div>
  )
}