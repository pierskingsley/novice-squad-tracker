import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import { ArrowLeft, Trophy, ChevronDown, ChevronUp } from 'lucide-react'

export default function AthleteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [sessions, setSessions] = useState([])
  const [pbs, setPbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: profile }, { data: sessData }, { data: pbData }] = await Promise.all([
      supabase.from('profiles').select('id, name').eq('id', id).single(),
      supabase.from('sessions')
        .select('id, date, completed_at, total_tonnage, programme_assignments (programmes (name)), session_exercises (id, order_index, exercises (name), sets (id, set_number, weight, reps))')
        .eq('athlete_id', id).not('completed_at', 'is', null).order('date', { ascending: false }).limit(20),
      supabase.from('personal_bests').select('weight, reps, achieved_at, exercises(name)').eq('athlete_id', id).order('weight', { ascending: false }),
    ])
    setAthlete(profile); setSessions(sessData || []); setPbs(pbData || [])
    setLoading(false)
  }

  function toggle(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  if (!athlete) return (
    <div className="px-4 pt-6">
      <button onClick={() => navigate(-1)} className="text-vesta-red text-sm mb-4">← Back</button>
      <p className="text-slate-500">Athlete not found.</p>
    </div>
  )

  return (
    <div className="px-4 pt-5 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/coach/squad')} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors -ml-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-vesta-navy/10 flex items-center justify-center">
            <span className="text-base font-bold text-vesta-navy">{athlete.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{athlete.name}</h1>
            <p className="text-xs text-slate-400">{sessions.length} sessions completed</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-vesta-red" />
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PR Board</h2>
      </div>

      {pbs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-4 text-center mb-5 shadow-sm">
          <p className="text-slate-400 text-xs">No personal records yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5 shadow-sm">
          <div className="divide-y divide-slate-100">
            {pbs.slice(0, 10).map((pb, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                  <span className="text-sm text-slate-900">{pb.exercises?.name}</span>
                </div>
                <span className="text-sm font-bold text-vesta-red">{pb.weight}kg × {pb.reps}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Sessions</h2>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-4 text-center shadow-sm">
          <p className="text-slate-400 text-xs">No completed sessions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(sess => {
            const isOpen = expanded[sess.id]
            const progName = sess.programme_assignments?.programmes?.name
            const orderedExercises = (sess.session_exercises || []).sort((a, b) => a.order_index - b.order_index)
            return (
              <div key={sess.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button onClick={() => toggle(sess.id)} className="w-full px-4 py-3.5 flex items-center justify-between text-left">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{formatDate(sess.date)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {progName && <span className="text-xs text-slate-400">{progName}</span>}
                      {sess.total_tonnage > 0 && (
                        <span className="text-xs text-vesta-red font-medium">
                          {sess.total_tonnage >= 1000 ? `${(sess.total_tonnage / 1000).toFixed(1)}t` : `${sess.total_tonnage}kg`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-400">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {orderedExercises.map(se => {
                      const sortedSets = (se.sets || []).sort((a, b) => a.set_number - b.set_number)
                      return (
                        <div key={se.id} className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900 mb-2">{se.exercises?.name}</div>
                          {sortedSets.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {sortedSets.map(s => (
                                <span key={s.id} className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1">{s.weight}kg × {s.reps}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No sets logged</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
