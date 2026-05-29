// src/components/layout/AppShell.jsx
// ─── Toggle floats on sidebar's right edge ───────────────────────────────────
import { Outlet }           from 'react-router-dom'
import Sidebar              from './Sidebar'
import Header               from './Header'
import { useUIStore }       from '@/store/uiStore'
import { PanelLeft, PanelRight } from 'lucide-react'

const SIDEBAR_WIDTH         = 240   // must match Sidebar.jsx open width (px)
const SIDEBAR_COLLAPSED_W   = 0     // closed width — adjust if Sidebar has icon-only mode

export default function AppShell() {
  const { sidebarOpen, toggleSidebar } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F5F5' }}>
      
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Toggle button — floats at the right edge of the sidebar */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        style={{
          position:        'fixed',
          top:             '50%',
          left:            sidebarOpen ? SIDEBAR_WIDTH - 18 : SIDEBAR_COLLAPSED_W - 18,
          transform:       'translateY(-50%)',
          zIndex:          100,
          width:           36,
          height:          36,
          borderRadius:    '50%',
          backgroundColor: '#C35E33',
          border:          '3px solid #F5F5F5',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          transition:      'left 0.3s ease, background-color 0.15s ease',
          boxShadow:       '0 2px 8px rgba(0,0,0,0.35)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A34A24')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C35E33')}
      >
        {sidebarOpen
          ? <PanelLeft  size={16} color="#FFFFFF" strokeWidth={2} />
          : <PanelRight size={16} color="#FFFFFF" strokeWidth={2} />
        }
      </button>

      {/* ── Main column: Header + scrollable content saaulig */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header />

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 24px 28px' }}>
          <Outlet />
        </main>
      </div>

    </div>
  )
}