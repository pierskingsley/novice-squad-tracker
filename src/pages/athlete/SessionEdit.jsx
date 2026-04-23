import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import SwipeToDelete from '../../components/ui/SwipeToDelete'
import { useToast } from '../../context/ToastContext'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { Trophy, CheckCircle2, Plus, ArrowLeft, Trash2, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import confetti from 'canvas-confetti'
import ZoeCelebration from '../../components/ui/ZoeCelebration'
import CharlotteCelebration from '../../components/ui/CharlotteCelebration'

const CHARLOTTE_EXERCISE = "Charlotte Clover's Special Deadlift"
const ZOE_EXERCISE = "Zoe's Overhead Press"

const CI = {
  chalk: '#F5F1E8', chalkDeep: '#ECE5D4',
  ink: '#181614', inkSoft: '#55504A', inkMute: '#857F76',
  rule: '#D8CFBB', red: '#D13A2E', redDeep: '#A82A20',
  navy: '#2B3A5C', yellow: '#F4C430',
  darkBg: '#14120F', darkCard: '#1F1C18', darkRule: '#302B24', darkInk: '#F5F1E8',
}

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function fireConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#D13A2E', '#2B3A5C', '#ffffff', '#F4C430'] })
}

const CATEGORY_LABELS = { compound: 'Compounds', accessory: 'Accessory', core: 'Core' }
const CATEGORY_ORDER = ['compound', 'accessory', 'core']

function ExercisePicker({ exercises, onSelect, adding, dark }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const categories = CATEGORY_ORDER.filter(c => exercises.some(e => e.category === c))
  const filtered = activeCategory ? exercises.filter(e => e.category === activeCategory) : exercises
  const ink = dark ? CI.darkInk : CI.ink
  const mute = dark ? '#9A9387' : CI.inkMute
  const rule = dark ? CI.darkRule : CI.rule

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 4,
            border: `2px solid ${!activeCategory ? CI.red : rule}`,
            background: !activeCategory ? CI.red : 'transparent',
            color: !activeCategory ? CI.chalk : mute,
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: 11, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer',
          }}
        >All</button>
        {categories.map(cat => (
          <button key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 4,
              border: `2px solid ${activeCategory === cat ? CI.red : rule}`,
              background: activeCategory === cat ? CI.red : 'transparent',
              color: activeCategory === cat ? CI.chalk : mute,
              fontFamily: '"Archivo Black", Impact, sans-serif',
              fontSize: 11, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer',
            }}
          >{CATEGORY_LABELS[cat] ?? cat}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => onSelect(ex.id)} disabled={adding}
            style={{
              padding: '8px 12px',
              background: dark ? CI.darkBg : CI.chalk,
              border: `2px solid ${rule}`, borderRadius: 4,
              color: ink, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', opacity: adding ? 0.4 : 1,
            }}
          >
            {ex.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SessionEdit() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const dark = useIsDark()

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
  const [totalTonnage, setTotalTonnage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingSet, setSavingSet] = useState({})
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesDirty, setNotesDirty] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [showZoe, setShowZoe] = useState(false)
  const [showCharlotte, setShowCharlotte] = useState(false)

  const inputRefs = useRef({})
  const [pulsingSet, setPulsingSet] = useState({})

  const bg   = dark ? CI.darkBg   : CI.chalk
  const card = dark ? CI.darkCard : '#FFFDF5'
  const ink  = dark ? CI.darkInk  : CI.ink
  const mute = dark ? '#9A9387'   : CI.inkMute
  const rule = dark ? CI.darkRule : CI.rule

  const cardStyle = {
    background: card, border: `2px solid ${ink}`,
    borderRadius: 4, boxShadow: `3px 3px 0 ${ink}`,
  }

  const setInputStyle = (active) => ({
    background: dark ? CI.darkBg : CI.chalk,
    border: `2px solid ${active ? CI.red : rule}`,
    borderRadius: 3, padding: '8px 10px',
    textAlign: 'center',
    fontFamily: '"Archivo Black", Impact, sans-serif',
    fontSize: 18, fontWeight: 900, color: ink,
    width: '100%', outline: 'none', boxSizing: 'border-box',
  })

  const recalcTonnage = useCallback((savedSetsSnapshot, exMapSnapshot) => {
    let total = 0
    for (const [seId, setsByNum] of Object.entries(savedSetsSnapshot)) {
      if ((exMapSnapshot || {})[seId]?.exercise?.input_type !== 'weighted' &&
          (exMapSnapshot || {})[seId]?.exercise?.input_type !== undefined) continue
      for (const s of Object.values(setsByNum)) {
        if (s) total += s.weight * s.reps
      }
    }
    setTotalTonnage(Math.round(total * 10) / 10)
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [{ data: sessData, error: se }, { data: exList }] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', id).eq('athlete_id', user.id).single(),
        supabase.from('exercises').select('id, name, category, input_type').order('name'),
      ])
      if (se) throw se
      let sess = sessData
      setAllExercises(exList || [])
      if (sess && !sess.completed_at && sess.date < new Date().toISOString().split('T')[0]) {
        const completedAt = `${sess.date}T23:59:59.000Z`
        await supabase.from('sessions').update({ completed_at: completedAt }).eq('id', sess.id)
        sess = { ...sess, completed_at: completedAt }
      }
      setSession(sess); setNotes(sess?.notes || '')
      const { data: seRows } = await supabase.from('session_exercises').select('*, exercises(id, name, input_type)').eq('session_id', id).order('order_index')
      if (!seRows || seRows.length === 0) { setLoading(false); return }
      const seIds = seRows.map(s => s.id)
      const { data: existingSets } = await supabase.from('sets').select('*').in('session_exercise_id', seIds)
      const newExMap = {}, newExOrder = [], newInputs = {}, newSaved = {}, newExpanded = {}
      for (const se of seRows) {
        newExMap[se.id] = { sessionExercise: se, exercise: se.exercises }
        newExOrder.push(se.id); newExpanded[se.id] = true
        const inputType = se.exercises?.input_type || 'weighted'
        const setsForThis = existingSets?.filter(s => s.session_exercise_id === se.id) || []
        const numSets = Math.max(3, setsForThis.length)
        newInputs[se.id] = {}; newSaved[se.id] = {}
        for (let n = 1; n <= numSets; n++) {
          const saved = setsForThis.find(s => s.set_number === n)
          newSaved[se.id][n] = saved ? { id: saved.id, weight: saved.weight, reps: saved.reps } : null
          if (inputType === 'timed') {
            newInputs[se.id][n] = { reps: saved ? String(saved.reps) : '', duration: saved ? String(saved.weight) : '' }
          } else if (inputType === 'bodyweight') {
            newInputs[se.id][n] = { reps: saved ? String(saved.reps) : '' }
          } else {
            newInputs[se.id][n] = { weight: saved ? String(saved.weight) : '', reps: saved ? String(saved.reps) : '' }
          }
        }
      }
      setExerciseMap(newExMap); setExerciseOrder(newExOrder); setInputs(newInputs)
      setSavedSets(newSaved); setExpanded(newExpanded)
      recalcTonnage(newSaved, newExMap)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [user, id, recalcTonnage])

  useEffect(() => {
    if (user && id) load()
  }, [user, id])

  const { pullDistance, refreshing, isTriggered, handlers: ptrHandlers } = usePullToRefresh(load)

  function getSetNums(seId) {
    return Object.keys(inputs[seId] || {}).map(Number).sort((a, b) => a - b)
  }

  async function addExercise(exerciseId) {
    setAddingExercise(true)
    try {
      const { data: newSE, error: ie } = await supabase
        .from('session_exercises')
        .insert({ session_id: id, exercise_id: exerciseId, order_index: exerciseOrder.length, notes: '' })
        .select('*, exercises(id, name, input_type)').single()
      if (ie) throw ie
      const seId = newSE.id
      const inputType = newSE.exercises?.input_type || 'weighted'
      const emptyInput = inputType === 'timed' ? { reps: '', duration: '' }
        : inputType === 'bodyweight' ? { reps: '' }
        : { weight: '', reps: '' }
      setExerciseMap(prev => ({ ...prev, [seId]: { sessionExercise: newSE, exercise: newSE.exercises } }))
      setExerciseOrder(prev => [...prev, seId])
      setExpanded(prev => ({ ...prev, [seId]: true }))
      setSavedSets(prev => ({ ...prev, [seId]: { 1: null, 2: null, 3: null } }))
      setInputs(prev => ({ ...prev, [seId]: { 1: { ...emptyInput }, 2: { ...emptyInput }, 3: { ...emptyInput } } }))
      setShowPicker(false)
    } catch (err) { setError(err.message) }
    finally { setAddingExercise(false) }
  }

  function addSet(seId) {
    const existing = getSetNums(seId)
    const n = existing.length > 0 ? Math.max(...existing) + 1 : 1
    const inputType = exerciseMap[seId]?.exercise?.input_type || 'weighted'
    const emptyInput = inputType === 'timed' ? { reps: '', duration: '' }
      : inputType === 'bodyweight' ? { reps: '' }
      : { weight: '', reps: '' }
    setSavedSets(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: null } }))
    setInputs(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: { ...emptyInput } } }))
  }

  async function deleteSet(seId, n) {
    const setId = savedSets[seId]?.[n]?.id
    if (setId) await supabase.from('sets').delete().eq('id', setId)
    setSavedSets(prev => {
      const copy = { ...prev[seId] }; delete copy[n]
      const next = { ...prev, [seId]: copy }; recalcTonnage(next, exerciseMap); return next
    })
    setInputs(prev => {
      const copy = { ...prev[seId] }; delete copy[n]; return { ...prev, [seId]: copy }
    })
  }

  function updateInput(seId, n, field, value) {
    setInputs(prev => ({ ...prev, [seId]: { ...prev[seId], [n]: { ...prev[seId][n], [field]: value } } }))
  }

  async function logSet(seId, n) {
    const inp = inputs[seId]?.[n] || {}
    const inputType = exerciseMap[seId]?.exercise?.input_type || 'weighted'
    let weight = 0, reps = 0
    if (inputType === 'timed') {
      reps = parseInt(inp.reps); weight = parseInt(inp.duration)
      if (!reps || !weight || isNaN(reps) || isNaN(weight)) return
    } else if (inputType === 'bodyweight') {
      reps = parseInt(inp.reps)
      if (!reps || isNaN(reps)) return
    } else {
      weight = parseFloat(inp.weight); reps = parseInt(inp.reps)
      if (!weight || !reps || isNaN(weight) || isNaN(reps)) return
    }
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
      setSavedSets(newSaved)
      recalcTonnage(newSaved, exerciseMap)
      let t = 0
      for (const [sid, sets] of Object.entries(newSaved)) {
        if ((exerciseMap[sid]?.exercise?.input_type || 'weighted') !== 'weighted') continue
        for (const s of Object.values(sets)) if (s) t += s.weight * s.reps
      }
      supabase.from('sessions').update({ total_tonnage: Math.round(t * 10) / 10 }).eq('id', id)
      const exData = exerciseMap[seId]
      let isPR = false
      if (exData && inputType === 'weighted') {
        const exerciseId = exData.exercise.id
        const { data: pb } = await supabase.from('personal_bests').select('weight').eq('athlete_id', user.id).eq('exercise_id', exerciseId).maybeSingle()
        if (!pb || weight > pb.weight) {
          await supabase.from('personal_bests').upsert({ athlete_id: user.id, exercise_id: exerciseId, weight, reps, achieved_at: new Date().toISOString(), set_id: setRow.id }, { onConflict: 'athlete_id,exercise_id' })
          setPrBadges(prev => ({ ...prev, [seId]: true }))
          isPR = true
          showToast(`🏆 New PR — ${exData.exercise.name}!`, 'pr')
        }
        if (exData.exercise.name === CHARLOTTE_EXERCISE) setShowCharlotte(true)
        if (exData.exercise.name === ZOE_EXERCISE) setShowZoe(true)
      }
      if (!isPR) showToast('Set logged')
      if (navigator.vibrate) navigator.vibrate(10)
      setPulsingSet(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setPulsingSet(prev => ({ ...prev, [key]: false })), 500)
    } catch (err) { showToast('Failed to log set — try again', 'error') }
    finally { setSavingSet(prev => ({ ...prev, [key]: false })) }
  }

  async function deleteExercise(seId) {
    const exerciseId = exerciseMap[seId]?.exercise?.id
    const { error } = await supabase.from('session_exercises').delete().eq('id', seId)
    if (error) {
      showToast('Failed to remove exercise — try again', 'error')
      setConfirmDeleteId(null)
      return
    }
    if (exerciseId) {
      await supabase.from('personal_bests').delete()
        .eq('athlete_id', user.id)
        .eq('exercise_id', exerciseId)
        .is('set_id', null)
    }
    setExerciseOrder(prev => prev.filter(i => i !== seId))
    setExerciseMap(prev => { const n = { ...prev }; delete n[seId]; return n })
    setInputs(prev => { const n = { ...prev }; delete n[seId]; return n })
    setExpanded(prev => { const n = { ...prev }; delete n[seId]; return n })
    setSavedSets(prev => { const n = { ...prev }; delete n[seId]; recalcTonnage(n, exerciseMap); return n })
    setConfirmDeleteId(null)
    showToast('Exercise removed')
  }

  async function markComplete() {
    setFinishing(true)
    const completedAt = session.date < new Date().toISOString().split('T')[0]
      ? `${session.date}T23:59:59.000Z`
      : new Date().toISOString()
    const { error } = await supabase.from('sessions')
      .update({ completed_at: completedAt, total_tonnage: totalTonnage })
      .eq('id', session.id)
    setFinishing(false)
    if (error) { showToast('Could not mark complete — try again', 'error'); return }
    if (navigator.vibrate) navigator.vibrate([30, 50, 30])
    setSession(prev => ({ ...prev, completed_at: completedAt }))
    showToast('Session complete!')
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

  if (loading && !refreshing) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: bg }}>
      <Spinner size="lg" />
    </div>
  )

  if (error) return (
    <div style={{ padding: '64px 20px', textAlign: 'center', background: bg, minHeight: '100vh' }}>
      <p style={{ color: CI.red, fontFamily: 'Caveat, cursive', fontSize: 18 }}>{error}</p>
      <button onClick={() => navigate(-1)} style={{
        marginTop: 16, color: CI.red, fontFamily: 'Caveat, cursive', fontSize: 18,
        background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
      }}>Go back</button>
    </div>
  )

  const sessionDate = session
    ? new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const completedSets = Object.values(savedSets).reduce((sum, sets) => sum + Object.values(sets).filter(Boolean).length, 0)
  const totalSets = Object.values(inputs).reduce((sum, seInputs) => sum + Object.keys(seInputs).length, 0)
  const tonnageDisplay = totalTonnage >= 1000 ? `${(totalTonnage / 1000).toFixed(1)}t` : `${totalTonnage}kg`
  const firstName = profile?.name?.trim().split(' ')[0] || ''

  return (
    <div {...ptrHandlers} style={{ background: bg, minHeight: '100vh', paddingBottom: 160, fontFamily: 'Inter, sans-serif' }}>

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div style={{ height: pullDistance, marginTop: -pullDistance, marginBottom: pullDistance, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ color: isTriggered || refreshing ? CI.red : rule, transition: 'color 0.15s' }}>
            {refreshing ? <Spinner size="sm" /> : <RotateCcw size={18} style={{ transform: isTriggered ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{
          color: mute, background: 'none', border: 'none', cursor: 'pointer',
          marginTop: 4, flexShrink: 0,
        }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: mute, marginBottom: -2 }}>
            {sessionDate}
          </div>
          <div style={{
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: 36, fontWeight: 900, color: ink,
            letterSpacing: -1, lineHeight: 0.9, textTransform: 'uppercase',
          }}>
            Edit session
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      {exerciseOrder.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            ...cardStyle,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '14px',
          }}>
            {[
              { v: `${completedSets}/${totalSets}`, sub: 'sets done', hero: false },
              { v: tonnageDisplay, sub: 'tonnage', hero: true },
              { v: exerciseOrder.length, sub: 'exercises' },
            ].map((s, i) => (
              <div key={s.sub} style={{
                textAlign: 'center', position: 'relative',
                borderLeft: i > 0 ? `2px dashed ${rule}` : 'none',
                padding: '0 4px',
              }}>
                <div style={{
                  fontFamily: '"Archivo Black", Impact, sans-serif',
                  fontSize: s.hero ? 38 : 30, fontWeight: 900,
                  color: s.hero ? CI.red : ink, lineHeight: 1, letterSpacing: -1,
                }}>{s.v}</div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 13, color: mute, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status banners */}
      {session && !session.completed_at && (
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            background: `rgba(43,58,92,0.08)`,
            border: `2px solid rgba(43,58,92,0.25)`,
            borderRadius: 4, padding: '10px 14px',
          }}>
            <p style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: CI.navy }}>
              Session not yet marked complete — it won't show in History.
            </p>
          </div>
        </div>
      )}

      {session && session.completed_at && (
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            background: 'rgba(34,197,94,0.08)',
            border: '2px solid rgba(34,197,94,0.3)',
            borderRadius: 4, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
            <p style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: '#15803d' }}>
              Completed {new Date(session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      {/* Add exercise */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={cardStyle}>
          {!showPicker ? (
            <button
              onClick={() => setShowPicker(true)}
              style={{
                width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                color: CI.red, background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Caveat, cursive', fontSize: 18, fontWeight: 700,
              }}
            >
              <Plus size={16} /> Add exercise
            </button>
          ) : (
            <div style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 13, fontWeight: 900, color: mute, textTransform: 'uppercase', letterSpacing: 1 }}>Choose exercise</span>
                <button onClick={() => setShowPicker(false)} style={{ color: mute, background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <ExercisePicker exercises={allExercises} onSelect={addExercise} adding={addingExercise} dark={dark} />
            </div>
          )}
        </div>
      </div>

      {/* Session notes */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={cardStyle}>
          <div style={{ padding: '14px' }}>
            <p style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: mute, marginBottom: 8 }}>Session notes</p>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesDirty(true); setNotesSaved(false) }}
              placeholder="How did the session feel? Any notes for your coach..."
              rows={3}
              style={{
                width: '100%', background: dark ? CI.darkBg : CI.chalk,
                border: `2px solid ${rule}`, borderRadius: 3,
                padding: '10px 12px', color: ink, fontSize: 15,
                fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes || (!notesDirty && !notesSaved)}
              style={{
                marginTop: 8, width: '100%', padding: '10px',
                background: notesSaved ? '#DCFCE7' : notesDirty ? CI.navy : (dark ? CI.darkBg : CI.chalkDeep),
                color: notesSaved ? '#166534' : notesDirty ? CI.chalk : mute,
                border: `2px solid ${notesDirty ? CI.navy : rule}`, borderRadius: 3,
                fontFamily: '"Archivo Black", Impact, sans-serif',
                fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5,
                cursor: notesDirty ? 'pointer' : 'default',
                boxShadow: notesDirty ? `2px 2px 0 ${ink}` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {savingNotes ? 'Saving…' : notesSaved ? 'Saved ✓' : 'Save notes'}
            </button>
          </div>
        </div>
      </div>

      {/* Exercise cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[...exerciseOrder].reverse().map(seId => {
          const { exercise } = exerciseMap[seId] || {}
          if (!exercise) return null
          const inputType = exercise.input_type || 'weighted'
          const setNums = getSetNums(seId)
          const isExpanded = expanded[seId] ?? true
          const isPR = prBadges[seId]
          const doneSets = setNums.filter(n => !!savedSets[seId]?.[n]).length

          return (
            <div key={seId} style={{ ...cardStyle, overflow: 'hidden' }}>
              {/* Exercise header */}
              <div style={{
                padding: '12px 14px 10px',
                borderBottom: `2px dashed ${rule}`,
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
              }}>
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [seId]: !prev[seId] }))}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{
                    fontFamily: '"Archivo Black", Impact, sans-serif',
                    fontSize: 19, fontWeight: 900, color: ink,
                    letterSpacing: -0.5, textTransform: 'uppercase',
                  }}>{exercise.name}</span>
                  {isPR && (
                    <span style={{
                      background: CI.yellow, color: ink,
                      border: `2px solid ${ink}`, borderRadius: 3,
                      padding: '3px 8px', transform: 'rotate(3deg)', flexShrink: 0,
                      fontFamily: '"Archivo Black", sans-serif', fontSize: 10, fontWeight: 900, letterSpacing: 1,
                    }}>PR!</span>
                  )}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: mute }}>{doneSets}/{setNums.length} done</span>
                  <button onClick={() => setConfirmDeleteId(seId)} style={{ color: rule, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setExpanded(prev => ({ ...prev, [seId]: !prev[seId] }))} style={{ color: mute, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Set rows */}
              {isExpanded && (
                <div style={{ padding: '4px 14px 14px' }}>
                  {/* Column headers */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: inputType === 'bodyweight'
                      ? '28px 1fr 56px 24px'
                      : '28px 1fr 1fr 56px 24px',
                    gap: 8, padding: '6px 0 4px',
                  }}>
                    <span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>#</span>
                    {inputType === 'timed'      && <><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>reps</span><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>secs</span></>}
                    {inputType === 'bodyweight' && <span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>reps</span>}
                    {inputType === 'weighted'   && <><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>kg</span><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>reps</span></>}
                    <span /><span />
                  </div>

                  {setNums.map(n => {
                    const isSaved = !!savedSets[seId]?.[n]
                    const isSaving = savingSet[`${seId}-${n}`]
                    const inp = inputs[seId]?.[n] || {}
                    const isActive = !isSaved && (inp.weight || inp.reps || inp.duration)
                    const canLog = inputType === 'weighted' ? (inp.weight && inp.reps) : inputType === 'timed' ? (inp.reps && inp.duration) : inp.reps
                    const isPRSet = isSaved && prBadges[seId] && n === Math.max(...setNums.filter(nn => savedSets[seId]?.[nn]))

                    return (
                      <SwipeToDelete key={n} onDelete={() => deleteSet(seId, n)} disabled={isSaving} silent>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: inputType === 'bodyweight'
                            ? '28px 1fr 56px 24px'
                            : '28px 1fr 1fr 56px 24px',
                          gap: 8, alignItems: 'center', paddingBottom: 8,
                          borderBottom: `1px dotted ${rule}`,
                          background: isActive ? `rgba(244,196,48,0.08)` : 'transparent',
                          transition: 'background 0.15s',
                        }}>
                          {/* Set number / done indicator */}
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: isSaved ? (isPRSet ? CI.yellow : CI.red) : 'transparent',
                            border: isSaved ? `2px solid ${ink}` : `2px dashed ${rule}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: '"Archivo Black", sans-serif', fontSize: 10, fontWeight: 900,
                            color: isSaved ? (isPRSet ? ink : CI.chalk) : mute,
                            flexShrink: 0,
                          }}>
                            {isSaved ? '✓' : n}
                          </div>

                          {inputType === 'weighted' && (
                            <input type="text" inputMode="decimal" enterKeyHint="next"
                              ref={el => { inputRefs.current[`${seId}-${n}-weight`] = el }}
                              value={inp.weight ?? ''} onChange={e => updateInput(seId, n, 'weight', e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); inputRefs.current[`${seId}-${n}-reps`]?.focus() } }}
                              onBlur={() => { if (inp.weight && !inp.reps) inputRefs.current[`${seId}-${n}-reps`]?.focus() }}
                              placeholder="kg" style={setInputStyle(isActive)} />
                          )}

                          <input type="text" inputMode="numeric" enterKeyHint={inputType === 'weighted' ? 'next' : 'done'}
                            ref={el => { inputRefs.current[`${seId}-${n}-reps`] = el }}
                            value={inp.reps ?? ''} onChange={e => updateInput(seId, n, 'reps', e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); inputType === 'timed' ? inputRefs.current[`${seId}-${n}-duration`]?.focus() : logSet(seId, n) } }}
                            placeholder="reps" style={setInputStyle(isActive)} />

                          {inputType === 'timed' && (
                            <input type="text" inputMode="numeric" enterKeyHint="done"
                              ref={el => { inputRefs.current[`${seId}-${n}-duration`] = el }}
                              value={inp.duration ?? ''} onChange={e => updateInput(seId, n, 'duration', e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); logSet(seId, n) } }}
                              placeholder="secs" style={setInputStyle(isActive)} />
                          )}

                          {/* Log / done button */}
                          <button
                            onClick={() => logSet(seId, n)}
                            disabled={isSaving || !canLog}
                            style={{
                              height: 36, width: '100%', borderRadius: 3, cursor: 'pointer',
                              border: `2px solid ${ink}`,
                              background: isSaved ? `rgba(209,58,46,0.1)` : CI.red,
                              color: isSaved ? CI.red : CI.chalk,
                              fontFamily: '"Archivo Black", Impact, sans-serif',
                              fontSize: 11, fontWeight: 900,
                              opacity: (!canLog && !isSaved) ? 0.4 : 1,
                              boxShadow: (!isSaved && canLog) ? `2px 2px 0 ${ink}` : 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isSaving ? <Spinner size="sm" /> : isSaved ? '✓' : 'LOG'}
                          </button>

                          {/* Delete set */}
                          <button
                            onClick={() => deleteSet(seId, n)}
                            disabled={isSaving}
                            style={{ color: rule, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </SwipeToDelete>
                    )
                  })}

                  {/* Add set */}
                  <button
                    onClick={() => addSet(seId)}
                    style={{
                      width: '100%', padding: '10px',
                      color: mute, background: 'none',
                      border: `2px dashed ${rule}`, borderRadius: 3, cursor: 'pointer',
                      fontFamily: 'Caveat, cursive', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      marginTop: 8,
                    }}
                  >
                    <Plus size={13} /> add another set
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Finish session button */}
      {session && !session.completed_at && exerciseOrder.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 76, left: 0, right: 0,
          padding: '0 20px', zIndex: 30, pointerEvents: 'none',
        }}>
          <button
            onClick={markComplete}
            disabled={finishing}
            style={{
              width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              margin: '0 auto', padding: '16px',
              background: CI.red, color: CI.chalk,
              border: `2px solid ${ink}`, borderRadius: 4,
              boxShadow: `4px 4px 0 ${ink}`,
              fontFamily: '"Archivo Black", Impact, sans-serif',
              fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1,
              cursor: 'pointer', opacity: finishing ? 0.6 : 1,
              pointerEvents: 'auto',
              transition: 'opacity 0.15s',
            }}
          >
            {finishing ? <Spinner size="sm" /> : <CheckCircle2 size={18} />}
            Finish session
          </button>
        </div>
      )}

      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Remove exercise?">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          This will delete <strong className="text-slate-900 dark:text-slate-100">{exerciseMap[confirmDeleteId]?.exercise?.name}</strong> and all its logged sets. This can't be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors">Cancel</button>
          <button onClick={() => deleteExercise(confirmDeleteId)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors">Remove</button>
        </div>
      </Modal>

      {showZoe && <ZoeCelebration onDismiss={() => setShowZoe(false)} name={firstName} />}
      {showCharlotte && <CharlotteCelebration onDismiss={() => setShowCharlotte(false)} />}
    </div>
  )
}
