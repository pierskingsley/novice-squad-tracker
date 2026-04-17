import { NavLink } from 'react-router-dom'
import { Dumbbell, History, TrendingUp, User, ClipboardList, Users, LayoutGrid } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/constants'

const ATHLETE_TABS = [
  { to: '/athlete/home', icon: Dumbbell, label: 'Today' },
  { to: '/athlete/history', icon: History, label: 'History' },
  { to: '/athlete/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/athlete/profile', icon: User, label: 'Profile' },
]

const COACH_TABS = [
  { to: '/coach/programmes', icon: ClipboardList, label: 'Programmes' },
  { to: '/coach/squad', icon: Users, label: 'Squad' },
  { to: '/coach/heatmap', icon: LayoutGrid, label: 'Heatmap' },
  { to: '/coach/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const { profile } = useAuth()
  const isCoach = profile?.role === ROLES.COACH
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur border-t border-slate-200 dark:border-zinc-800 safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-vesta-red' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={1.75} />
                {label}
                <span className={`w-1 h-1 rounded-full bg-vesta-red transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
