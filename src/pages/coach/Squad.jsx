import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import { ChevronRight, Users } from 'lucide-react'

export default function Squad() {
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('id, name').eq('role', 'ATHLETE').order('name')
    const ids = (data || []).map(a => a.id)
    let sessionCounts = {}
    if (ids.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const { data: sessions } = await supabase.from('sessions').select('athlete_id').in('athlete_id', ids).or(`completed_at.not.is.null,date.lt.${today}`)
      for (const s of sessions || []) { sessionCounts[s.athlete_id] = (sessionCounts[s.athlete_id] || 0) + 1 }
    }
    setAthletes((data || []).map(a => ({ ...a, sessionCount: sessionCounts[a.id] || 0 })))
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-5">Squad</h1>

      {athletes.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No athletes yet.</p>
          <p className="text-slate-400 text-xs mt-1">Athletes will appear here once they create accounts.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
          {athletes.map(athlete => (
            <button
              key={athlete.id}
              onClick={() => navigate(`/coach/squad/${athlete.id}`)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-vesta-navy/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-vesta-navy">{athlete.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">{athlete.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{athlete.sessionCount} session{athlete.sessionCount !== 1 ? 's' : ''} completed</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
