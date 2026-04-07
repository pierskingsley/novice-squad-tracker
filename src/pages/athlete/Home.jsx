import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { TODAY } from '../../lib/constants'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import SwipeToDelete from '../../components/ui/SwipeToDelete'
import { useToast } from '../../context/ToastContext'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { Trophy, CheckCircle2, ChevronDown, ChevronUp, Plus, Zap, Pencil, CalendarPlus, Trash2, Share, X, Download, RotateCcw } from 'lucide-react'
import confetti from 'canvas-confetti'

const CHARLOTTE_EXERCISE = "Charlotte Clover's Special Deadlift"
const ZOE_EXERCISE = "Zoe's Overhead Press"

function fireConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#C8102E', '#003087', '#ffffff', '#FFD700'] })
}

function fireTonneClub() {
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#C8102E', '#003087', '#FFD700'] })
  setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 60, origin: { x: 0, y: 0.6 } }), 200)
  setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1, y: 0.6 } }), 200)
}

function PastSessionsList({ sessions, onEdit, onDelete, onAddDate, addingDate }) {
  const [pickedDate, setPickedDate] = useState('')

  return (
    <div className="mt-8 mb-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Past sessions</h2>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-3 shadow-sm">
        <p className="text-xs font-medium text-slate-500 mb-2">Log a missed session</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={pickedDate}
            max={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
            onChange={e => setPickedDate(e.target.value)}
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-vesta-red transition-colors"
          />
          <button
            onClick={() => { if (pickedDate) onAddDate(pickedDate) }}
            disabled={!pickedDate || addingDate}
            className="bg-vesta-red hover:bg-vesta-red-dark disabled:opacity-40 text-white font-bold px-4 rounded-xl text-sm transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            {addingDate ? <Spinner size="sm" /> : <CalendarPlus size={16} />}
            Go
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sessions.map(sess => {
          const exNames = (sess.session_exercises || []).map(se => se.exercises?.name).filter(Boolean)
          const label = new Date(sess.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          return (
            <div key={sess.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900">{label}</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">
                  {exNames.length > 0 ? exNames.join(', ') : 'No exercises'}
                  {sess.total_tonnage > 0 && ` · ${sess.total_tonnage}kg`}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                <button onClick={() => onEdit(sess.id)} className="flex items-center gap-1 text-xs text-vesta-red font-medium">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => onDelete(sess.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ExercisePicker({ exercises, onSelect, adding }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const categories = [...new Set(exercises.map(e => e.category).filter(Boolean))]
  const filtered = activeCategory ? exercises.filter(e => e.category === activeCategory) : exercises

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
        <button onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${!activeCategory ? 'bg-vesta-red text-white' : 'bg-slate-100 text-slate-500'}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${activeCategory === cat ? 'bg-vesta-red text-white' : 'bg-slate-100 text-slate-500'}`}>{cat}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => onSelect(ex.id)} disabled={adding}
            className="px-3.5 py-2.5 bg-slate-100 active:bg-vesta-red active:text-white rounded-xl text-sm text-slate-700 font-medium transition-colors disabled:opacity-40 select-none">
            {adding ? <Spinner size="sm" /> : ex.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [session, setSession] = useState(null)
  const [allExercises, setAllExercises] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [addingExercise, setAddingExercise] = useState(false)
  const [exerciseMap, setExerciseMap] = useState({})
  const [exerciseOrder, setExerciseOrder] = useState([])
  const [inputs, setInputs] = useState({})
  const [savedSets, setSavedSets] = useState({})
  const [expanded, setExpanded] = useState({})
  const [prBadges, setPrBadges] = useState({})
  const [prevSets, setPrevSets] = useState({})
  const [totalTonnage, setTotalTonnage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingSet, setSavingSet] = useState({})
  const [showFinish, setShowFinish] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [pastSessions, setPastSessions] = useState([])
  const [addingDate, setAddingDate] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesDirty, setNotesDirty] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [iosHintDismissed, setIosHintDismissed] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmDeletePastId, setConfirmDeletePastId] = useState(null)

  const inputRefs = useRef({})
  const today = TODAY()

  const recalcTonnage = useCallback((savedSetsSnapshot) => {
    let total = 0
    for (const setsByNum of Object.values(savedSetsSnapshot)) {
      for (const s of Object.values(setsByNum)) {
        if (s) total += s.weight * s.reps
      }
    }
    setTotalTonnage(Math.round(total * 10) / 10)
  }, [])

  useEffect(() => { if (user) load() }, [user])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  async function load() {
    setLoading(true); setError('')
    try {
      const [{ data: exList }, { data: existingSess }, { data: past }] = await Promise.all([
        supabase.from('exercises').select('id, name, category').order('name'),
        supabase.from('sessions').select('*').eq('athlete_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('sessions')
          .select('id, date, total_tonnage, session_exercises(id, exercises(name))')
          .eq('athlete_id', user.id).neq('date', today).order('date', { ascending: false }).limit(20),
      ])
      setAllExercises(exList || [])
      setPastSessions(past || [])
      if (!existingSess) { setLoading(false); return }
      setSession(existingSess)
      setNotes(existingSess.notes || '')
      if (existingSess.completed_at) setFinished(true)
      const pastIds = (past || []).map(s => s.id)
      await loadSessionExercises(existingSess.id, pastIds)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function fetchLastTimeSets(exerciseIds, pastSessionIds) {
    if (!exerciseIds.length || !pastSessionIds.length) return {}
    const { data: prevSERows } = await supabase
      .from('session_exercises').select('id, exercise_id, session_id')
      .in('exercise_id', exerciseIds).in('session_id', pastSessionIds)
    if (!prevSERows?.length) return {}
    const latestSEByExercise = {}
    for (const exId of exerciseIds) {
      const matches = prevSERows.filter(r => r.exercise_id === exId)
      if (!matches.length) continue
      matches.sort((a, b) => pastSessionIds.indexOf(a.session_id) - pastSessionIds.indexOf(b.session_id))
      latestSEByExercise[exId] = matches[0]
    }
    const prevSEIds = Object.values(latestSEByExercise).map(r => r.id)
    if (!prevSEIds.length) return {}
    const { data: prevSetRows } = await supabase.from('sets').select('*').in('session_exercise_id', prevSEIds)
    const result = {}
    for (const [exId, seRow] of Object.entries(latestSEByExercise)) {
      result[exId] = (prevSetRows || []).filter(s => s.session_exercise_id === seRow.id).sort((a, b) => a.set_number - b.set_number)
    }
    return result
  }

  async function loadSessionExercises(sessionId, pastSessionIds = []) {
    const { data: seRows } = await supabase
      .from('session_exercises').select('*, exercises(id, name)').eq('session_id', sessionId).order('order_index')
    if (!seRows || seRows.length === 0) return
    const seIds = seRows.map(s => s.id)
    const exerciseIds = seRows.map(s => s.exercise_id)
    const [{ data: existingSets }, lastTime] = await Promise.all([
      supabase.from('sets').select('*').in('session_exercise_id', seIds),
      fetchLastTimeSets(exerciseIds, pastSessionIds),
    ])
    const newExMap = {}, newExOrder = [], newInputs = {}, newSaved = {}, newExpanded = {}
    for (const se of seRows) {
      newExMap[se.id] = { sessionExercise: se, exercise: se.exercises }
      newExOrder.push(se.id)
      newExpanded[se.id] = true
      const setsForThis = existingSets?.filter(s => s.session_exercise_id === se.id) || []
      const numSets = Math.max(3, setsForThis.length)
      newInputs[se.id] = {}
      newSaved[se.id] = {}
      for (let n = 1; n <= numSets; n++) {
        const saved = setsForThis.find(s => s.set_number === n)
        newSaved[se.id][n] = saved ? { id: saved.id, weight: saved.weight, reps: saved.reps } : null
        newInputs[se.id][n] = { weight: saved ? String(saved.weight) : '', reps: saved ? String(saved.reps) : '' }
      }
    }
    setExerciseMap(newExMap); setExerciseOrder(newExOrder); setInputs(newInputs)
    setSavedSets(newSaved); setExpanded(newExpanded)
    setPrevSets(lastTime)
    recalcTonnage(newSaved)
  }

  async function addExercise(exerciseId) {
    setAddingExercise(true)
    try {
      let sess = session
      if (!sess) {
        const { data: newSess, error: se } = await supabase.from('sessions').insert({ athlete_id: user.id, date: today }).select().single()
        if (se) throw se
        sess = newSess; setSession(sess)
      }
      const { data: newSE, error: ie } = await supabase
        .from('session_exercises')
        .insert({ session_id: sess.id, exercise_id: exerciseId, order_index: exerciseOrder.length, notes: '' })
        .select('*, exercises(id, name)').single()
      if (ie) throw ie
      const seId = newSE.id
      setExerciseMap(prev => ({ ...prev, [seId]: { sessionExercise: newSE, exercise: newSE.exercises } }))
      setExerciseOrder(prev => [...prev, seId])
      setExpanded(prev => ({ ...prev, [seId]: true }))
      setSavedSets(prev => ({ ...prev, [seId]: { 1: null, 2: null, 3: null } }))
      setInputs(prev => ({ ...prev, [seId]: { 1: { weight: '', reps: '' }, 2: { weight: '', reps: '' }, 3: { weight: '', reps: '' } } }))
      setShowPicker(false)
      const pastIds = pastSessions.map(s => s.id)
      fetchLastTimeSets([exerciseId], pastIds).then(lt => {
        if (lt[exerciseId]) setPrevSets(prev => ({ ...prev, [exerciseId]: lt[exerciseId] }))
      })
    } catch (err) { setError(err.message) }
    finally { setAddingExercise(false) }
  }

  // Derive set keys from inputs rather than a separate count
  function getSetNums(seId) {
    return Object.keys(inputs[seId] || {}).map(Number).sort((a, b) => a - b)
  }

  function addSet(seId) {
    const existing = getSetNums(seId)
    const n = existing.length > 0 ? Math.max(...existing) + 1 : 1
    setSavedSets(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: null } }))
    setInputs(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: { weight: '', reps: '' } } }))
  }

  async function deleteSet(seId, n) {
    const setId = savedSets[seId]?.[n]?.id
    if (setId) await supabase.from('sets').delete().eq('id', setId)
    setSavedSets(prev => {
      const copy = { ...prev[seId] }
      delete copy[n]
      const next = { ...prev, [seId]: copy }
      recalcTonnage(next)
      return next
    })
    setInputs(prev => {
      const copy = { ...prev[seId] }
      delete copy[n]
      return { ...prev, [seId]: copy }
    })
    // Update tonnage in DB
    setTimeout(() => {
      const t = Object.values(savedSets).reduce((sum, sets) => {
        return sum + Object.values(sets).reduce((s2, s) => s2 + (s ? s.weight * s.reps : 0), 0)
      }, 0)
      if (session) supabase.from('sessions').update({ total_tonnage: Math.round(t * 10) / 10 }).eq('id', session.id)
    }, 0)
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
      supabase.from('sessions').update({ total_tonnage: Math.round(t * 10) / 10 }).eq('id', session.id)

      const exData = exerciseMap[seId]
      let isPR = false
      if (exData) {
        const exerciseId = exData.exercise.id
        const { data: pb } = await supabase.from('personal_bests').select('weight').eq('athlete_id', user.id).eq('exercise_id', exerciseId).maybeSingle()
        if (!pb || weight > pb.weight) {
          await supabase.from('personal_bests').upsert({ athlete_id: user.id, exercise_id: exerciseId, weight, reps, achieved_at: new Date().toISOString(), set_id: setRow.id }, { onConflict: 'athlete_id,exercise_id' })
          setPrBadges(prev => ({ ...prev, [seId]: true }))
          isPR = true
          showToast(`🏆 New PR — ${exData.exercise.name}!`, 'pr')
        }
        if (exData.exercise.name === CHARLOTTE_EXERCISE) fireConfetti()
        if (exData.exercise.name === ZOE_EXERCISE) {
          showToast('Wow, du bist so stark! 💪', 'german')
          if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 80])
        }
      }
      if (!isPR) showToast('Set logged')
    } catch (err) { console.error('Error logging set:', err) }
    finally { setSavingSet(prev => ({ ...prev, [key]: false })) }
  }

  async function deleteExercise(seId) {
    const { error } = await supabase.from('session_exercises').delete().eq('id', seId)
    if (error) {
      showToast('Failed to remove exercise — try again', 'error')
      setConfirmDeleteId(null)
      return
    }
    setExerciseOrder(prev => prev.filter(id => id !== seId))
    setExerciseMap(prev => { const n = { ...prev }; delete n[seId]; return n })
    setInputs(prev => { const n = { ...prev }; delete n[seId]; return n })
    setExpanded(prev => { const n = { ...prev }; delete n[seId]; return n })
    setSavedSets(prev => { const n = { ...prev }; delete n[seId]; recalcTonnage(n); return n })
    setConfirmDeleteId(null)
    showToast('Exercise removed')
  }

  async function saveNotes() {
    if (!session) return
    setSavingNotes(true)
    await supabase.from('sessions').update({ notes }).eq('id', session.id)
    setSavingNotes(false)
    setNotesDirty(false)
    setNotesSaved(true)
    if (navigator.vibrate) navigator.vibrate(15)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  async function deletePastSession(sessId) {
    const { error } = await supabase.from('sessions').delete().eq('id', sessId)
    if (error) { showToast('Could not delete session — try again', 'error'); return }
    setPastSessions(prev => prev.filter(s => s.id !== sessId))
    setConfirmDeletePastId(null)
    showToast('Session deleted')
  }

  async function handleAddDate(date) {
    setAddingDate(true)
    try {
      const { data: existing } = await supabase.from('sessions').select('id').eq('athlete_id', user.id).eq('date', date).maybeSingle()
      if (existing) { navigate(`/athlete/session/${existing.id}`); return }
      const { data: newSess, error } = await supabase.from('sessions').insert({ athlete_id: user.id, date, completed_at: `${date}T23:59:59.000Z` }).select().single()
      if (error) throw error
      navigate(`/athlete/session/${newSess.id}`)
    } catch (err) { console.error(err) }
    finally { setAddingDate(false) }
  }

  async function finishSession() {
    setFinishing(true)
    try {
      await supabase.from('sessions').update({ completed_at: new Date().toISOString(), total_tonnage: totalTonnage }).eq('id', session.id)
      if (navigator.vibrate) navigator.vibrate([30, 50, 30])
      if (totalTonnage >= 1000) setTimeout(fireTonneClub, 300)
      setFinished(true); setShowFinish(false)
      showToast('Session complete 🎉')
    } catch (err) { setError(err.message) }
    finally { setFinishing(false) }
  }

  const completedSets = Object.values(savedSets).reduce((sum, sets) => sum + Object.values(sets).filter(Boolean).length, 0)
  const totalSets = Object.values(inputs).reduce((sum, seInputs) => sum + Object.keys(seInputs).length, 0)

  const firstName = profile?.name?.trim().split(' ')[0] || ''
  const prCount = Object.values(prBadges).filter(Boolean).length
  const congratsMessages = prCount > 0
    ? [`${prCount} new personal record${prCount > 1 ? 's' : ''}. That's what it's about.`]
    : totalTonnage >= 2000
    ? [`${(totalTonnage / 1000).toFixed(1)} tonnes moved. Serious work today.`]
    : ['Consistency is everything. Well done.', 'Another one in the books. Keep showing up.', 'Good session. Progress is progress.']
  const congratsMsg = congratsMessages[new Date().getDay() % congratsMessages.length]

  const isIOS = /iphone|ipad|ipod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const isStandalone = typeof window !== 'undefined' && window.navigator.standalone === true

  const { pullDistance, refreshing, isTriggered, handlers: ptrHandlers } = usePullToRefresh(load)

  if (loading && !refreshing) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  if (error) return (
    <div className="px-4 pt-16 text-center">
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={load} className="mt-4 text-vesta-red text-sm">Retry</button>
    </div>
  )

  if (finished) return (
    <div className="px-4 pt-12 pb-24">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-vesta-red/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-vesta-red" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{firstName ? `Nice work, ${firstName}!` : 'Session complete'}</h1>
        <p className="text-slate-500 text-sm mb-1">{congratsMsg}</p>
        <p className="text-xs text-slate-400 mb-4">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <button onClick={() => navigate(`/athlete/session/${session.id}`)} className="flex items-center gap-1.5 text-xs text-vesta-red font-medium mx-auto">
          <Pencil size={13} /> Edit session
        </button>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-slate-200 mb-4 shadow-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl font-bold text-vesta-red">{completedSets}</div><div className="text-xs text-slate-400 mt-0.5">Sets done</div></div>
          <div><div className="text-2xl font-bold text-slate-900">{totalTonnage >= 1000 ? `${(totalTonnage / 1000).toFixed(1)}t` : `${totalTonnage}kg`}</div><div className="text-xs text-slate-400 mt-0.5">Tonnage</div></div>
          <div><div className="text-2xl font-bold text-slate-900">{exerciseOrder.length}</div><div className="text-xs text-slate-400 mt-0.5">Exercises</div></div>
        </div>
      </div>
      {totalTonnage >= 1000 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1"><span className="text-xl">🏋️</span><span className="text-amber-800 font-bold text-sm">Tonne Club</span></div>
          <p className="text-amber-700 text-xs">You moved over a tonne today. That's elite.</p>
        </div>
      )}
      {prCount > 0 && (
        <div className="bg-vesta-red/5 border border-vesta-red/20 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2"><Trophy size={16} className="text-vesta-red" /><span className="text-vesta-red font-semibold text-sm">Personal Records</span></div>
          <ul className="space-y-1">{exerciseOrder.filter(seId => prBadges[seId]).map(seId => <li key={seId} className="text-slate-900 text-sm">{exerciseMap[seId]?.exercise?.name}</li>)}</ul>
        </div>
      )}
      <PastSessionsList sessions={pastSessions} onEdit={id => navigate(`/athlete/session/${id}`)} onDelete={id => setConfirmDeletePastId(id)} onAddDate={handleAddDate} addingDate={addingDate} />

      <Modal open={!!confirmDeletePastId} onClose={() => setConfirmDeletePastId(null)} title="Delete session?">
        <p className="text-slate-500 text-sm mb-5">This will permanently delete this session and all its logged sets. This can't be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeletePastId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 transition-colors">Cancel</button>
          <button onClick={() => deletePastSession(confirmDeletePastId)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white transition-colors">Delete</button>
        </div>
      </Modal>
    </div>
  )

  return (
    <div {...ptrHandlers} className="px-4 pt-6 pb-28">
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-150"
          style={{ height: pullDistance, marginTop: -pullDistance, marginBottom: pullDistance }}
        >
          <div className={`transition-all duration-150 ${isTriggered || refreshing ? 'text-vesta-red' : 'text-slate-300'}`}>
            {refreshing
              ? <Spinner size="sm" />
              : <RotateCcw size={18} className={isTriggered ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
            }
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-2xl font-bold text-slate-900">{profile?.name ? `Welcome back, ${profile.name.trim().split(' ')[0]}` : "Today's session"}</h1>
        </div>
        {installPrompt && (
          <button onClick={handleInstall} className="flex items-center gap-1.5 bg-vesta-navy text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm flex-shrink-0 mt-1">
            <Download size={13} /> Add to phone
          </button>
        )}
      </div>

      {isIOS && !isStandalone && !iosHintDismissed && (
        <div className="bg-vesta-navy/5 border border-vesta-navy/20 rounded-2xl px-4 py-3 mb-5 flex items-start gap-3">
          <Share size={16} className="text-vesta-navy flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-vesta-navy mb-0.5">Add to your home screen</p>
            <p className="text-xs text-slate-500">Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.</p>
          </div>
          <button onClick={() => setIosHintDismissed(true)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"><X size={15} /></button>
        </div>
      )}

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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
        {!showPicker ? (
          <button onClick={() => setShowPicker(true)} className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-vesta-red active:bg-slate-50 transition-colors">
            <Plus size={16} /> Add exercise
          </button>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Choose exercise</p>
              <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-600 p-1 -mr-1"><X size={16} /></button>
            </div>
            <ExercisePicker exercises={allExercises} onSelect={addExercise} adding={addingExercise} />
          </div>
        )}
      </div>

      {exerciseOrder.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm"><Zap size={28} className="text-slate-300" /></div>
          <p className="text-slate-400 text-sm">Add your first exercise to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {[...exerciseOrder].reverse().map(seId => {
          const { exercise } = exerciseMap[seId] || {}
          if (!exercise) return null
          const setNums = getSetNums(seId)
          const isExpanded = expanded[seId] ?? true
          const isPR = prBadges[seId]
          const last = prevSets[exercise.id] || []
          const lastWeights = last.map(s => s.weight).filter(Boolean)
          const allLastCompleted = last.length > 0 && last.every(s => s.weight && s.reps)
          const suggestedWeight = allLastCompleted ? Math.max(...lastWeights) + 2.5 : null

          return (
            <div key={seId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <button onClick={() => setExpanded(prev => ({ ...prev, [seId]: !prev[seId] }))} className="flex items-center gap-2 flex-wrap flex-1 text-left">
                  <span className="text-base font-semibold text-slate-900">{exercise.name}</span>
                  {isPR && <span className="flex items-center gap-1 bg-vesta-red text-white text-xs font-bold px-2 py-0.5 rounded-full"><Trophy size={10} /> PR</span>}
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setConfirmDeleteId(seId)} className="text-slate-300 hover:text-red-400 transition-colors p-1"><Trash2 size={15} /></button>
                  <div className="text-slate-400" onClick={() => setExpanded(prev => ({ ...prev, [seId]: !prev[seId] }))}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {last.length > 0 && (
                <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">Last time:</span>
                  {last.map((s, i) => <span key={i} className="text-xs bg-slate-100 text-slate-500 rounded-md px-1.5 py-0.5">{s.weight}kg×{s.reps}</span>)}
                  {suggestedWeight && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-1.5 py-0.5 font-medium">Try {suggestedWeight}kg ↑</span>}
                </div>
              )}

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
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
                      <SwipeToDelete key={n} onDelete={() => deleteSet(seId, n)} disabled={isSaving}>
                        <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 items-center py-0.5">
                          <span className="text-xs font-mono text-center">
                            {isSaved ? <CheckCircle2 size={14} className="mx-auto text-vesta-red" /> : <span className="text-slate-400">{n}</span>}
                          </span>
                          <input type="number" inputMode="decimal" enterKeyHint="next"
                            ref={el => { inputRefs.current[`${seId}-${n}-weight`] = el }}
                            value={inp.weight} onChange={e => updateInput(seId, n, 'weight', e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); inputRefs.current[`${seId}-${n}-reps`]?.focus() } }}
                            placeholder="kg"
                            className={`bg-slate-100 rounded-lg px-2 py-2.5 text-sm text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all w-full ${isSaved ? 'focus:ring-vesta-red/50 ring-1 ring-vesta-red/30' : 'focus:ring-slate-300'}`} />
                          <input type="number" inputMode="numeric" enterKeyHint="done"
                            ref={el => { inputRefs.current[`${seId}-${n}-reps`] = el }}
                            value={inp.reps} onChange={e => updateInput(seId, n, 'reps', e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); logSet(seId, n) } }}
                            placeholder="reps"
                            className={`bg-slate-100 rounded-lg px-2 py-2.5 text-sm text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all w-full ${isSaved ? 'focus:ring-vesta-red/50 ring-1 ring-vesta-red/30' : 'focus:ring-slate-300'}`} />
                          <button onClick={() => logSet(seId, n)} disabled={isSaving || !inp.weight || !inp.reps}
                            className={`h-9 w-full rounded-lg text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center ${isSaved ? 'bg-vesta-red/10 text-vesta-red hover:bg-vesta-red/20' : 'bg-vesta-red text-white hover:bg-vesta-red-dark'}`}>
                            {isSaving ? <Spinner size="sm" /> : isSaved ? '✓' : 'Log'}
                          </button>
                        </div>
                      </SwipeToDelete>
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

      {session && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mt-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 mb-2">Session notes</p>
          <textarea value={notes} onChange={e => { setNotes(e.target.value); setNotesDirty(true); setNotesSaved(false) }}
            placeholder="How did the session feel? Any notes for your coach..."
            rows={3}
            className="w-full bg-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-vesta-red/40 resize-none transition-all" />
          <button
            onClick={saveNotes}
            disabled={savingNotes || (!notesDirty && !notesSaved)}
            className={`mt-2 w-full py-2 rounded-xl text-xs font-semibold transition-all ${notesSaved ? 'bg-green-100 text-green-700' : notesDirty ? 'bg-vesta-navy text-white active:opacity-80' : 'bg-slate-100 text-slate-400'}`}
          >
            {savingNotes ? 'Saving…' : notesSaved ? 'Saved ✓' : 'Save notes'}
          </button>
        </div>
      )}

      {exerciseOrder.length > 0 && (
        <button onClick={() => setShowFinish(true)}
          className="w-full mt-4 bg-vesta-red active:bg-vesta-red-dark text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-vesta-red/20 transition-all active:scale-[0.98]">
          Finish session
        </button>
      )}

      <PastSessionsList sessions={pastSessions} onEdit={id => navigate(`/athlete/session/${id}`)} onDelete={id => setConfirmDeletePastId(id)} onAddDate={handleAddDate} addingDate={addingDate} />

      <Modal open={!!confirmDeletePastId} onClose={() => setConfirmDeletePastId(null)} title="Delete session?">
        <p className="text-slate-500 text-sm mb-5">This will permanently delete this session and all its logged sets. This can't be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeletePastId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 transition-colors">Cancel</button>
          <button onClick={() => deletePastSession(confirmDeletePastId)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white transition-colors">Delete</button>
        </div>
      </Modal>

      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Remove exercise?">
        <p className="text-slate-500 text-sm mb-5">
          This will delete <strong className="text-slate-900">{exerciseMap[confirmDeleteId]?.exercise?.name}</strong> and all its logged sets. This can't be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 transition-colors">Cancel</button>
          <button onClick={() => deleteExercise(confirmDeleteId)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors">Remove</button>
        </div>
      </Modal>

      <Modal open={showFinish} onClose={() => setShowFinish(false)} title="Finish session?">
        <p className="text-slate-500 text-sm mb-5">
          You've completed <strong className="text-slate-900">{completedSets}/{totalSets} sets</strong> with{' '}
          <strong className="text-vesta-red">{totalTonnage}kg</strong> total tonnage.
          {completedSets < totalSets && " Some sets are unlogged — that's fine."}
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowFinish(false)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Keep going</button>
          <button onClick={finishSession} disabled={finishing} className="flex-1 py-3 rounded-xl text-sm font-bold bg-vesta-red hover:bg-vesta-red-dark text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {finishing && <Spinner size="sm" />} Done
          </button>
        </div>
      </Modal>
    </div>
  )
}
