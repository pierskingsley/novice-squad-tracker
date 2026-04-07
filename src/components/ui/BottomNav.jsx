import { NavLink } from 'react-router-dom'
import { Dumbbell, History, TrendingUp, User, ClipboardList, Users, LogOut } from 'lucide-react'
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
]

export default function BottomNav() {
  const { profile, signOut } = useAuth()
  const isCoach = profile?.role === ROLES.COACH
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-vesta-red' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
        {isCoach && (
          <button
            onClick={signOut}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={22} strokeWidth={1.75} />
            Sign out
          </button>
        )}
      </div>
    </nav>
  )
}
