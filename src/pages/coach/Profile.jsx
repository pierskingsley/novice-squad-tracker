import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Spinner from '../../components/ui/Spinner'
import { LogOut, User, Users, ClipboardList, Activity } from 'lucide-react'

export default function CoachProfile() {
  const { user, profile, signOut } = useAuth()
  const { preference, setPreference } = useTheme()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  async function loadStats() {
    const [{ data: squads }, { data: progs }, { data: sessions }] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'ATHLETE'),
      supabase.from('programmes').select('id').eq('coach_id', user.id),
      supabase.from('sessions').select('id').not('completed_at', 'is', null),
    ])
    setStats({
      athletes: squads?.length ?? 0,
      programmes: progs?.length ?? 0,
      sessions: sessions?.length ?? 0,
    })
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 mb-5 flex items-center gap-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-vesta-navy/10 flex items-center justify-center flex-shrink-0">
          <User size={26} className="text-vesta-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-50 truncate">{profile?.name || 'Coach'}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{user?.email}</div>
          <div className="text-xs text-vesta-red font-semibold mt-1 uppercase tracking-wide">Coach</div>
        </div>
      </div>

      {stats && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm mb-5">
          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-zinc-800">
            <div className="flex flex-col items-center py-4 gap-1">
              <Users size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{stats.athletes}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Athletes</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <ClipboardList size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{stats.programmes}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Programmes</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <Activity size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{stats.sessions}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Sessions logged</span>
            </div>
          </div>
        </div>
      )}

      {/* Appearance */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Appearance</h2>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700">
            {[
              { value: 'auto', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPreference(value)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  preference === value
                    ? 'bg-vesta-red text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50 transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </div>
  )
}
