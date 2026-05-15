// src/pages/dashboard/HRDashboard.jsx
import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { Users, Clock, UserMinus, UserPlus, MessageSquare } from 'lucide-react'
import DateFilter from '../../components/shared/DateFilter'

const PRIMARY = '#C35E33'

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Total Employees', value: 22, Icon: Users     },
  { label: 'Present Today',   value: 41, Icon: Clock     },
  { label: 'On Leave',        value: 58, Icon: UserMinus },
  { label: 'New Joiners',     value: 5,  Icon: UserPlus  },
]

const EMP_DATA   = [
  { name: 'Total employee', value: 100 },
  { name: 'Active',         value: 62  },
  { name: 'inactive',       value: 50  },
]
const EMP_COLORS = ['#C35E33', '#22C55E', '#EF4444']

const ATTENDANCE_DATA = [
  { m: 'Jan', Ontime: 18, 'Late In': 4, Absent: 2 },
  { m: 'Feb', Ontime: 20, 'Late In': 5, Absent: 1 },
  { m: 'Mar', Ontime: 16, 'Late In': 6, Absent: 3 },
  { m: 'Apr', Ontime: 22, 'Late In': 3, Absent: 2 },
  { m: 'May', Ontime: 19, 'Late In': 5, Absent: 1 },
  { m: 'Jun', Ontime: 21, 'Late In': 4, Absent: 2 },
  { m: 'Jul', Ontime: 17, 'Late In': 7, Absent: 3 },
  { m: 'Aug', Ontime: 20, 'Late In': 4, Absent: 2 },
  { m: 'Sep', Ontime: 18, 'Late In': 5, Absent: 1 },
  { m: 'Oct', Ontime: 22, 'Late In': 3, Absent: 2 },
  { m: 'Nov', Ontime: 19, 'Late In': 6, Absent: 1 },
  { m: 'Dec', Ontime: 21, 'Late In': 4, Absent: 2 },
]

const LEAVE_DATA = [
  { name: 'Paternity',    value: 88 },
  { name: 'Floater',      value: 88 },
  { name: 'Birthday',     value: 74 },
  { name: 'Maternity',    value: 60 },
  { name: 'Comp Off',     value: 43 },
  { name: 'Unpaid Leave', value: 28 },
  { name: 'Paid Leave',   value: 17 },
  { name: 'CL',           value: 13 },
  { name: 'SL',           value: 10 },
]
const LEAVE_COLORS = [
  '#4A90D9','#F5A623','#E74C3C','#2ECC71',
  '#9B59B6','#E8A882','#C35E33','#95A5A6','#1ABC9C',
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

const renderEmpLabel = ({ cx, cy, midAngle, outerRadius, name, value }) => {
  const r = outerRadius + 38
  const x = cx + r * Math.cos(-(midAngle * Math.PI) / 180)
  const y = cy + r * Math.sin(-(midAngle * Math.PI) / 180)
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} fill="#374151" fontSize={11}>
      <tspan x={x} dy="-0.55em">{name}</tspan>
      <tspan x={x} dy="1.4em" fontWeight="700" fill="#111827" fontSize={12}>{value}</tspan>
    </text>
  )
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

function StatCard({ label, value, Icon }) {
  return (
    <div className="bg-surface rounded-xl px-4 py-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-border flex flex-col justify-between min-w-0 box-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-[28px] font-bold text-text leading-none">{value}</p>
          <p className="m-0 mt-[6px] text-[11px] text-text-muted leading-snug">{label}</p>
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
        <div className="p-[14px] flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button className="text-xs py-2 rounded-lg font-medium border border-primary text-primary bg-transparent hover:bg-[rgba(195,94,51,0.06)] transition-colors cursor-pointer">
              Announcements
            </button>
            <button className="text-xs py-2 rounded-lg font-medium border-0 text-white bg-primary hover:bg-primary-dark transition-colors cursor-pointer">
              Pending Task
            </button>
          </div>
          <button className="w-full text-xs py-2 rounded-lg font-medium border-0 text-white bg-secondary hover:bg-secondary-light transition-colors cursor-pointer">
            Calendar
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

export default function HRDashboard() {
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
      <h1 className="m-0 mb-5 text-[22px] font-bold text-text font-display">HR Dashboard</h1>

      <div className={isLg ? 'flex gap-5 items-start' : 'block'}>
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          <div className={`grid gap-4 ${isMd ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          <div className={`grid gap-4 ${isMd ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <ChartCard title="Employee Overview Graph">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={EMP_DATA} cx="50%" cy="50%" outerRadius={72} paddingAngle={2}
                    dataKey="value" label={renderEmpLabel} labelLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}>
                    {EMP_DATA.map((_, i) => <Cell key={i} fill={EMP_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={lgFmt(11)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Attendance OverView">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={ATTENDANCE_DATA} barSize={7} barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={lgFmt(11)} />
                  <Bar dataKey="Ontime"  stackId="a" fill="#1F2937" />
                  <Bar dataKey="Late In" stackId="a" fill={PRIMARY} />
                  <Bar dataKey="Absent"  stackId="a" fill="#E8C5A8" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* HR: Leave + Timesheet only — no Project Status */}
          <div className={`grid gap-4 ${isMd ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <ChartCard title="Leave Graph">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={LEAVE_DATA} cx="50%" cy="50%" outerRadius={78} dataKey="value"
                    label={({ name, value: v, cx: cx2, cy: cy2, midAngle, outerRadius: or }) => {
                      const x = cx2 + (or + 24) * Math.cos(-(midAngle * Math.PI) / 180)
                      const y = cy2 + (or + 24) * Math.sin(-(midAngle * Math.PI) / 180)
                      if (v < 20) return null
                      return <text x={x} y={y} fill="#374151" fontSize={10}
                        textAnchor={x > cx2 ? 'start' : 'end'} dominantBaseline="central">{name} {v}</text>
                    }}
                    labelLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}>
                    {LEAVE_DATA.map((_, i) => <Cell key={i} fill={LEAVE_COLORS[i % LEAVE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconType="circle" iconSize={8} layout="horizontal" formatter={lgFmt(10)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Time Sheet OverView">
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