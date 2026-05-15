// src/components/layout/Sidebar.jsx
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, UserRound, CalendarClock, CalendarX2,
  ShieldCheck, FolderKanban, ClipboardList, FileText, Wallet,
  Database, ClipboardCheck, Building2, GitBranch, FileStack, ChevronDown, BookOpen,
  Clock, Coffee, CalendarDays,
} from 'lucide-react'
import logo from '@/assets/images/gm-hrms-logo.png'
import { useUIStore }     from '@/store/uiStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES }         from '@/constants/routes'

const BRAND     = '#C35E33'
const SIDEBAR_W = 240
const MOBILE_BP = 1024

const MASTER_ITEMS = [
  { label: 'Designation',  icon: ClipboardCheck, route: ROUTES.DESIGNATION  },
  { label: 'Department',   icon: Building2,      route: ROUTES.DEPARTMENT   },
  { label: 'Branch',       icon: GitBranch,      route: ROUTES.BRANCH       },
  { label: 'Documents',    icon: FileStack,      route: ROUTES.DOCUMENTS    },
  { label: 'Intern Course',icon: BookOpen,       route: ROUTES.INTERN_COURSE },
  { label: 'Break Policy', icon: Coffee,         route: ROUTES.BREAK_POLICY },
  { label: 'Holiday',      icon: CalendarDays,   route: ROUTES.HOLIDAY      },
]

// NAV_ITEMS 
const NAV_ITEMS = [
  { label: 'Dashboard',           icon: LayoutDashboard, route: ROUTES.DASHBOARD       },
  { label: 'Employee',            icon: UserRound,       route: ROUTES.EMPLOYEE        },
  { label: 'Attendance',          icon: CalendarClock,   route: ROUTES.ATTENDANCE      },
  { label: 'Attendance', icon: CalendarClock, route: ROUTES.ATTENDANCE_EMPLOYEE }, 
  { label: 'Shift Management',    icon: Clock,           route: ROUTES.SHIFT           },
  { label: 'Leave Management',    icon: CalendarX2,      route: ROUTES.LEAVE           }, 
  { label: 'Leave Management',    icon: CalendarX2,      route: ROUTES.LEAVE_EMPLOYEE  },
  { label: 'Roles & Permissions', icon: ShieldCheck,     route: ROUTES.ROLES           },
  { label: 'Project',             icon: FolderKanban,    route: ROUTES.PROJECTS        },
  { label: 'Time Sheet',          icon: ClipboardList,   route: ROUTES.TIMESHEET       },
  { label: '__master__',          icon: Database,        route: '__master__'           },
  { label: 'Report',              icon: FileText,        route: ROUTES.REPORTS         },
  { label: 'Payroll',             icon: Wallet,          route: ROUTES.PAYROLL         },
  { label: 'My Shift', icon: Clock, route: ROUTES.SHIFT_EMPLOYEE },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.18)', margin: '3px 12px' }} />
)

// ─── Master Data collapsible group ────────────────────────────────────────────
function MasterDataGroup() {
  const location      = useLocation()
  const isChildActive = MASTER_ITEMS.some((m) => location.pathname.startsWith(m.route))
  const [expanded, setExpanded] = useState(isChildActive)

  useEffect(() => { if (isChildActive) setExpanded(true) }, [isChildActive])

  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '11px 16px', borderRadius: 16,
          fontSize: 13.5, fontWeight: isChildActive ? 600 : 500,
          color: '#fff',
          backgroundColor: isChildActive ? 'rgba(255,255,255,0.15)' : 'transparent',
          border: 'none', cursor: 'pointer', transition: 'background-color 0.15s',
          whiteSpace: 'nowrap', overflow: 'hidden', boxSizing: 'border-box', textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!isChildActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isChildActive
            ? 'rgba(255,255,255,0.15)'
            : 'transparent'
        }}
      >
        <Database size={20} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25, letterSpacing: '0.01em' }}>
          Master Data
        </span>
        <ChevronDown
          size={14} strokeWidth={2}
          style={{
            flexShrink: 0,
            transform:  expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight:  expanded ? MASTER_ITEMS.length * 46 + 'px' : '0px',
        transition: 'max-height 280ms cubic-bezier(0.4,0,0.2,1)',
        paddingLeft: 8,
        marginTop:   expanded ? 2 : 0,
      }}>
        {MASTER_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.route}
              to={item.route}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px', borderRadius: 12,
                fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                color:           isActive ? BRAND : 'rgba(255,255,255,0.82)',
                backgroundColor: isActive ? '#fff'  : 'transparent',
                textDecoration: 'none',
                transition: 'background-color 0.15s, color 0.15s',
                whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer',
                boxSizing: 'border-box', marginBottom: 2,
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{
                    width: 3, height: 14, borderRadius: 4, flexShrink: 0,
                    backgroundColor: isActive ? BRAND : 'rgba(255,255,255,0.25)',
                    transition: 'background-color 0.15s',
                  }} />
                  <Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sidebar panel ────────────────────────────────────────────────────────────
function SidebarPanel({ items }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: SIDEBAR_W, backgroundColor: BRAND,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 100, backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0', flexShrink: 0,
        borderRadius: '0 0 20px 20px',
      }}>
        <img
          src={logo} alt="HRMS"
          style={{ height: 85, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }}
        />
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1, overflowY: 'auto', padding: '16px 12px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent',
      }}>
        {items.map((item, idx) => {
          const isLast     = idx === items.length - 1
          const showDivider = !isLast

          // ── Master Data collapsible
          if (item.route === '__master__') {
            return (
              <div key="__master__">
                <MasterDataGroup />
                {showDivider && <Divider />}
              </div>
            )
          }

          // ── Regular nav link
          const Icon = item.icon
          return (
            <div key={item.route}>
              <NavLink
                to={item.route}
                end={item.route === ROUTES.DASHBOARD}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '11px 16px', 
                   borderTopLeftRadius: 2,
                  borderBottomLeftRadius: 2,
                  borderTopRightRadius: 16,
                  borderBottomRightRadius: 16,
                  fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                  color:           isActive ? BRAND : '#fff',
                  backgroundColor: isActive ? '#fff'  : 'transparent',
                  textDecoration: 'none',
                  boxShadow:  isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                  transition: 'background-color 0.15s, color 0.15s, box-shadow 0.15s',
                  whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer',
                  boxSizing: 'border-box',
                })}
                onMouseEnter={(e) => {
                  const link = e.currentTarget
                  // Only apply hover bg when not active (active has white bg)
                  if (link.style.backgroundColor !== 'rgb(255, 255, 255)') {
                    link.style.backgroundColor = 'rgba(255,255,255,0.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  const link = e.currentTarget
                  if (link.style.backgroundColor !== 'rgb(255, 255, 255)') {
                    link.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon size={20} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25, letterSpacing: '0.01em' }}>
                  {item.label}
                </span>
              </NavLink>
              {showDivider && <Divider />}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────
export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { canAccess }                   = usePermissions()
  const [isMobile, setIsMobile]         = useState(() => window.innerWidth < MOBILE_BP)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < MOBILE_BP)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])  

  const filteredItems = NAV_ITEMS.filter((item) => {
    // '__master__' sentinel: only show when the user can access ≥ 1 child
    // → automatically hidden for EMPLOYEE / INTERN / TRAINEE (no master routes in their perms)
    if (item.route === '__master__') {
      return MASTER_ITEMS.some((m) => canAccess(m.route))
    }
    return canAccess(item.route)
  })

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 20,
            backgroundColor: 'rgba(0,0,0,0.45)',
            opacity:       sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? 'auto' : 'none',
            transition:    'opacity 300ms ease',
          }}
        />
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside
          aria-label="Main navigation"
          style={{
            flexShrink: 0, height: '100vh', overflow: 'hidden',
            width:      sidebarOpen ? SIDEBAR_W : 0,
            transition: 'width 300ms ease-in-out',
          }}
        >
          <SidebarPanel items={filteredItems} />
        </aside>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <aside
          aria-label="Main navigation"
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 30,
            transform:  sidebarOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
            transition: 'transform 300ms ease-in-out',
          }}
        >
          <SidebarPanel items={filteredItems} />
        </aside>
      )}
    </>
  )
}