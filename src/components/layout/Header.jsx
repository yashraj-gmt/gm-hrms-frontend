// src/components/layout/Header.jsx
// ─── Tailwind CSS — profile dropdown, notification bell ──────────────────────
import { useState, useEffect, useRef } from 'react'
import { Bell, Search, ChevronDown, LogOut, User, Menu, X } from 'lucide-react'
import { useUIStore }   from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useNavigate }  from 'react-router-dom'
import profileIcon from '@/assets/images/profile-icon.png'

const MOBILE_BP = 768

export default function Header() {
  const { sidebarOpen }         = useUIStore()
  const { user, logout }        = useAuthStore()
  const navigate                = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < MOBILE_BP)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BP)
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
    <header className="flex items-center gap-4 px-5 h-16 flex-shrink-0 bg-black w-full box-border">

      {/* ── Search Bar ─────────────────────────────────────────── */}
      {!isMobile ? (
        <div className="flex-1 min-w-0">
          <label className="flex items-center gap-3 bg-white rounded-full px-5 h-11 border-2 border-[#C35E33] cursor-text">
            <Search size={16} color="#9CA3AF" strokeWidth={2} className="flex-shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 font-[Plus_Jakarta_Sans] min-w-0 placeholder:text-gray-400"
            />
          </label>
        </div>
      ) : (
        <button
          aria-label="Search"
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-700 bg-transparent cursor-pointer ml-auto"
        >
          <Search size={18} color="#FFFFFF" strokeWidth={1.8} />
        </button>
      )}

      {/* ── Right Section ──────────────────────────────────────── */}
      <div className={`flex items-center gap-3 flex-shrink-0 ${isMobile ? '' : ''}`}>

        {/* Notification Bell */}
        <button
          aria-label="Notifications"
          className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-gray-700 bg-transparent cursor-pointer hover:border-gray-500 transition-colors"
        >
          <Bell size={20} color="#FFFFFF" strokeWidth={1.8} />
          {/* Badge */}
          <span className="absolute top-[9px] right-[9px] w-[9px] h-[9px] rounded-full bg-[#C35E33] border-2 border-black" />
        </button>

        {/* User Profile with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 h-11 px-3 rounded-xl border border-gray-700 bg-transparent cursor-pointer hover:border-gray-500 transition-colors flex-shrink-0"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#C35E33] text-[11px] font-bold text-white">
              {user?.avatar ? (
                <img src={user.avatar} 
                      alt={user?.name || 'User'} 
                      className="w-full h-full object-cover" 
                            onError={e => { e.currentTarget.src = profileIcon }}
 />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Name + Designation */}
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
              size={14}
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