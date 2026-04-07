import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Plus, Copy, Edit2, ChevronRight, ClipboardList, Users } from 'lucide-react'

export default function Programmes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [duplicating, setDuplicating] = useState(null)
  const [confirmDup, setConfirmDup] = useState(null)

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('programmes')
      .select(`
        id, name, created_at, updated_at,
        programme_exercises (id),
        programme_assignments (id, assigned_date, profiles(name))
      `)
      .eq('coach_id', user.id)
      .order('updated_at', { ascending: false })

    setProgrammes(data || [])
    setLoading(false)
  }

  async function duplicate(prog) {
    setDuplicating(prog.id)
    try {
      // Load full programme
      const { data: full } = await supabase
        .from('programme_exercises')
        .select('*')
        .eq('programme_id', prog.id)

      const { data: newProg } = await supabase
        .from('programmes')
        .insert({ coach_id: user.id, name: `${prog.name} (copy)` })
        .select()
        .single()

      if (full && full.length > 0) {
        await supabase.from('programme_exercises').insert(
          full.map(({ id: _id, programme_id: _pid, ...rest }) => ({
            ...rest,
            programme_id: newProg.id,
          }))
        )
      }
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setDuplicating(null)
      setConfirmDup(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-white">Programmes</h1>
        <button
          onClick={() => navigate('/coach/programmes/new')}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-3.5 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      {programmes.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No programmes yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Tap "New" to build your first programme.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programmes.map(prog => {
            const assignmentCount = prog.programme_assignments?.length ?? 0
            const exerciseCount = prog.programme_exercises?.length ?? 0
            const upcoming = prog.programme_assignments
              ?.filter(a => a.assigned_date >= new Date().toISOString().split('T')[0])
              ?.sort((a, b) => a.assigned_date.localeCompare(b.assigned_date))
              ?.slice(0, 2)

            return (
              <div key={prog.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => navigate(`/coach/programmes/${prog.id}/edit`)}
                  className="w-full px-4 py-4 flex items-start justify-between text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{prog.name}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-zinc-500">
                        {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-zinc-700 text-xs">•</span>
                      <span className="text-xs text-zinc-500">
                        {assignmentCount} assignment{assignmentCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {upcoming && upcoming.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Users size={11} className="text-amber-500/60" />
                        <span className="text-xs text-zinc-500">
                          Next: {upcoming[0].profiles?.name} on{' '}
                          {new Date(upcoming[0].assigned_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-zinc-600 mt-0.5 flex-shrink-0" />
                </button>

                {/* Actions */}
                <div className="border-t border-zinc-800 flex">
                  <button
                    onClick={() => navigate(`/coach/programmes/${prog.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                  <div className="w-px bg-zinc-800" />
                  <button
                    onClick={() => setConfirmDup(prog)}
                    disabled={duplicating === prog.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  >
                    {duplicating === prog.id ? <Spinner size="sm" /> : <Copy size={13} />}
                    Duplicate
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!confirmDup} onClose={() => setConfirmDup(null)} title="Duplicate programme?">
        <p className="text-zinc-400 text-sm mb-5">
          Creates a copy of <strong className="text-white">"{confirmDup?.name}"</strong> without assignments.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmDup(null)}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => duplicate(confirmDup)}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
          >
            Duplicate
          </button>
        </div>
      </Modal>
    </div>
  )
}
