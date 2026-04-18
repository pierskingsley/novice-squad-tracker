import { NavLink } from 'react-router-dom'
import { Dumbbell, History, TrendingUp, User, ClipboardList, Users, LayoutGrid } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/constants'
import { CIUnderline } from './CIElements'

const ATHLETE_TABS = [
  { to: '/athlete/home',     icon: Dumbbell,    label: 'today' },
  { to: '/athlete/history',  icon: History,     label: 'past' },
  { to: '/athlete/progress', icon: TrendingUp,  label: 'gains' },
  { to: '/athlete/profile',  icon: User,        label: 'me' },
]

const COACH_TABS = [
  { to: '/coach/programmes', icon: ClipboardList, label: 'progs' },
  { to: '/coach/squad',      icon: Users,         label: 'squad' },
  { to: '/coach/heatmap',    icon: LayoutGrid,    label: 'map' },
  { to: '/coach/profile',    icon: User,          label: 'me' },
]

export default function BottomNav() {
  const { profile } = useAuth()
  const isCoach = profile?.role === ROLES.COACH
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: 'var(--ci-nav-bg, #FFFDF5)',
        borderTop: '2px solid #181614',
      }}
    >
      <style>{`
        @media (prefers-color-scheme: dark) { :root { --ci-nav-bg: #1F1C18; } }
        .dark { --ci-nav-bg: #1F1C18; }
      `}</style>
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1"
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1 py-2.5 px-1 relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  style={{ color: isActive ? '#D13A2E' : '#857F76', transition: 'color 0.15s' }}
                />
                <span style={{
                  fontFamily: 'Caveat, cursive',
                  fontSize: 15,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#D13A2E' : '#857F76',
                  lineHeight: 1,
                  transition: 'color 0.15s',
                }}>{label}</span>
                {isActive && (
                  <div style={{ position: 'absolute', bottom: 28 }}>
                    <CIUnderline color="#D13A2E" w={36} />
                  </div>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
