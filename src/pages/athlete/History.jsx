import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { ChevronDown, ChevronUp, Trophy, Calendar, RotateCcw } from 'lucide-react'

export default function History() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id, date, completed_at, total_tonnage,
        programme_assignments (
          programmes ( name )
        ),
        session_exercises (
          id, notes, order_index,
          exercises ( name ),
          sets ( id, set_number, weight, reps )
        )
      `)
      .eq('athlete_id', user.id)
      .not('completed_at', 'is', null)
      .order('date', { ascending: false })
      .limit(50)

    if (!error) setSessions(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user])

  const { pullDistance, refreshing, isTriggered, handlers: ptrHandlers } = usePullToRefresh(load)

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const now = new Date()
    const diff = Math.floor((now - d) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' })
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading && !refreshing) {
    return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>
  }

  return (
    <div {...ptrHandlers} className="px-4 pt-6">
      {pullDistance > 0 && (
        <div className="flex items-center justify-center overflow-hidden transition-all duration-150"
          style={{ height: pullDistance, marginTop: -pullDistance, marginBottom: pullDistance }}>
          <div className={`transition-all duration-150 ${isTriggered || refreshing ? 'text-vesta-red' : 'text-slate-300'}`}>
            {refreshing ? <Spinner size="sm" /> : <RotateCcw size={18} className={isTriggered ? 'rotate-180' : ''} />}
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold text-slate-900 mb-5">History</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No completed sessions yet.</p>
          <p className="text-slate-400 text-xs mt-1">Finish your first session to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(sess => {
            const isOpen = expanded[sess.id]
            const progName = sess.programme_assignments?.programmes?.name
            const orderedExercises = (sess.session_exercises || [])
              .sort((a, b) => a.order_index - b.order_index)
            const completedDate = sess.completed_at
              ? new Date(sess.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : null

            return (
              <div key={sess.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggle(sess.id)}
                  className="w-full px-4 py-4 flex items-start justify-between text-left"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{formatDate(sess.date)}</div>
                    {progName && <div className="text-xs text-slate-500 mt-0.5">{progName}</div>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400">
                        {orderedExercises.length} exercise{orderedExercises.length !== 1 ? 's' : ''}
                      </span>
                      {sess.total_tonnage > 0 && (
                        <>
                          <span className="text-slate-300 text-xs">•</span>
                          <span className="text-xs text-vesta-red font-medium">
                            {sess.total_tonnage >= 1000
                              ? `${(sess.total_tonnage / 1000).toFixed(1)}t`
                              : `${sess.total_tonnage}kg`} tonnage
                          </span>
                        </>
                      )}
                      {completedDate && (
                        <>
                          <span className="text-slate-300 text-xs">•</span>
                          <span className="text-xs text-slate-400">Done {completedDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-400 mt-1 flex-shrink-0">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {orderedExercises.map(se => {
                      const sortedSets = (se.sets || []).sort((a, b) => a.set_number - b.set_number)
                      const maxWeight = sortedSets.length > 0 ? Math.max(...sortedSets.map(s => s.weight)) : 0
                      return (
                        <div key={se.id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-900">{se.exercises?.name}</span>
                            {maxWeight > 0 && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Trophy size={10} className="text-vesta-red/60" />
                                {maxWeight}kg
                              </span>
                            )}
                          </div>
                          {sortedSets.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {sortedSets.map(s => (
                                <span
                                  key={s.id}
                                  className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1"
                                >
                                  {s.weight ? `${s.weight}kg × ${s.reps}` : [s.reps && `${s.reps} reps`, s.time_seconds && `${s.time_seconds}s`].filter(Boolean).join(' × ')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No sets logged</span>
                          )}
                          {se.notes && (
                            <p className="text-xs text-slate-400 mt-2 italic">"{se.notes}"</p>
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
