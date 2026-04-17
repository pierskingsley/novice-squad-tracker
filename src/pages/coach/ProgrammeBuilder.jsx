import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { ArrowLeft, Plus, Trash2, ChevronDown, UserPlus, Users } from 'lucide-react'

function ExerciseRow({ ex, onChange, onRemove }) {
  return (
    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-2.5 border border-slate-100 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{ex.exerciseName}</span>
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors p-1">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'prescribed_sets', label: 'Sets', placeholder: '3' },
          { key: 'prescribed_reps', label: 'Reps', placeholder: '5' },
          { key: 'prescribed_weight', label: 'kg', placeholder: '0' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">{label}</label>
            <input
              type="number" inputMode="decimal" value={ex[key] ?? ''} onChange={e => onChange(key, e.target.value)} placeholder={placeholder}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-sm text-slate-900 dark:text-slate-50 text-center placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-vesta-red transition-colors"
            />
          </div>
        ))}
      </div>
      <input
        type="text" value={ex.notes || ''} onChange={e => onChange('notes', e.target.value)} placeholder="Coach notes (optional)"
        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-vesta-red transition-colors"
      />
    </div>
  )
}

function AssignmentRow({ asgn, athletes, onChange, onRemove }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select value={asgn.athlete_id} onChange={e => onChange('athlete_id', e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 pr-8 text-sm text-slate-900 dark:text-slate-50 appearance-none focus:outline-none focus:border-vesta-red transition-colors">
            <option value="">Select athlete</option>
            {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors p-1.5"><Trash2 size={14} /></button>
      </div>
      <input type="date" value={asgn.assigned_date} onChange={e => onChange('assigned_date', e.target.value)}
        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:border-vesta-red transition-colors" />
    </div>
  )
}

export default function ProgrammeBuilder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [exercises, setExercises] = useState([])
  const [assignments, setAssignments] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [athletes, setAthletes] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMeta()
    if (isEdit) loadProgramme()
  }, [id])

  async function loadMeta() {
    const [{ data: exData }, { data: atData }] = await Promise.all([
      supabase.from('exercises').select('id, name, category').order('name'),
      supabase.from('profiles').select('id, name').eq('role', 'ATHLETE').order('name'),
    ])
    setAllExercises(exData || []); setAthletes(atData || [])
    if (exData?.length > 0) setSelectedExercise(exData[0].id)
    if (!isEdit) setLoading(false)
  }

  async function loadProgramme() {
    const [{ data: prog }, { data: progEx }, { data: asgns }] = await Promise.all([
      supabase.from('programmes').select('name').eq('id', id).single(),
      supabase.from('programme_exercises').select('*, exercises(name)').eq('programme_id', id).order('order_index'),
      supabase.from('programme_assignments').select('id, athlete_id, assigned_date').eq('programme_id', id),
    ])
    if (prog) setName(prog.name)
    if (progEx) setExercises(progEx.map(pe => ({ _dbId: pe.id, exercise_id: pe.exercise_id, exerciseName: pe.exercises?.name, prescribed_sets: pe.prescribed_sets, prescribed_reps: pe.prescribed_reps, prescribed_weight: pe.prescribed_weight, notes: pe.notes || '', _localId: Math.random().toString(36).slice(2) })))
    if (asgns) setAssignments(asgns.map(a => ({ _dbId: a.id, athlete_id: a.athlete_id, assigned_date: a.assigned_date, _localId: Math.random().toString(36).slice(2) })))
    setLoading(false)
  }

  function addExercise() {
    if (!selectedExercise) return
    const ex = allExercises.find(e => e.id === selectedExercise)
    if (!ex) return
    setExercises(prev => [...prev, { exercise_id: ex.id, exerciseName: ex.name, prescribed_sets: 3, prescribed_reps: 5, prescribed_weight: 0, notes: '', _localId: Math.random().toString(36).slice(2) }])
  }

  function updateExercise(localId, key, value) { setExercises(prev => prev.map(ex => ex._localId === localId ? { ...ex, [key]: value } : ex)) }
  function removeExercise(localId) { setExercises(prev => prev.filter(ex => ex._localId !== localId)) }

  function addAssignment() {
    setAssignments(prev => [...prev, { athlete_id: '', assigned_date: new Date().toISOString().split('T')[0], _localId: Math.random().toString(36).slice(2) }])
  }

  function assignWholeSquad() {
    const date = new Date().toISOString().split('T')[0]
    const alreadyAssigned = new Set(assignments.map(a => a.athlete_id).filter(Boolean))
    const toAdd = athletes.filter(a => !alreadyAssigned.has(a.id))
    if (toAdd.length === 0) return
    setAssignments(prev => [
      ...prev,
      ...toAdd.map(a => ({ athlete_id: a.id, assigned_date: date, _localId: Math.random().toString(36).slice(2) })),
    ])
  }

  function updateAssignment(localId, key, value) { setAssignments(prev => prev.map(a => a._localId === localId ? { ...a, [key]: value } : a)) }
  function removeAssignment(localId) { setAssignments(prev => prev.filter(a => a._localId !== localId)) }

  async function save() {
    if (!name.trim()) { setError('Programme name is required'); return }
    if (exercises.length === 0) { setError('Add at least one exercise'); return }
    setError(''); setSaving(true)
    try {
      let progId = id
      if (isEdit) {
        await supabase.from('programmes').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', id)
        await supabase.from('programme_exercises').delete().eq('programme_id', id)
      } else {
        const { data: newProg } = await supabase.from('programmes').insert({ coach_id: user.id, name: name.trim() }).select().single()
        progId = newProg.id
      }
      await supabase.from('programme_exercises').insert(exercises.map((ex, i) => ({ programme_id: progId, exercise_id: ex.exercise_id, prescribed_sets: parseInt(ex.prescribed_sets) || 3, prescribed_reps: parseInt(ex.prescribed_reps) || 5, prescribed_weight: parseFloat(ex.prescribed_weight) || 0, notes: ex.notes || '', order_index: i })))
      if (isEdit) {
        const keptDbIds = assignments.filter(a => a._dbId).map(a => a._dbId)
        const { data: existing } = await supabase.from('programme_assignments').select('id').eq('programme_id', progId)
        const toDelete = (existing || []).filter(e => !keptDbIds.includes(e.id)).map(e => e.id)
        if (toDelete.length > 0) await supabase.from('programme_assignments').delete().in('id', toDelete)
      }
      const newAssignments = assignments.filter(a => !a._dbId && a.athlete_id && a.assigned_date)
      if (newAssignments.length > 0) {
        await supabase.from('programme_assignments').insert(newAssignments.map(a => ({ programme_id: progId, athlete_id: a.athlete_id, assigned_date: a.assigned_date })))
      }
      navigate('/coach/programmes')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="px-4 pt-5 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/coach/programmes')} className="p-2 rounded-xl text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors -ml-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{isEdit ? 'Edit programme' : 'New programme'}</h1>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Programme name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Week 3 — Hypertrophy"
          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-vesta-red transition-colors shadow-sm" />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Exercises</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">{exercises.length} added</span>
        </div>
        {exercises.length > 0 && (
          <div className="space-y-2.5 mb-3">
            {exercises.map(ex => <ExerciseRow key={ex._localId} ex={ex} onChange={(key, val) => updateExercise(ex._localId, key, val)} onRemove={() => removeExercise(ex._localId)} />)}
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-slate-900 appearance-none focus:outline-none focus:border-vesta-red transition-colors shadow-sm">
              {allExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={addExercise} className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-3.5 py-2.5 rounded-xl transition-colors flex-shrink-0">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assign to athletes</h2>
          <div className="flex items-center gap-3">
            {(() => {
              const assignedIds = new Set(assignments.map(a => a.athlete_id).filter(Boolean))
              const missing = athletes.filter(a => !assignedIds.has(a.id))
              if (missing.length === 0) return null
              const isAll = assignedIds.size === 0
              return (
                <button onClick={assignWholeSquad} className="flex items-center gap-1 text-xs text-vesta-navy font-medium hover:text-vesta-navy/70 transition-colors">
                  <Users size={13} />
                  {isAll ? 'Whole squad' : `Add ${missing.length} missing`}
                </button>
              )
            })()}
            <button onClick={addAssignment} className="flex items-center gap-1 text-xs text-vesta-red hover:text-vesta-red-dark transition-colors">
              <UserPlus size={13} /> Add
            </button>
          </div>
        </div>
        {assignments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No assignments yet — tap "Add" to assign this programme to an athlete.</p>
        ) : (
          <div className="space-y-2.5">
            {assignments.map(asgn => <AssignmentRow key={asgn._localId} asgn={asgn} athletes={athletes} onChange={(key, val) => updateAssignment(asgn._localId, key, val)} onRemove={() => removeAssignment(asgn._localId)} />)}
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">{error}</p>}

      <button onClick={save} disabled={saving}
        className="w-full bg-vesta-red hover:bg-vesta-red-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
        {saving && <Spinner size="sm" />}
        {isEdit ? 'Save changes' : 'Create programme'}
      </button>
    </div>
  )
}
