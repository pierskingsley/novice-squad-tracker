import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { LogOut, User, Users, ClipboardList, Activity } from 'lucide-react'

export default function CoachProfile() {
  const { user, profile, signOut } = useAuth()
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 flex items-center gap-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-vesta-navy/10 flex items-center justify-center flex-shrink-0">
          <User size={26} className="text-vesta-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-slate-900 truncate">{profile?.name || 'Coach'}</div>
          <div className="text-xs text-slate-400 mt-0.5">{user?.email}</div>
          <div className="text-xs text-vesta-red font-semibold mt-1 uppercase tracking-wide">Coach</div>
        </div>
      </div>

      {stats && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="flex flex-col items-center py-4 gap-1">
              <Users size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900">{stats.athletes}</span>
              <span className="text-xs text-slate-400">Athletes</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <ClipboardList size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900">{stats.programmes}</span>
              <span className="text-xs text-slate-400">Programmes</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <Activity size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900">{stats.sessions}</span>
              <span className="text-xs text-slate-400">Sessions logged</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </div>
  )
}
