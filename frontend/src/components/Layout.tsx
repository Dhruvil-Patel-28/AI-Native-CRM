/**
 * Layout — app shell with mode-aware sidebar and background.
 *
 * Manages the DashboardMode state with localStorage persistence.
 * Wraps the entire app in a mode-class container so CSS
 * variables cascade to all children.
 */

import { useState, useEffect, createContext, useContext } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconLayoutDashboard,
  IconRocket,
  IconUsers,
  IconSparkles,
} from '@tabler/icons-react'
import ModeSwitcher, { type DashboardMode } from './ModeSwitcher'

// ─── Context ─────────────────────────────────────────────────

interface ModeContextValue {
  mode: DashboardMode
  setMode: (mode: DashboardMode) => void
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'guided',
  setMode: () => {},
})

export function useMode() {
  return useContext(ModeContext)
}

// ─── Layout ──────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [mode, setMode] = useState<DashboardMode>(() => {
    const saved = localStorage.getItem('glow-dashboard-mode')
    return (saved === 'autopilot' ? 'autopilot' : 'guided') as DashboardMode
  })

  useEffect(() => {
    localStorage.setItem('glow-dashboard-mode', mode)
  }, [mode])

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <div className={`app-shell flex h-screen overflow-hidden ${mode}`}>
        <Sidebar mode={mode} onModeChange={setMode} />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ModeContext.Provider>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────

function Sidebar({
  mode,
  onModeChange,
}: {
  mode: DashboardMode
  onModeChange: (mode: DashboardMode) => void
}) {
  const location = useLocation()

  const navItems = [
    { to: '/', label: 'Dashboard', icon: IconLayoutDashboard },
    { to: '/campaigns', label: 'Campaigns', icon: IconRocket },
    { to: '/customers', label: 'Customers', icon: IconUsers },
  ]

  const isNavActive = (path: string) => {
    if (path === '/') {
      return (
        location.pathname === '/' ||
        location.pathname.startsWith('/campaign/') ||
        location.pathname.startsWith('/results/') ||
        location.pathname.startsWith('/autopilot/')
      )
    }
    return location.pathname === path
  }

  const accentColor = mode === 'guided' ? '#FF6B9D' : '#7C3AED'

  return (
    <aside className="sidebar w-64 flex flex-col flex-shrink-0">
      {/* Brand */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500"
            style={{
              background:
                mode === 'guided'
                  ? 'linear-gradient(135deg, #FF6B9D, #FF3D7F)'
                  : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            }}
          >
            <span className="text-white text-lg font-bold">G</span>
          </div>
          <div>
            <h1 className="text-text-primary font-bold text-lg leading-tight">
              Glow Studio
            </h1>
            <p className="text-text-muted text-[11px]">AI-Powered CRM</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <ModeSwitcher mode={mode} onModeChange={onModeChange} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isNavActive(item.to)
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={() =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                }`
              }
              style={
                active
                  ? {
                      background: `${accentColor}12`,
                      color: accentColor,
                    }
                  : undefined
              }
              id={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={18} stroke={1.8} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* AI Badge */}
      <div className="p-4">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-500"
          style={{
            background: `${accentColor}08`,
            border: `1px solid ${accentColor}15`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: accentColor }}
          />
          <IconSparkles size={13} style={{ color: accentColor }} />
          <span className="text-xs text-text-muted">Powered by AI</span>
        </div>
      </div>
    </aside>
  )
}
