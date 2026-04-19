import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { ChevronDown, ChevronUp, Trophy, Calendar, RotateCcw } from 'lucide-react'

const CI = {
  chalk: '#F5F1E8', chalkDeep: '#ECE5D4',
  ink: '#181614', inkSoft: '#55504A', inkMute: '#857F76',
  rule: '#D8CFBB', red: '#D13A2E',
  darkBg: '#14120F', darkCard: '#1F1C18', darkRule: '#302B24', darkInk: '#F5F1E8',
}

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export default function History() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const dark = useIsDark()

  const bg   = dark ? CI.darkBg   : CI.chalk
  const card = dark ? CI.darkCard : '#FFFDF5'
  const ink  = dark ? CI.darkInk  : CI.ink
  const mute = dark ? '#9A9387'   : CI.inkMute
  const rule = dark ? CI.darkRule : CI.rule

  const cardStyle = {
    background: card,
    border: `2px solid ${ink}`,
    borderRadius: 4,
    boxShadow: `3px 3px 0 ${ink}`,
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id, date, completed_at, total_tonnage,
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
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div {...ptrHandlers} style={{ minHeight: '100vh', background: bg, padding: '24px 16px 100px' }}>
      {pullDistance > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', height: pullDistance, marginTop: -pullDistance, marginBottom: pullDistance }}>
          <div style={{ color: isTriggered || refreshing ? CI.red : rule, transition: 'color 0.15s' }}>
            {refreshing ? <Spinner size="sm" /> : <RotateCcw size={18} style={{ transform: isTriggered ? 'rotate(180deg)' : 'none' }} />}
          </div>
        </div>
      )}

      <div style={{
        fontFamily: '"Archivo Black", Impact, sans-serif',
        fontSize: 26, fontWeight: 900, color: ink,
        textTransform: 'uppercase', letterSpacing: -0.5,
        marginBottom: 20,
      }}>Past</div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Calendar size={40} style={{ color: rule, margin: '0 auto 12px' }} />
          <p style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 15, color: mute, marginBottom: 4 }}>No sessions yet</p>
          <p style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: mute }}>Finish your first session to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(sess => {
            const isOpen = expanded[sess.id]
            const orderedExercises = (sess.session_exercises || [])
              .sort((a, b) => a.order_index - b.order_index)
            const completedTime = sess.completed_at
              ? new Date(sess.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : null

            return (
              <div key={sess.id} style={{ ...cardStyle, overflow: 'hidden' }}>
                <button
                  onClick={() => toggle(sess.id)}
                  style={{
                    width: '100%', padding: '14px 16px',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: '"Archivo Black", Impact, sans-serif',
                      fontSize: 15, fontWeight: 900, color: ink,
                    }}>{formatDate(sess.date)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: mute }}>
                        {orderedExercises.length} exercise{orderedExercises.length !== 1 ? 's' : ''}
                      </span>
                      {sess.total_tonnage > 0 && (
                        <>
                          <span style={{ color: rule, fontSize: 12 }}>·</span>
                          <span style={{
                            fontFamily: '"Archivo Black", Impact, sans-serif',
                            fontSize: 12, fontWeight: 900, color: CI.red, textTransform: 'uppercase',
                          }}>
                            {sess.total_tonnage >= 1000
                              ? `${(sess.total_tonnage / 1000).toFixed(1)}t`
                              : `${sess.total_tonnage}kg`}
                          </span>
                        </>
                      )}
                      {completedTime && (
                        <>
                          <span style={{ color: rule, fontSize: 12 }}>·</span>
                          <span style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: mute }}>Done {completedTime}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span style={{ color: mute, marginTop: 2, flexShrink: 0 }}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: `2px solid ${rule}` }}>
                    {orderedExercises.map((se, idx) => {
                      const sortedSets = (se.sets || []).sort((a, b) => a.set_number - b.set_number)
                      const maxWeight = sortedSets.length > 0 ? Math.max(...sortedSets.map(s => s.weight)) : 0
                      return (
                        <div
                          key={se.id}
                          style={{
                            padding: '12px 16px',
                            borderTop: idx > 0 ? `1px solid ${rule}` : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{
                              fontFamily: '"Archivo Black", Impact, sans-serif',
                              fontSize: 13, fontWeight: 900, color: ink,
                            }}>{se.exercises?.name}</span>
                            {maxWeight > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Caveat, cursive', fontSize: 14, color: mute }}>
                                <Trophy size={11} style={{ color: CI.red }} />
                                {maxWeight}kg
                              </span>
                            )}
                          </div>
                          {sortedSets.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {sortedSets.map(s => (
                                <span
                                  key={s.id}
                                  style={{
                                    fontFamily: 'Caveat, cursive', fontSize: 15,
                                    background: dark ? CI.darkBg : CI.chalkDeep,
                                    border: `1px solid ${rule}`,
                                    borderRadius: 4,
                                    padding: '3px 10px',
                                    color: ink,
                                  }}
                                >
                                  {s.weight
                                    ? `${s.weight}kg × ${s.reps}`
                                    : [s.reps && `${s.reps} reps`, s.time_seconds && `${s.time_seconds}s`].filter(Boolean).join(' × ')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: mute }}>No sets logged</span>
                          )}
                          {se.notes && (
                            <p style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: mute, marginTop: 8 }}>"{se.notes}"</p>
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
