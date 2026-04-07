import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import { ChevronRight, Users } from 'lucide-react'

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime()
  return Math.floor(diff / 86400000)
}

function lastSeenLabel(dateStr) {
  const d = daysSince(dateStr)
  if (d === Infinity) return 'Never trained'
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function StatusDot({ days }) {
  if (days === Infinity) return <span className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
  if (days >= 3) return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
  if (days >= 2) return <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
  return <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
}

export default function Squad() {
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'ATHLETE')
      .order('name')

    if (!profiles || profiles.length === 0) {
      setAthletes([])
      setLoading(false)
      return
    }

    const ids = profiles.map(a => a.id)

    // Get Monday of current week
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const weekStart = monday.toISOString().split('T')[0]

    // Fetch last 30 days of sessions for all athletes
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const { data: sessions } = await supabase
      .from('sessions')
      .select('athlete_id, date, total_tonnage')
      .in('athlete_id', ids)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false })

    // Compute stats per athlete
    const stats = {}
    for (const sess of sessions || []) {
      if (!stats[sess.athlete_id]) {
        stats[sess.athlete_id] = { lastDate: sess.date, weekTonnage: 0 }
      }
      if (sess.date >= weekStart) {
        stats[sess.athlete_id].weekTonnage += sess.total_tonnage || 0
      }
    }

    const enriched = profiles.map(a => ({
      ...a,
      lastDate: stats[a.id]?.lastDate ?? null,
      weekTonnage: Math.round((stats[a.id]?.weekTonnage || 0) * 10) / 10,
      days: daysSince(stats[a.id]?.lastDate ?? null),
    }))

    // Sort: needs attention (3+ days) first, then by days desc
    enriched.sort((a, b) => {
      const aAlert = a.days >= 3
      const bAlert = b.days >= 3
      if (aAlert !== bAlert) return aAlert ? -1 : 1
      return b.days - a.days
    })

    setAthletes(enriched)
    setLoading(false)
  }

  const needsAttention = athletes.filter(a => a.days >= 3).length
  const activeThisWeek = athletes.filter(a => a.days < 7 && a.days !== Infinity).length

  if (loading) {
    return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold text-white mb-5">Squad</h1>

      {athletes.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No athletes yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Athletes will appear here once they create accounts.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3 text-center">
              <div className="text-xl font-bold text-white">{athletes.length}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Athletes</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3 text-center">
              <div className="text-xl font-bold text-emerald-500">{activeThisWeek}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Active</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3 text-center">
              <div className="text-xl font-bold text-red-500">{needsAttention}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Attention</div>
            </div>
          </div>

          {/* Athlete list */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/60">
            {athletes.map(athlete => (
              <button
                key={athlete.id}
                onClick={() => navigate(`/coach/squad/${athlete.id}`)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusDot days={athlete.days} />
                  <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-zinc-300">
                      {athlete.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{athlete.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{lastSeenLabel(athlete.lastDate)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  {athlete.weekTonnage > 0 && (
                    <div className="text-right">
                      <div className="text-xs font-semibold text-amber-500">
                        {athlete.weekTonnage >= 1000
                          ? `${(athlete.weekTonnage / 1000).toFixed(1)}t`
                          : `${athlete.weekTonnage}kg`}
                      </div>
                      <div className="text-xs text-zinc-600">this week</div>
                    </div>
                  )}
                  <ChevronRight size={16} className="text-zinc-600" />
                </div>
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500">0–1 days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-zinc-500">2 days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-zinc-500">3+ days</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
