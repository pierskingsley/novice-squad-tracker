import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { TODAY } from '../../lib/constants'
import Spinner from '../../components/ui/Spinner'
import { HomePageSkeleton } from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import SwipeToDelete from '../../components/ui/SwipeToDelete'
import { useToast } from '../../context/ToastContext'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { Trophy, CheckCircle2, Plus, Pencil, CalendarPlus, Trash2, Share, X, Download, RotateCcw, ClipboardList } from 'lucide-react'
import confetti from 'canvas-confetti'
import ZoeCelebration from '../../components/ui/ZoeCelebration'
import CharlotteCelebration from '../../components/ui/CharlotteCelebration'
import { CIStar, CIUnderline, CIScribble } from '../../components/ui/CIElements'

const CHARLOTTE_EXERCISE = "Charlotte Clover's Special Deadlift"
const ZOE_EXERCISE = "Zoe's Overhead Press"

const WELCOME_MESSAGES = [
  n => `Sup, ${n}?`,
  n => `${n}, ready to move some tin?`,
  n => `Let's go, ${n}`,
  n => `Back at it, ${n}`,
]

const QUOTES = [
  'What will you lift today?',
  'Did you know Ben loves a squat?',
  'Are you still hungover?',
  'Time to move some serious weight.',
  'Shifting tin.',
  'Curls for gurls.',
  'Zoe said she can lift more than you. Prove her wrong.',
  'Did you know your 2k correlates to your max watts? Better get squatting.',
  'Chicken legs are an ick.',
]

const TONNAGE_MILESTONES = [
  { kg: 1000, message: 'Welcome to the One Tonne Club 🏋️' },
  { kg: 2000, message: 'Zoe once said she can lift an elephant with one arm' },
  { kg: 3000, message: 'Ben drinks 3000kg of milk in a week' },
  { kg: 5000, message: 'Okay, this is actually kinda impressive.' },
]

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

function fireTonneClub() {
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#D13A2E', '#2B3A5C', '#F4C430'] })
  setTimeout(() => confetti({ particleCount: 100, angle: 60,  spread: 60, origin: { x: 0, y: 0.6 } }), 200)
  setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1, y: 0.6 } }), 200)
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PastSessionsList({ sessions, onEdit, onDelete, onAddDate, addingDate, dark }) {
  const [pickedDate, setPickedDate] = useState('')
  const ink = dark ? CI.darkInk : CI.ink
  const mute = dark ? '#9A9387' : CI.inkMute
  const rule = dark ? CI.darkRule : CI.rule
  const card = dark ? CI.darkCard : '#FFFDF5'
  const cardStyle = { background: card, border: `2px solid ${ink}`, borderRadius: 4, boxShadow: `3px 3px 0 ${ink}` }

  return (
    <div style={{ marginTop: 28, marginBottom: 16 }}>
      <div style={{
        fontFamily: '"Archivo Black", Impact, sans-serif',
        fontSize: 13, fontWeight: 900, color: mute,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
      }}>Past sessions</div>

      <div style={{ ...cardStyle, padding: '14px', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: mute, marginBottom: 8 }}>Log a missed session</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="date"
            value={pickedDate}
            max={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
            onChange={e => setPickedDate(e.target.value)}
            style={{
              flex: 1, background: dark ? CI.darkBg : CI.chalk,
              border: `2px solid ${rule}`, borderRadius: 4,
              padding: '8px 12px', color: ink, fontSize: 15, outline: 'none',
            }}
          />
          <button
            onClick={() => { if (pickedDate) onAddDate(pickedDate) }}
            disabled={!pickedDate || addingDate}
            style={{
              background: CI.red, color: CI.chalk,
              border: `2px solid ${ink}`, borderRadius: 4,
              padding: '8px 14px', cursor: 'pointer',
              fontFamily: '"Archivo Black", Impact, sans-serif',
              fontSize: 14, fontWeight: 900, opacity: (!pickedDate || addingDate) ? 0.4 : 1,
              boxShadow: `2px 2px 0 ${ink}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {addingDate ? <Spinner size="sm" /> : <CalendarPlus size={14} />} Go
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map(sess => {
          const exNames = (sess.session_exercises || []).map(se => se.exercises?.name).filter(Boolean)
          const label = new Date(sess.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          return (
            <div key={sess.id} style={{
              ...cardStyle,
              padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 14, fontWeight: 900, color: ink }}>{label}</div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: mute, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exNames.length > 0 ? exNames.join(', ') : 'No exercises'}
                  {sess.total_tonnage > 0 && ` · ${sess.total_tonnage}kg`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12, flexShrink: 0 }}>
                <button onClick={() => onEdit(sess.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  color: CI.red, fontFamily: 'Caveat, cursive', fontSize: 15,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => onDelete(sess.id)} style={{
                  color: mute, background: 'none', border: 'none', cursor: 'pointer',
                }}>
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

function ExercisePicker({ exercises, onSelect, adding, dark }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const categories = [...new Set(exercises.map(e => e.category).filter(Boolean))]
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
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 4,
              border: `2px solid ${activeCategory === cat ? CI.red : rule}`,
              background: activeCategory === cat ? CI.red : 'transparent',
              color: activeCategory === cat ? CI.chalk : mute,
              fontFamily: '"Archivo Black", Impact, sans-serif',
              fontSize: 11, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', capitalize: 'first',
            }}
          >{cat}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {filtered.map(ex => (
          <button
            key={ex.id}
            onClick={() => onSelect(ex.id)}
            disabled={adding}
            style={{
              padding: '8px 12px',
              background: dark ? CI.darkBg : CI.chalk,
              border: `2px solid ${rule}`, borderRadius: 4,
              color: ink, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', opacity: adding ? 0.4 : 1,
            }}
          >
            {adding ? <Spinner size="sm" /> : ex.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function Home() {
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
  const [prevSets, setPrevSets] = useState({})
  const [totalTonnage, setTotalTonnage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingSet, setSavingSet] = useState({})
  const [finishing, setFinishing] = useState(false)
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
  const [showZoe, setShowZoe] = useState(false)
  const [showCharlotte, setShowCharlotte] = useState(false)
  const [assignedProgrammeName, setAssignedProgrammeName] = useState(null)
  const [pulsingSet, setPulsingSet] = useState({})
  const [welcomeIdx] = useState(() => new Date().getDay() % WELCOME_MESSAGES.length)
  const [quoteIdx] = useState(() => Math.floor(Date.now() / 3600000) % QUOTES.length)

  const inputRefs = useRef({})
  const hitMilestones = useRef(new Set())
  const today = TODAY()

  // colour tokens (re-derived each render so dark mode switch works without refresh)
  const bg   = dark ? CI.darkBg   : CI.chalk
  const card = dark ? CI.darkCard : '#FFFDF5'
  const ink  = dark ? CI.darkInk  : CI.ink
  const mute = dark ? '#9A9387'   : CI.inkMute
  const rule = dark ? CI.darkRule : CI.rule

  const cardStyle = {
    background: card, border: `2px solid ${ink}`,
    borderRadius: 4, boxShadow: `3px 3px 0 ${ink}`,
  }

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
        supabase.from('exercises').select('id, name, category, input_type').order('name'),
        supabase.from('sessions').select('*').eq('athlete_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('sessions')
          .select('id, date, total_tonnage, session_exercises(id, exercises(name))')
          .eq('athlete_id', user.id).neq('date', today).order('date', { ascending: false }).limit(20),
      ])
      setAllExercises(exList || [])
      setPastSessions(past || [])

      let sess = existingSess

      if (!sess) {
        const { data: assignment } = await supabase
          .from('programme_assignments')
          .select('id, programme_id, programmes(name)')
          .eq('athlete_id', user.id)
          .eq('assigned_date', today)
          .maybeSingle()

        if (assignment) {
          const { data: progExercises } = await supabase
            .from('programme_exercises')
            .select('id, exercise_id, prescribed_sets, order_index')
            .eq('programme_id', assignment.programme_id)
            .order('order_index')

          const { data: newSess, error: se } = await supabase
            .from('sessions')
            .insert({ athlete_id: user.id, date: today, programme_assignment_id: assignment.id })
            .select().single()
          if (se) throw se
          sess = newSess

          if (progExercises?.length > 0) {
            await supabase.from('session_exercises').insert(
              progExercises.map(pe => ({
                session_id: sess.id, exercise_id: pe.exercise_id,
                programme_exercise_id: pe.id, order_index: pe.order_index, notes: '',
              }))
            )
          }
          setAssignedProgrammeName(assignment.programmes?.name || null)
        }
      } else if (existingSess.programme_assignment_id) {
        const { data: asgn } = await supabase
          .from('programme_assignments')
          .select('programmes(name)')
          .eq('id', existingSess.programme_assignment_id)
          .maybeSingle()
        setAssignedProgrammeName(asgn?.programmes?.name || null)
      }

      if (!sess) { setLoading(false); return }
      const pastIds = (past || []).map(s => s.id)
      await loadSessionExercises(sess.id, pastIds)
      setSession(sess)
      hitMilestones.current = new Set()
      setNotes(sess.notes || '')
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
    const { data: seRows, error: seError } = await supabase
      .from('session_exercises')
      .select('*, exercises(id, name, input_type)')
      .eq('session_id', sessionId).order('order_index')
    if (seError) { setError(seError.message); return }
    if (!seRows || seRows.length === 0) return
    const seIds = seRows.map(s => s.id)
    const exerciseIds = seRows.map(s => s.exercise_id)
    const [{ data: existingSets, error: setsError }, lastTime] = await Promise.all([
      supabase.from('sets').select('*').in('session_exercise_id', seIds),
      fetchLastTimeSets(exerciseIds, pastSessionIds),
    ])
    if (setsError) { setError(setsError.message); return }
    const newExMap = {}, newExOrder = [], newInputs = {}, newSaved = {}, newExpanded = {}
    for (const se of seRows) {
      newExMap[se.id] = { sessionExercise: se, exercise: se.exercises }
      newExOrder.push(se.id)
      newExpanded[se.id] = true
      const inputType = se.exercises?.input_type || 'weighted'
      const setsForThis = existingSets?.filter(s => s.session_exercise_id === se.id) || []
      const numSets = Math.max(3, setsForThis.length)
      newInputs[se.id] = {}
      newSaved[se.id] = {}
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
    setPrevSets(lastTime)
    recalcTonnage(newSaved, newExMap)
  }

  async function addExercise(exerciseId) {
    const alreadyAdded = Object.values(exerciseMap).some(e => e.exercise?.id === exerciseId)
    if (alreadyAdded) { showToast('Exercise already in session'); setShowPicker(false); return }
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
      const pastIds = pastSessions.map(s => s.id)
      fetchLastTimeSets([exerciseId], pastIds).then(lt => {
        if (lt[exerciseId]) setPrevSets(prev => ({ ...prev, [exerciseId]: lt[exerciseId] }))
      })
    } catch (err) { setError(err.message) }
    finally { setAddingExercise(false) }
  }

  function getSetNums(seId) {
    return Object.keys(inputs[seId] || {}).map(Number).sort((a, b) => a - b)
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
      const copy = { ...prev[seId] }
      delete copy[n]
      const next = { ...prev, [seId]: copy }
      recalcTonnage(next, exerciseMap)
      return next
    })
    setInputs(prev => {
      const copy = { ...prev[seId] }
      delete copy[n]
      return { ...prev, [seId]: copy }
    })
    setTimeout(() => {
      const t = Object.entries(savedSets).reduce((sum, [sid, sets]) => {
        if ((exerciseMap[sid]?.exercise?.input_type || 'weighted') !== 'weighted') return sum
        return sum + Object.values(sets).reduce((s2, s) => s2 + (s ? s.weight * s.reps : 0), 0)
      }, 0)
      if (session) supabase.from('sessions').update({ total_tonnage: Math.round(t * 10) / 10 }).eq('id', session.id)
    }, 0)
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
      supabase.from('sessions').update({ total_tonnage: Math.round(t * 10) / 10 }).eq('id', session.id)

      for (const { kg, message } of TONNAGE_MILESTONES) {
        if (t >= kg && !hitMilestones.current.has(kg)) {
          hitMilestones.current.add(kg)
          showToast(message, 'milestone')
        }
      }

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

      const nextN = n + 1
      setInputs(prev => {
        const nextInp = prev[seId]?.[nextN]
        if (!nextInp) return prev
        const isEmpty = inputType === 'weighted'
          ? (!nextInp.weight && !nextInp.reps)
          : inputType === 'timed'
          ? (!nextInp.reps && !nextInp.duration)
          : !nextInp.reps
        if (!isEmpty) return prev
        const filled = inputType === 'weighted'
          ? { weight: String(weight), reps: String(reps) }
          : inputType === 'timed'
          ? { reps: String(reps), duration: String(weight) }
          : { reps: String(reps) }
        return { ...prev, [seId]: { ...prev[seId], [nextN]: filled } }
      })
    } catch (err) { showToast('Failed to log set — try again', 'error') }
    finally { setSavingSet(prev => ({ ...prev, [key]: false })) }
  }

  async function deleteExercise(seId) {
    const exerciseId = exerciseMap[seId]?.exercise?.id
    const { error } = await supabase.from('session_exercises').delete().eq('id', seId)
    if (error) { showToast('Failed to remove exercise — try again', 'error'); setConfirmDeleteId(null); return }
    if (exerciseId) {
      await supabase.from('personal_bests').delete()
        .eq('athlete_id', user.id).eq('exercise_id', exerciseId).is('set_id', null)
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
    await supabase.from('personal_bests').delete().eq('athlete_id', user.id).is('set_id', null)
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
    } catch (err) { showToast('Failed to add session — try again', 'error') }
    finally { setAddingDate(false) }
  }

  async function finishSession() {
    setFinishing(true)
    try {
      const completedAt = session.date < today
        ? `${session.date}T23:59:59.000Z`
        : new Date().toISOString()
      await supabase.from('sessions').update({ completed_at: completedAt, total_tonnage: totalTonnage }).eq('id', session.id)
      if (navigator.vibrate) navigator.vibrate([30, 50, 30])
      if (totalTonnage >= 1000) setTimeout(fireTonneClub, 300)
      setSession(prev => ({ ...prev, completed_at: completedAt }))
      showToast('Session complete 🎉')
    } catch (err) { setError(err.message) }
    finally { setFinishing(false) }
  }

  const finished = !!session?.completed_at
  const completedSets = Object.values(savedSets).reduce((sum, sets) => sum + Object.values(sets).filter(Boolean).length, 0)
  const totalSets = Object.values(inputs).reduce((sum, seInputs) => sum + Object.keys(seInputs).length, 0)
  const firstName = profile?.name?.trim().split(' ')[0] || ''
  const prCount = Object.values(prBadges).filter(Boolean).length

  const congratsMessages = prCount > 0
    ? [`${prCount} new personal record${prCount > 1 ? 's' : ''}. That's what it's about.`]
    : totalTonnage >= 2000
    ? [`${(totalTonnage / 1000).toFixed(1)} tonnes moved. Serious work today.`]
    : ['Remember, beers buy boats. Get to the bar.', 'Good session. Progress is progress.', 'Say goodbye to those chicken legs.', 'Your mooscklezz are getting bigger.', 'Du wirst immer stärker']
  const congratsMsg = congratsMessages[new Date().getDay() % congratsMessages.length]

  const isIOS = /iphone|ipad|ipod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const isStandalone = typeof window !== 'undefined' && window.navigator.standalone === true

  const { pullDistance, refreshing, isTriggered, handlers: ptrHandlers } = usePullToRefresh(load)

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const tonnageDisplay = totalTonnage >= 1000 ? `${(totalTonnage / 1000).toFixed(1)}t` : `${totalTonnage}kg`

  // ── Input style for set rows ────────────────────────────────────────────
  const setInputStyle = (active) => ({
    background: active ? CI.chalk : (dark ? CI.darkBg : CI.chalk),
    border: `2px solid ${active ? CI.red : rule}`,
    borderRadius: 3, padding: '8px 10px',
    textAlign: 'center',
    fontFamily: '"Archivo Black", Impact, sans-serif',
    fontSize: 18, fontWeight: 900, color: ink,
    width: '100%', outline: 'none', boxSizing: 'border-box',
  })

  // ─── Loading / error ─────────────────────────────────────────────────────

  if (loading && !refreshing) return <HomePageSkeleton />

  if (error) return (
    <div style={{ padding: '64px 20px', textAlign: 'center', background: bg, minHeight: '100vh' }}>
      <p style={{ color: CI.red, fontFamily: 'Caveat, cursive', fontSize: 18 }}>{error}</p>
      <button onClick={load} style={{
        marginTop: 16, color: CI.red, fontFamily: 'Caveat, cursive', fontSize: 18,
        background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
      }}>Retry</button>
    </div>
  )

  // ─── SESSION COMPLETE view ────────────────────────────────────────────────

  if (finished) return (
    <div style={{ minHeight: '100vh', background: bg, paddingBottom: 140, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* scattered stars */}
      {[
        { top: 90, left: 30, r: -15, s: 28, c: CI.yellow },
        { top: 70, right: 40, r: 20, s: 22, c: CI.red },
        { top: 210, left: -10, r: 10, s: 32, c: CI.yellow },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', top: s.top, left: s.left, right: s.right, transform: `rotate(${s.r}deg)`, zIndex: 0 }}>
          <CIStar color={s.c} size={s.s} />
        </div>
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero heading */}
        <div style={{ padding: '60px 24px 12px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 28, color: CI.red, transform: 'rotate(-2deg)', marginBottom: -6 }}>
            sick session!
          </div>
          <div style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 52, fontWeight: 900, color: ink, lineHeight: 0.9, letterSpacing: -2.5, textTransform: 'uppercase' }}>
            Nice work,
          </div>
          <div style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 52, fontWeight: 900, color: CI.red, lineHeight: 0.9, letterSpacing: -2.5, textTransform: 'uppercase', position: 'relative', display: 'inline-block' }}>
            {firstName || 'Squad'}!
            <CIUnderline color={CI.yellow} w={180} style={{ position: 'absolute', bottom: -4, left: 0 }} />
          </div>
          <p style={{ fontFamily: 'Caveat, cursive', fontSize: 18, color: mute, marginTop: 20 }}>{congratsMsg}</p>
          <button onClick={() => navigate(`/athlete/session/${session.id}`)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
            color: CI.red, fontFamily: 'Caveat, cursive', fontSize: 16,
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <Pencil size={13} /> Edit session
          </button>
        </div>

        {/* Hero tonnage */}
        <div style={{ padding: '12px 20px' }}>
          <div style={{
            background: ink, color: CI.chalk,
            border: `3px solid ${ink}`, borderRadius: 4,
            padding: '24px 20px', textAlign: 'center',
            boxShadow: `6px 6px 0 ${CI.red}`,
            position: 'relative',
          }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: CI.yellow, marginBottom: 6 }}>total shifted today ↓</div>
            <div style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 80, fontWeight: 900, color: CI.chalk, lineHeight: 0.85, letterSpacing: -4 }}>
              {totalTonnage >= 1000
                ? <>{(totalTonnage / 1000).toFixed(1)}<span style={{ fontSize: 40, color: CI.yellow }}>t</span></>
                : <>{totalTonnage}<span style={{ fontSize: 36, color: CI.yellow }}>kg</span></>
              }
            </div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: CI.yellow, marginTop: 6 }}>
              → {totalTonnage.toLocaleString()} kg of absolute tin
            </div>

            {totalTonnage >= 1000 && (
              <div style={{ position: 'absolute', top: -14, right: -14, transform: 'rotate(12deg)' }}>
                <div style={{
                  background: CI.yellow, color: ink,
                  border: `2px solid ${ink}`, borderRadius: 4,
                  padding: '6px 10px',
                  fontFamily: '"Archivo Black", sans-serif', fontSize: 11, fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>TONNE CLUB!</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats trio */}
        <div style={{ padding: '4px 20px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { v: completedSets, l: 'sets' },
              { v: prCount > 0 ? prCount : exerciseOrder.length, l: prCount > 0 ? 'new PRs' : 'exercises', star: prCount > 0 },
              { v: exerciseOrder.length, l: 'lifts' },
            ].map(s => (
              <div key={s.l} style={{
                ...cardStyle, padding: '12px 4px', textAlign: 'center', position: 'relative',
              }}>
                {s.star && (
                  <div style={{ position: 'absolute', top: -10, right: -8, transform: 'rotate(10deg)' }}>
                    <CIStar color={CI.yellow} size={18} />
                  </div>
                )}
                <div style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 32, fontWeight: 900, color: ink, lineHeight: 1, letterSpacing: -1 }}>{s.v}</div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: mute, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PRs list */}
        {prCount > 0 && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 22, color: ink, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CIStar color={CI.yellow} size={22} />
              <span>today's personal records:</span>
            </div>
            {exerciseOrder.filter(seId => prBadges[seId]).map((seId, i) => {
              const ex = exerciseMap[seId]?.exercise
              const sets = Object.values(savedSets[seId] || {}).filter(Boolean)
              const bestSet = sets.reduce((best, s) => (!best || s.weight > best.weight) ? s : best, null)
              return (
                <div key={seId} style={{
                  ...cardStyle, padding: '12px 14px', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                  transform: `rotate(${i % 2 === 0 ? '-0.5' : '0.5'}deg)`,
                }}>
                  <div style={{
                    width: 32, height: 32, background: CI.yellow,
                    border: `2px solid ${ink}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transform: 'rotate(-4deg)', borderRadius: 2,
                  }}>
                    <CIStar color={ink} size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 15, fontWeight: 900, color: ink, textTransform: 'uppercase', letterSpacing: -0.3 }}>{ex?.name}</div>
                    <div style={{ fontFamily: 'Caveat, cursive', fontSize: 13, color: mute }}>new best!</div>
                  </div>
                  {bestSet && (
                    <div style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 18, fontWeight: 900, color: CI.red, whiteSpace: 'nowrap' }}>
                      {bestSet.weight}kg × {bestSet.reps}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <PastSessionsList
          sessions={pastSessions} dark={dark}
          onEdit={id => navigate(`/athlete/session/${id}`)}
          onDelete={id => setConfirmDeletePastId(id)}
          onAddDate={handleAddDate} addingDate={addingDate}
        />
      </div>

      <Modal open={!!confirmDeletePastId} onClose={() => setConfirmDeletePastId(null)} title="Delete session?">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">This will permanently delete this session. This can't be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeletePastId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600">Cancel</button>
          <button onClick={() => deletePastSession(confirmDeletePastId)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white">Delete</button>
        </div>
      </Modal>
    </div>
  )

  // ─── ACTIVE SESSION view ─────────────────────────────────────────────────

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
      <div style={{ padding: '56px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18, color: mute, marginBottom: -2 }}>
              {dateLabel}
            </div>
            <div style={{
              fontFamily: '"Archivo Black", Impact, sans-serif',
              fontSize: 42, fontWeight: 900, color: ink,
              letterSpacing: -1.5, lineHeight: 0.9, textTransform: 'uppercase',
            }}>
              {firstName ? (
              <>Sup,&nbsp;<span style={{ color: CI.red, position: 'relative', display: 'inline-block' }}>
                {firstName}?
                <CIUnderline color={CI.yellow} w={Math.min(130, firstName.length * 20 + 10)} style={{ position: 'absolute', bottom: -4, left: 0 }} />
              </span></>
            ) : "Today's session"}
            </div>
          </div>
          {installPrompt && (
            <button onClick={handleInstall} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: CI.navy, color: CI.chalk,
              border: `2px solid ${ink}`, borderRadius: 4,
              padding: '8px 12px', cursor: 'pointer', flexShrink: 0, marginTop: 4,
              fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 11, fontWeight: 900,
              boxShadow: `2px 2px 0 ${ink}`,
            }}>
              <Download size={13} /> Add to phone
            </button>
          )}
        </div>

        {/* iOS install hint */}
        {isIOS && !isStandalone && !iosHintDismissed && (
          <div style={{
            ...cardStyle, padding: '10px 14px', marginTop: 14,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Share size={15} style={{ color: CI.navy, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 11, fontWeight: 900, color: CI.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Add to home screen</p>
              <p style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: mute }}>Tap Share in Safari, then Add to Home Screen.</p>
            </div>
            <button onClick={() => setIosHintDismissed(true)} style={{ color: mute, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}><X size={15} /></button>
          </div>
        )}

        {/* Assigned programme */}
        {assignedProgrammeName && (
          <div style={{ ...cardStyle, padding: '10px 14px', marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={16} style={{ color: CI.navy, flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 11, fontWeight: 900, color: CI.navy, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's programme</p>
              <p style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: ink }}>{assignedProgrammeName}</p>
            </div>
          </div>
        )}
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
              { v: exerciseOrder.length, sub: 'exercises', star: prCount > 0 },
            ].map((s, i) => (
              <div key={s.sub} style={{
                textAlign: 'center', position: 'relative',
                borderLeft: i > 0 ? `2px dashed ${rule}` : 'none',
                padding: '0 4px',
              }}>
                {s.star && (
                  <div style={{ position: 'absolute', top: -8, right: 4 }}>
                    <CIStar color={CI.yellow} size={18} />
                  </div>
                )}
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

      {/* Add exercise (inline picker or button) */}
      {exerciseOrder.length > 0 && (
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
      )}

      {/* Empty state */}
      {exerciseOrder.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', textAlign: 'center', padding: '0 20px' }}>
          {!showPicker ? (
            <>
              <button
                onClick={() => setShowPicker(true)}
                style={{
                  background: CI.red, color: CI.chalk,
                  border: `2px solid ${ink}`, borderRadius: 4,
                  padding: '16px 32px', cursor: 'pointer',
                  boxShadow: `4px 4px 0 ${ink}`,
                  fontFamily: '"Archivo Black", Impact, sans-serif',
                  fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1,
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 20,
                }}
              >
                <Plus size={20} /> Add exercise
              </button>
              <p style={{ fontFamily: 'Caveat, cursive', fontSize: 18, color: mute, transform: 'rotate(-1deg)' }}>
                {QUOTES[quoteIdx]}
              </p>
            </>
          ) : (
            <div style={{ ...cardStyle, width: '100%', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: '"Archivo Black", Impact, sans-serif', fontSize: 13, fontWeight: 900, color: mute, textTransform: 'uppercase', letterSpacing: 1 }}>Choose exercise</span>
                <button onClick={() => setShowPicker(false)} style={{ color: mute, background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <ExercisePicker exercises={allExercises} onSelect={addExercise} adding={addingExercise} dark={dark} />
            </div>
          )}
        </div>
      )}

      {/* Exercise cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[...exerciseOrder].reverse().map(seId => {
          const { exercise } = exerciseMap[seId] || {}
          if (!exercise) return null
          const inputType = exercise.input_type || 'weighted'
          const setNums = getSetNums(seId)
          const isExpanded = expanded[seId] ?? true
          const isPR = prBadges[seId]
          const last = prevSets[exercise.id] || []
          const lastWeights = last.map(s => s.weight).filter(Boolean)
          const allLastCompleted = last.length > 0 && last.every(s => s.weight && s.reps)
          const suggestedWeight = inputType === 'weighted' && allLastCompleted ? Math.max(...lastWeights) + 2.5 : null
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
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 8, flex: 1, textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
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
                </div>
              </div>

              {/* Last time info */}
              {last.length > 0 && (
                <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: mute }}>Last time:</span>
                  {last.map((s, i) => (
                    <span key={i} style={{
                      fontFamily: 'Caveat, cursive', fontSize: 14, color: mute,
                      background: dark ? CI.darkBg : CI.chalkDeep,
                      padding: '2px 8px', borderRadius: 3,
                    }}>
                      {inputType === 'timed' ? `${s.reps}×${s.weight}s` : inputType === 'bodyweight' ? `×${s.reps}` : `${s.weight}kg×${s.reps}`}
                    </span>
                  ))}
                  {suggestedWeight && (
                    <span style={{
                      fontFamily: 'Caveat, cursive', fontSize: 14, color: CI.navy,
                      background: 'rgba(43,58,92,0.1)', border: `1px solid ${CI.navy}`,
                      padding: '2px 8px', borderRadius: 3,
                    }}>Try {suggestedWeight}kg ↑</span>
                  )}
                </div>
              )}

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
                    {inputType === 'timed' && <><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>reps</span><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>secs</span></>}
                    {inputType === 'bodyweight' && <span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>reps</span>}
                    {inputType === 'weighted' && <><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>kg</span><span style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute, textAlign: 'center' }}>reps</span></>}
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

                          {/* kg input */}
                          {inputType === 'weighted' && (
                            <input
                              type="text" inputMode="decimal" enterKeyHint="next"
                              ref={el => { inputRefs.current[`${seId}-${n}-weight`] = el }}
                              value={inp.weight ?? ''}
                              onChange={e => updateInput(seId, n, 'weight', e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); inputRefs.current[`${seId}-${n}-reps`]?.focus() } }}
                              onBlur={() => { if (inp.weight && !inp.reps) inputRefs.current[`${seId}-${n}-reps`]?.focus() }}
                              placeholder="kg"
                              style={setInputStyle(isActive)}
                            />
                          )}

                          {/* reps input */}
                          <input
                            type="text" inputMode="numeric"
                            enterKeyHint={inputType === 'weighted' ? 'next' : 'done'}
                            ref={el => { inputRefs.current[`${seId}-${n}-reps`] = el }}
                            value={inp.reps ?? ''}
                            onChange={e => updateInput(seId, n, 'reps', e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); inputType === 'timed' ? inputRefs.current[`${seId}-${n}-duration`]?.focus() : logSet(seId, n) } }}
                            placeholder="reps"
                            style={setInputStyle(isActive)}
                          />

                          {/* duration input (timed) */}
                          {inputType === 'timed' && (
                            <input
                              type="text" inputMode="numeric" enterKeyHint="done"
                              ref={el => { inputRefs.current[`${seId}-${n}-duration`] = el }}
                              value={inp.duration ?? ''}
                              onChange={e => updateInput(seId, n, 'duration', e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); logSet(seId, n) } }}
                              placeholder="secs"
                              style={setInputStyle(isActive)}
                            />
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

      {/* Session notes */}
      {session && (
        <div style={{ padding: '16px 20px 0' }}>
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
      )}

      {/* Past sessions */}
      <div style={{ padding: '0 20px' }}>
        <PastSessionsList
          sessions={pastSessions} dark={dark}
          onEdit={id => navigate(`/athlete/session/${id}`)}
          onDelete={id => setConfirmDeletePastId(id)}
          onAddDate={handleAddDate} addingDate={addingDate}
        />
      </div>

      {/* Modals */}
      <Modal open={!!confirmDeletePastId} onClose={() => setConfirmDeletePastId(null)} title="Delete session?">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">This will permanently delete this session and all its logged sets. This can't be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeletePastId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600">Cancel</button>
          <button onClick={() => deletePastSession(confirmDeletePastId)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white">Delete</button>
        </div>
      </Modal>

      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Remove exercise?">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          This will delete <strong>{exerciseMap[confirmDeleteId]?.exercise?.name}</strong> and all its logged sets. This can't be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600">Cancel</button>
          <button onClick={() => deleteExercise(confirmDeleteId)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white">Remove</button>
        </div>
      </Modal>

      {showZoe && <ZoeCelebration onDismiss={() => setShowZoe(false)} />}
      {showCharlotte && <CharlotteCelebration onDismiss={() => setShowCharlotte(false)} />}

      {/* Complete session button */}
      {session && !session.completed_at && completedSets > 0 && (
        <div style={{
          position: 'fixed', bottom: 76, left: 0, right: 0,
          padding: '0 20px', zIndex: 30, pointerEvents: 'none',
        }}>
          <button
            onClick={finishSession}
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
            Complete session
          </button>
        </div>
      )}
    </div>
  )
}
