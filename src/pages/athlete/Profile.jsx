import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { Trophy, LogOut, User } from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const [pbs, setPbs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadPBs()
  }, [user])

  async function loadPBs() {
    setLoading(true)
    const { data } = await supabase
      .from('personal_bests')
      .select('weight, reps, achieved_at, exercises(name)')
      .eq('athlete_id', user.id)
      .order('weight', { ascending: false })
    setPbs(data || [])
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
