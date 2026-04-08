import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { ProfilePageSkeleton } from '../../components/ui/Skeleton'
import { Trophy, LogOut, User, Dumbbell, Flame, Activity } from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const [pbs, setPbs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      Promise.all([loadPBs(), loadStats()]).finally(() => setLoading(false))
    }
  }, [user])

  async function loadPBs() {
    const { data } = await supabase
      .from('personal_bests')
      .select('weight, reps, achieved_at, exercises(name)')
      .eq('athlete_id', user.id)
      .not('set_id', 'is', null)
      .order('weight', { ascending: false })
    setPbs(data || [])
  }

  async function loadStats() {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, date')
      .eq('athlete_id', user.id)
      .not('completed_at', 'is', null)
      .order('date', { ascending: true })

    if (!sessions || sessions.length === 0) {
      setStats({ sessions: 0, tonnage: 0, streak: 0 })
      return
    }

    // Compute tonnage from sets directly — more reliable than the
    // denormalized total_tonnage column which can be 0 if a session
    // was completed without every set being explicitly logged
    const sessionIds = sessions.map(s => s.id)
    const { data: seRows } = await supabase
      .from('session_exercises')
      .select('id')
      .in('session_id', sessionIds)

    let tonnage = 0
    if (seRows?.length > 0) {
      const { data: sets } = await supabase
        .from('sets')
        .select('weight, reps')
        .in('session_exercise_id', seRows.map(s => s.id))
      tonnage = (sets || []).reduce((sum, s) => sum + s.weight * s.reps, 0)
    }

    // longest streak of consecutive calendar days
    const dates = [...new Set(sessions.map(s => s.date))].sort()
    let best = 1, current = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000
      current = diff === 1 ? current + 1 : 1
      if (current > best) best = current
    }

    setStats({ sessions: sessions.length, tonnage, streak: best })
  }

  if (loading) return <ProfilePageSkeleton />

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 flex items-center gap-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-vesta-navy/10 flex items-center justify-center flex-shrink-0">
          <User size={26} className="text-vesta-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-slate-900 truncate">{profile?.name || 'Athlete'}</div>
          <div className="text-xs text-slate-400 mt-0.5">{user?.email}</div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors py-2 px-3 rounded-xl hover:bg-red-50"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      {stats && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="flex flex-col items-center py-4 gap-1">
              <Activity size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900">{stats.sessions}</span>
              <span className="text-xs text-slate-400">Sessions</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <Dumbbell size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900">
                {stats.tonnage >= 1000
                  ? `${(stats.tonnage / 1000).toFixed(1)}t`
                  : `${Math.round(stats.tonnage)}kg`}
              </span>
              <span className="text-xs text-slate-400">Lifted</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <Flame size={16} className="text-vesta-navy mb-0.5" />
              <span className="text-xl font-bold text-slate-900">{stats.streak}</span>
              <span className="text-xs text-slate-400">Best streak</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-vesta-red" />
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PR Board</h2>
      </div>

      {pbs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <Trophy size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No personal records yet.</p>
          <p className="text-slate-400 text-xs mt-1">Log sets to start tracking your bests.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {pbs.map((pb, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-4 text-right font-mono">{i + 1}</span>
                  <span className="text-sm text-slate-900 font-medium">{pb.exercises?.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-vesta-red">{pb.weight}kg × {pb.reps}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(pb.achieved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
