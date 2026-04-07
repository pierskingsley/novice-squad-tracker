import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import { ArrowLeft, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
        .select(`
          id, date, total_tonnage,
          session_exercises (
            id, order_index,
            exercises (name),
            sets (id, set_number, weight, reps)
          )
        `)
        .eq('athlete_id', id)
        .not('completed_at', 'is', null)
        .order('date', { ascending: false })
        .limit(30),
      supabase.from('personal_bests')
        .select('weight, reps, achieved_at, exercises(name)')
        .eq('athlete_id', id)
        .order('weight', { ascending: false }),
    ])

    setAthlete(profile)
    setSessions(sessData || [])
    setPbs(pbData || [])
    setLoading(false)
  }

  function toggle(sessId) {
    setExpanded(prev => ({ ...prev, [sessId]: !prev[sessId] }))
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  if (loading) {
    return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>
  }

  if (!athlete) {
    return (
      <div className="px-4 pt-6">
        <button onClick={() => navigate(-1)} className="text-amber-500 text-sm mb-4">← Back</button>
        <p className="text-zinc-400">Athlete not found.</p>
      </div>
    )
  }

  // Chart data — last 12 sessions in chronological order
  const chartData = [...sessions]
    .filter(s => s.total_tonnage > 0)
    .slice(0, 12)
    .reverse()
    .map(s => ({
      date: new Date(s.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      tonnage: s.total_tonnage,
    }))

  const totalSessions = sessions.length
  const totalTonnage = sessions.reduce((sum, s) => sum + (s.total_tonnage || 0), 0)
  const lastSession = sessions[0]

  return (
    <div className="px-4 pt-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/coach/squad')}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors -ml-1"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <span className="text-base font-bold text-amber-500">{athlete.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{athlete.name}</h1>
            <p className="text-xs text-zinc-500">
              {totalSessions} session{totalSessions !== 1 ? 's' : ''}
              {lastSession && ` · Last: ${formatDate(lastSession.date)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="text-2xl font-bold text-white">{totalSessions}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Total sessions</div>
        </div>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="text-2xl font-bold text-amber-500">
            {totalTonnage >= 1000
              ? `${(totalTonnage / 1000).toFixed(1)}t`
              : `${Math.round(totalTonnage)}kg`}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Total tonnage</div>
        </div>
      </div>

      {/* Tonnage chart */}
      {chartData.length > 1 && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Tonnage per session</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}`}
              />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
                itemStyle={{ color: '#f59e0b' }}
                formatter={v => [`${v}kg`, 'Tonnage']}
              />
              <Area
                type="monotone"
                dataKey="tonnage"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#tonnageGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PR Board */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-amber-500" />
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">PR Board</h2>
      </div>

      {pbs.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-4 text-center mb-5">
          <p className="text-zinc-500 text-xs">No personal records yet.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden mb-5">
          <div className="divide-y divide-zinc-800/60">
            {pbs.map((pb, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 w-4 text-right font-mono">{i + 1}</span>
                  <span className="text-sm text-white">{pb.exercises?.name}</span>
                </div>
                <span className="text-sm font-bold text-amber-500">{pb.weight}kg × {pb.reps}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session history */}
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Session history</h2>

      {sessions.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-4 text-center">
          <p className="text-zinc-500 text-xs">No completed sessions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(sess => {
            const isOpen = expanded[sess.id]
            const orderedExercises = (sess.session_exercises || [])
              .sort((a, b) => a.order_index - b.order_index)

            return (
              <div key={sess.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => toggle(sess.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{formatDate(sess.date)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">
                        {orderedExercises.length} exercise{orderedExercises.length !== 1 ? 's' : ''}
                      </span>
                      {sess.total_tonnage > 0 && (
                        <>
                          <span className="text-zinc-700 text-xs">·</span>
                          <span className="text-xs text-amber-500 font-medium">
                            {sess.total_tonnage >= 1000
                              ? `${(sess.total_tonnage / 1000).toFixed(1)}t`
                              : `${sess.total_tonnage}kg`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-600">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
                    {orderedExercises.map(se => {
                      const sortedSets = (se.sets || []).sort((a, b) => a.set_number - b.set_number)
                      return (
                        <div key={se.id} className="px-4 py-3">
                          <div className="text-sm font-medium text-white mb-2">{se.exercises?.name}</div>
                          {sortedSets.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {sortedSets.map(s => (
                                <span key={s.id} className="text-xs bg-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1">
                                  {s.weight}kg × {s.reps}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">No sets logged</span>
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
