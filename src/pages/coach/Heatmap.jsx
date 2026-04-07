import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

const DAYS = 28

function getDayLabels() {
  const labels = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    labels.push(d.toISOString().split('T')[0])
  }
  return labels
}

export default function Heatmap() {
  const [athletes, setAthletes] = useState([])
  const [trainingDays, setTrainingDays] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (DAYS - 1))
    const cutoffStr = cutoff.toISOString().split('T')[0]

    const [{ data: profileData }, { data: sessData }] = await Promise.all([
      supabase.from('profiles').select('id, name').eq('role', 'ATHLETE').order('name'),
      supabase.from('sessions')
        .select('athlete_id, date')
        .not('completed_at', 'is', null)
        .gte('date', cutoffStr),
    ])

    const map = {}
    for (const s of sessData || []) {
      if (!map[s.athlete_id]) map[s.athlete_id] = new Set()
      map[s.athlete_id].add(s.date)
    }

    setAthletes(profileData || [])
    setTrainingDays(map)
    setLoading(false)
  }

  const days = getDayLabels()

  const monthGroups = []
  let lastMonth = null
  for (const d of days) {
    const month = new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })
    if (month !== lastMonth) { monthGroups.push({ month, start: d }); lastMonth = month }
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Squad Heatmap</h1>
      <p className="text-xs text-slate-400 mb-5">Last {DAYS} days of training activity</p>

      {athletes.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-16">No athletes yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-slate-400 font-medium whitespace-nowrap w-24">Athlete</th>
                  {days.map(d => {
                    const date = new Date(d + 'T00:00:00')
                    const isMonday = date.getDay() === 1
                    const dayNum = date.getDate()
                    return (
                      <th key={d} className={`px-0.5 py-2 text-center font-normal ${isMonday ? 'text-slate-500' : 'text-slate-300'}`}>
                        {isMonday ? dayNum : ''}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {athletes.map(athlete => {
                  const trained = trainingDays[athlete.id] || new Set()
                  const count = trained.size
                  return (
                    <tr key={athlete.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                        <div>{athlete.name.split(' ')[0]}</div>
                        <div className="text-slate-400 font-normal">{count} session{count !== 1 ? 's' : ''}</div>
                      </td>
                      {days.map(d => {
                        const didTrain = trained.has(d)
                        const isToday = d === new Date().toISOString().split('T')[0]
                        return (
                          <td key={d} className="px-0.5 py-2">
                            <div className={`w-5 h-5 rounded-sm mx-auto transition-colors ${
                              didTrain
                                ? 'bg-vesta-red'
                                : isToday
                                ? 'bg-slate-200 ring-1 ring-slate-300'
                                : 'bg-slate-100'
                            }`} />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 border-t border-slate-100">
            <span className="text-xs text-slate-400">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-vesta-red" />
              <span className="text-xs text-slate-500">Trained</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-slate-100" />
              <span className="text-xs text-slate-500">Rest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
