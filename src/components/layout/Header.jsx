// src/components/layout/Header.jsx
// ─── Tailwind CSS — profile dropdown, notification bell ──────────────────────
import { useState, useEffect, useRef } from 'react'
import { Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { useUIStore }   from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useNavigate }  from 'react-router-dom'
import profileIcon from '@/assets/images/profile-icon.png'

const MOBILE_BP  = 768   // below this: hide date
const SMALL_BP   = 480   // below this: hide "Welcome to GM HRMS" entirely

export default function Header() {
  const { sidebarOpen }                 = useUIStore()
  const { user, logout }                = useAuthStore()
  const navigate                        = useNavigate()
  const [isMobile, setIsMobile]         = useState(() => window.innerWidth < MOBILE_BP)
  const [isSmall,  setIsSmall]          = useState(() => window.innerWidth < SMALL_BP)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef                     = useRef(null)

  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth < MOBILE_BP)
      setIsSmall(window.innerWidth < SMALL_BP)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = (user?.name || 'MJ').slice(0, 2).toUpperCase()

  const handleLogout = () => {
    logout?.()
    navigate('/login')
  }

  const handleViewProfile = () => {
    navigate('/profile')
    setDropdownOpen(false)
  }

  return (
    <header className="flex items-center gap-2 px-3 h-16 flex-shrink-0 bg-black w-full box-border"
      style={{ paddingLeft: isMobile ? 12 : 20, paddingRight: isMobile ? 12 : 20 }}
    >

      {/* ── Welcome Message ──────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">

        {/* Hide entirely on very small screens so icons never get pushed */}
        {!isSmall && (
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 leading-none flex-shrink-0">
              <span className="text-gray-300 font-medium whitespace-nowrap"
                style={{ fontSize: isMobile ? '11px' : '13px' }}>
                Welcome to
              </span>
              <span
                className="font-extrabold whitespace-nowrap"
                style={{
                  fontSize:    isMobile ? '14px' : '20px',
                  letterSpacing: '0.06em',
                  fontFamily: "'Clash Display', sans-serif",
                }}
              >
                <span className="text-white">GM </span>
                <span style={{
                  background: 'linear-gradient(90deg, #C35E33 0%, #F0956A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  HRMS
                </span>
              </span>
            </div>

            {/* Date — only on desktop */}
            {!isMobile && (
              <>
                <div className="h-5 w-px bg-gray-600 flex-shrink-0" />
                <p className="text-gray-300 text-[12px] font-medium truncate">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </>
            )}
          </div>
        )}

        {/* On very small screens show only a compact brand mark */}
        {isSmall && (
          <span
            className="font-extrabold whitespace-nowrap"
            style={{ fontSize: '16px', letterSpacing: '0.06em', fontFamily: "'Clash Display', sans-serif" }}
          >
            <span className="text-white">GM </span>
            <span style={{
              background: 'linear-gradient(90deg, #C35E33 0%, #F0956A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              HRMS
            </span>
          </span>
        )}
      </div>

      {/* ── Right Section ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Notification Bell */}
        <button
          aria-label="Notifications"
          className="relative flex items-center justify-center rounded-xl border border-gray-700 bg-transparent cursor-pointer hover:border-gray-500 transition-colors flex-shrink-0"
          style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44 }}
        >
          <Bell size={isMobile ? 17 : 20} color="#FFFFFF" strokeWidth={1.8} />
          {/* Badge */}
          <span className="absolute top-[8px] right-[8px] w-[8px] h-[8px] rounded-full bg-[#C35E33] border-2 border-black" />
        </button>

        {/* User Profile with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-transparent cursor-pointer hover:border-gray-500 transition-colors flex-shrink-0"
            style={{
              height:      isMobile ? 38 : 44,
              paddingLeft:  isMobile ? 8 : 12,
              paddingRight: isMobile ? 8 : 12,
            }}
          >
            {/* Avatar */}
            <div
              className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C35E33] font-bold text-white"
              style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, fontSize: isMobile ? '10px' : '11px' }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = profileIcon }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Name + Designation —  desktop only */}
            {!isMobile && (
              <div className="text-left leading-none">
                <p className="m-0 text-white text-[13px] font-semibold leading-[1.3] whitespace-nowrap">
                  {user?.name || 'Mac John'}
                </p>
                <p className="m-0 text-gray-400 text-[11px] leading-[1.3] whitespace-nowrap">
                  {user?.designation || 'Designation'}
                </p>
              </div>
            )}

            <ChevronDown
              size={isMobile ? 12 : 14}
              color="#9CA3AF"
              strokeWidth={2.5}
              className={`flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-[#111827] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-[fadeIn_0.15s_ease]">
              <button
                onClick={handleViewProfile}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <User size={15} strokeWidth={2} />
                View Profile
              </button>
              <div className="h-px bg-gray-700 mx-3" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <LogOut size={15} strokeWidth={2} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}