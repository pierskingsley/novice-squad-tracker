import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { Trophy, CheckCircle2, ChevronDown, ChevronUp, Plus, ArrowLeft } from 'lucide-react'

export default function SessionEdit() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [allExercises, setAllExercises] = useState([])
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [addingExercise, setAddingExercise] = useState(false)
  const [exerciseMap, setExerciseMap] = useState({})
  const [exerciseOrder, setExerciseOrder] = useState([])
  const [inputs, setInputs] = useState({})
  const [savedSets, setSavedSets] = useState({})
  const [setCount, setSetCount] = useState({})
  const [expanded, setExpanded] = useState({})
  const [prBadges, setPrBadges] = useState({})
  const [totalTonnage, setTotalTonnage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingSet, setSavingSet] = useState({})
  const [error, setError] = useState('')

  const recalcTonnage = useCallback((savedSetsSnapshot) => {
    let total = 0
    for (const setsByNum of Object.values(savedSetsSnapshot)) {
      for (const s of Object.values(setsByNum)) {
        if (s) total += s.weight * s.reps
      }
    }
    setTotalTonnage(Math.round(total * 10) / 10)
  }, [])

  useEffect(() => {
    if (user && id) load()
  }, [user, id])

  async function load() {
    setLoading(true); setError('')
    try {
      const [{ data: sess, error: se }, { data: exList }] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', id).eq('athlete_id', user.id).single(),
        supabase.from('exercises').select('id, name, category').order('name'),
      ])
      if (se) throw se
      setSession(sess); setAllExercises(exList || [])
      // Auto-complete past sessions so they count in history
      if (sess && !sess.completed_at && sess.date < new Date().toISOString().split('T')[0]) {
        supabase.from('sessions').update({ completed_at: `${sess.date}T23:59:59.000Z` }).eq('id', sess.id)
      }
      const { data: seRows } = await supabase.from('session_exercises').select('*, exercises(id, name)').eq('session_id', id).order('order_index')
      if (!seRows || seRows.length === 0) return
      const seIds = seRows.map(s => s.id)
      const { data: existingSets } = await supabase.from('sets').select('*').in('session_exercise_id', seIds)
      const newExMap = {}, newExOrder = [], newInputs = {}, newSaved = {}, newSetCount = {}, newExpanded = {}
      for (const se of seRows) {
        newExMap[se.id] = { sessionExercise: se, exercise: se.exercises }
        newExOrder.push(se.id); newExpanded[se.id] = true
        const setsForThis = existingSets?.filter(s => s.session_exercise_id === se.id) || []
        const numSets = Math.max(3, setsForThis.length)
        newSetCount[se.id] = numSets; newInputs[se.id] = {}; newSaved[se.id] = {}
        for (let n = 1; n <= numSets; n++) {
          const saved = setsForThis.find(s => s.set_number === n)
          newSaved[se.id][n] = saved ? { id: saved.id, weight: saved.weight, reps: saved.reps } : null
          newInputs[se.id][n] = { weight: saved ? String(saved.weight) : '', reps: saved ? String(saved.reps) : '' }
        }
      }
      setExerciseMap(newExMap); setExerciseOrder(newExOrder); setInputs(newInputs)
      setSavedSets(newSaved); setSetCount(newSetCount); setExpanded(newExpanded)
      recalcTonnage(newSaved)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function addExercise() {
    if (!selectedExerciseId) return
    setAddingExercise(true)
    try {
      const { data: newSE, error: ie } = await supabase
        .from('session_exercises')
        .insert({ session_id: id, exercise_id: selectedExerciseId, order_index: exerciseOrder.length, notes: '' })
        .select('*, exercises(id, name)').single()
      if (ie) throw ie
      const seId = newSE.id
      setExerciseMap(prev => ({ ...prev, [seId]: { sessionExercise: newSE, exercise: newSE.exercises } }))
      setExerciseOrder(prev => [...prev, seId])
      setSetCount(prev => ({ ...prev, [seId]: 3 }))
      setExpanded(prev => ({ ...prev, [seId]: true }))
      setSavedSets(prev => ({ ...prev, [seId]: { 1: null, 2: null, 3: null } }))
      setInputs(prev => ({ ...prev, [seId]: { 1: { weight: '', reps: '' }, 2: { weight: '', reps: '' }, 3: { weight: '', reps: '' } } }))
      setSelectedExerciseId('')
    } catch (err) { setError(err.message) }
    finally { setAddingExercise(false) }
  }

  function addSet(seId) {
    const n = (setCount[seId] || 3) + 1
    setSetCount(prev => ({ ...prev, [seId]: n }))
    setSavedSets(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: null } }))
    setInputs(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: { weight: '', reps: '' } } }))
  }

  function updateInput(seId, n, field, value) {
    setInputs(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: { ...prev[seId][n], [field]: value } } }))
  }

  async function logSet(seId, n) {
    const { weight: wStr, reps: rStr } = inputs[seId]?.[n] || {}
    const weight = parseFloat(wStr), reps = parseInt(rStr)
    if (!weight || !reps || isNaN(weight) || isNaN(reps)) return
    const key = `${seId}-${n}`
    setSavingSet(prev => ({ ...prev, [key]: true }))
    try {
      const existing = savedSets[seId]?.[n]
      let setRow
      if (existing?.id) {
        const { data } = await supabase.from('sets').update({ weight, reps, completed_at: new Date().toISOString() }).eq('id', existing.id).select().single()
        setRow = data
      } else {
        const { data } = await supabase.from('sets').insert({ session_exercise_id: seId, set_number: n, weight, reps }).select().single()
        setRow = data
      }
      const newSaved = { ...savedSets, [seId]: { ...savedSets[seId], [n]: { id: setRow.id, weight: setRow.weight, reps: setRow.reps } } }
      setSavedSets(newSaved); recalcTonnage(newSaved)
      let t = 0
      for (const sets of Object.values(newSaved)) for (const s of Object.values(sets)) if (s) t += s.weight * s.reps
      supabase.from('sessions').update({ total_tonnage: Math.round(t * 10) / 10 }).eq('id', id)
      const exData = exerciseMap[seId]
      if (exData) {
        const exerciseId = exData.exercise.id
        const { data: pb } = await supabase.from('personal_bests').select('weight').eq('athlete_id', user.id).eq('exercise_id', exerciseId).maybeSingle()
        if (!pb || weight > pb.weight) {
          await supabase.from('personal_bests').upsert({ athlete_id: user.id, exercise_id: exerciseId, weight, reps, achieved_at: new Date().toISOString(), set_id: setRow.id }, { onConflict: 'athlete_id,exercise_id' })
          setPrBadges(prev => ({ ...prev, [seId]: true }))
        }
      }
    } catch (err) { console.error('Error logging set:', err) }
    finally { setSavingSet(prev => ({ ...prev, [key]: false })) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  if (error) return (
    <div className="px-4 pt-16 text-center">
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-vesta-red text-sm">Go back</button>
    </div>
  )

  const sessionDate = session
    ? new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const completedSets = Object.values(savedSets).reduce((sum, sets) => sum + Object.values(sets).filter(Boolean).length, 0)
  const totalSets = Object.values(setCount).reduce((sum, n) => sum + n, 0)

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{sessionDate}</p>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Edit session</h1>
        </div>
      </div>

      {exerciseOrder.length > 0 && (
        <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between mb-5 border border-slate-200 shadow-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">{completedSets}<span className="text-slate-300 text-sm font-normal">/{totalSets}</span></div>
            <div className="text-xs text-slate-400">Sets</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-lg font-bold text-vesta-red">{totalTonnage >= 1000 ? `${(totalTonnage / 1000).toFixed(1)}t` : `${totalTonnage}kg`}</div>
            <div className="text-xs text-slate-400">Tonnage</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">{exerciseOrder.length}</div>
            <div className="text-xs text-slate-400">Exercises</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500 mb-2">Add exercise</p>
        <div className="flex gap-2">
          <select value={selectedExerciseId} onChange={e => setSelectedExerciseId(e.target.value)}
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-vesta-red transition-colors">
            <option value="">Select exercise...</option>
            {allExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
          <button onClick={addExercise} disabled={!selectedExerciseId || addingExercise}
            className="bg-vesta-red hover:bg-vesta-red-dark disabled:opacity-40 text-white font-bold px-4 rounded-xl text-sm transition-colors flex items-center gap-1.5">
            {addingExercise ? <Spinner size="sm" /> : <Plus size={16} />} Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {exerciseOrder.map(seId => {
          const { exercise } = exerciseMap[seId] || {}
          if (!exercise) return null
          const numSets = setCount[seId] || 3
          const setNums = Array.from({ length: numSets }, (_, i) => i + 1)
          const isExpanded = expanded[seId] ?? true
          const isPR = prBadges[seId]
          return (
            <div key={seId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <button onClick={() => setExpanded(prev => ({ ...prev, [seId]: !prev[seId] }))}
                className="w-full px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-900">{exercise.name}</span>
                  {isPR && <span className="flex items-center gap-1 bg-vesta-red text-white text-xs font-bold px-2 py-0.5 rounded-full"><Trophy size={10} /> PR</span>}
                </div>
                <div className="text-slate-400">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 px-1">
                    <span className="text-xs text-slate-400 text-center">#</span>
                    <span className="text-xs text-slate-400 text-center">kg</span>
                    <span className="text-xs text-slate-400 text-center">reps</span>
                    <span />
                  </div>
                  {setNums.map(n => {
                    const isSaved = !!savedSets[seId]?.[n]
                    const isSaving = savingSet[`${seId}-${n}`]
                    const inp = inputs[seId]?.[n] || { weight: '', reps: '' }
                    return (
                      <div key={n} className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 items-center">
                        <span className="text-xs font-mono text-center">
                          {isSaved ? <CheckCircle2 size={14} className="mx-auto text-vesta-red" /> : <span className="text-slate-400">{n}</span>}
                        </span>
                        <input type="number" inputMode="decimal" value={inp.weight} onChange={e => updateInput(seId, n, 'weight', e.target.value)} placeholder="kg"
                          className={`bg-slate-100 rounded-lg px-2 py-2.5 text-sm text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all w-full ${isSaved ? 'focus:ring-vesta-red/50 ring-1 ring-vesta-red/30' : 'focus:ring-slate-300'}`} />
                        <input type="number" inputMode="numeric" value={inp.reps} onChange={e => updateInput(seId, n, 'reps', e.target.value)} placeholder="reps"
                          className={`bg-slate-100 rounded-lg px-2 py-2.5 text-sm text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all w-full ${isSaved ? 'focus:ring-vesta-red/50 ring-1 ring-vesta-red/30' : 'focus:ring-slate-300'}`} />
                        <button onClick={() => logSet(seId, n)} disabled={isSaving || !inp.weight || !inp.reps}
                          className={`h-9 w-full rounded-lg text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center ${isSaved ? 'bg-vesta-red/10 text-vesta-red hover:bg-vesta-red/20' : 'bg-vesta-red text-white hover:bg-vesta-red-dark'}`}>
                          {isSaving ? <Spinner size="sm" /> : isSaved ? '✓' : 'Log'}
                        </button>
                      </div>
                    )
                  })}
                  <button onClick={() => addSet(seId)}
                    className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 hover:border-slate-400 transition-colors flex items-center justify-center gap-1">
                    <Plus size={12} /> Add set
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
