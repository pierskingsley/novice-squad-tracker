import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Spinner from '../../components/ui/Spinner'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { TrendingUp, ChevronDown, RotateCcw } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

function getChartStyle(isDark) {
  return {
    cartesian: { strokeDasharray: '3 3', stroke: isDark ? '#3F3F46' : '#E2E8F0' },
    axis: { stroke: isDark ? '#52525B' : '#CBD5E1', tick: { fill: isDark ? '#71717A' : '#94A3B8', fontSize: 10 } },
    tooltip: {
      contentStyle: {
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        border: `1px solid ${isDark ? '#3F3F46' : '#E2E8F0'}`,
        borderRadius: '10px',
        fontSize: 12,
      },
      labelStyle: { color: isDark ? '#A1A1AA' : '#64748B' },
    },
  }
}

function CustomDot(props) {
  const { cx, cy, value } = props
  if (!value) return null
  return <circle cx={cx} cy={cy} r={3} fill="#C8102E" stroke="#C8102E" />
}

function CustomDotNavy(props) {
  const { cx, cy, value } = props
  if (!value) return null
  return <circle cx={cx} cy={cy} r={3} fill="#003087" stroke="#003087" />
}

export default function Progress() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [exercises, setExercises] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [maxWeightData, setMaxWeightData] = useState([])
  const [tonnageData, setTonnageData] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)

  const loadExercises = useCallback(async () => {
    setLoading(true)
    const { data: sessData } = await supabase
      .from('sessions')
      .select('id')
      .eq('athlete_id', user.id)
      .not('completed_at', 'is', null)

    const sessIds = (sessData || []).map(s => s.id)
    if (sessIds.length === 0) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('session_exercises')
      .select('exercise_id, exercises(id, name)')
      .in('session_id', sessIds)

    const seen = new Set()
    const unique = []
    for (const row of data || []) {
      if (!seen.has(row.exercise_id) && row.exercises) {
        seen.add(row.exercise_id)
        unique.push(row.exercises)
      }
    }
    unique.sort((a, b) => a.name.localeCompare(b.name))
    setExercises(unique)
    if (unique.length > 0) setSelectedId(unique[0].id)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) loadExercises()
  }, [user])

  useEffect(() => {
    if (selectedId) loadChartData(selectedId)
  }, [selectedId])

  const { pullDistance, refreshing, isTriggered, handlers: ptrHandlers } = usePullToRefresh(loadExercises)

  async function loadChartData(exerciseId) {
    setChartLoading(true)
    const { data: sessData } = await supabase
      .from('sessions')
      .select('id, date')
      .eq('athlete_id', user.id)
      .not('completed_at', 'is', null)
      .order('date', { ascending: true })

    if (!sessData || sessData.length === 0) {
      setMaxWeightData([])
      setTonnageData([])
      setChartLoading(false)
      return
    }

    const sessIds = sessData.map(s => s.id)
    const sessDateMap = Object.fromEntries(sessData.map(s => [s.id, s.date]))

    const { data: seData } = await supabase
      .from('session_exercises')
      .select('id, session_id')
      .eq('exercise_id', exerciseId)
      .in('session_id', sessIds)

    if (!seData || seData.length === 0) {
      setMaxWeightData([])
      setTonnageData([])
      setChartLoading(false)
      return
    }

    const seIds = seData.map(s => s.id)
    const seSessionMap = Object.fromEntries(seData.map(s => [s.id, s.session_id]))

    const { data: setsData } = await supabase
      .from('sets')
      .select('session_exercise_id, weight, reps')
      .in('session_exercise_id', seIds)

    const bySession = {}
    for (const row of setsData || []) {
      const sessId = seSessionMap[row.session_exercise_id]
      const date = sessDateMap[sessId]
      if (!date) continue
      if (!bySession[date]) {
        bySession[date] = { date, maxWeight: 0, totalTonnage: 0 }
      }
      bySession[date].maxWeight = Math.max(bySession[date].maxWeight, row.weight)
      bySession[date].totalTonnage += row.weight * row.reps
    }

    const sorted = Object.values(bySession).sort((a, b) => a.date.localeCompare(b.date))
    const formatDate = d => {
      const [, m, day] = d.split('-')
      return `${day}/${m}`
    }

    setMaxWeightData(sorted.map(r => ({ date: formatDate(r.date), weight: r.maxWeight })))
    setTonnageData(sorted.map(r => ({ date: formatDate(r.date), tonnage: Math.round(r.totalTonnage) })))
    setChartLoading(false)
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-5">Progress</h1>

      {exercises.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No completed sessions yet.</p>
          <p className="text-slate-400 text-xs mt-1">Finish a session to see your progress charts.</p>
        </div>
      ) : (
        <>
          {/* Exercise picker */}
          <div className="relative mb-6">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 pr-10 text-slate-900 dark:text-slate-50 text-sm appearance-none focus:outline-none focus:border-vesta-red transition-colors cursor-pointer shadow-sm"
            >
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {chartLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : maxWeightData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No data for this exercise yet.</div>
          ) : (
            <div className="space-y-5">
              {/* Max weight chart */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Max Weight</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">Heaviest set per session (kg)</div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={maxWeightData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C8102E" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...getChartStyle(isDark).cartesian} />
                    <XAxis dataKey="date" {...getChartStyle(isDark).axis} />
                    <YAxis {...getChartStyle(isDark).axis} />
                    <Tooltip
                      {...getChartStyle(isDark).tooltip}
                      formatter={(v) => [`${v}kg`, 'Max weight']}
                    />
                    {maxWeightData.length > 0 && (
                      <ReferenceLine
                        y={Math.max(...maxWeightData.map(d => d.weight))}
                        stroke="#C8102E"
                        strokeDasharray="4 4"
                        strokeOpacity={0.4}
                        label={{ value: 'PB', position: 'insideTopRight', fill: '#C8102E', fontSize: 10, opacity: 0.6 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#C8102E"
                      strokeWidth={2}
                      fill="url(#gradRed)"
                      dot={<CustomDot />}
                      activeDot={{ r: 5, fill: '#C8102E' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Tonnage chart */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Tonnage</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">Total volume per session for this exercise (kg)</div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={tonnageData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="gradNavy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#003087" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#003087" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...getChartStyle(isDark).cartesian} />
                    <XAxis dataKey="date" {...getChartStyle(isDark).axis} />
                    <YAxis {...getChartStyle(isDark).axis} />
                    <Tooltip
                      {...getChartStyle(isDark).tooltip}
                      formatter={(v) => [`${v}kg`, 'Tonnage']}
                    />
                    {tonnageData.length > 0 && (
                      <ReferenceLine
                        y={Math.max(...tonnageData.map(d => d.tonnage))}
                        stroke="#003087"
                        strokeDasharray="4 4"
                        strokeOpacity={0.4}
                        label={{ value: 'PB', position: 'insideTopRight', fill: '#003087', fontSize: 10, opacity: 0.6 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="tonnage"
                      stroke="#003087"
                      strokeWidth={2}
                      fill="url(#gradNavy)"
                      dot={<CustomDotNavy />}
                      activeDot={{ r: 5, fill: '#003087' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
