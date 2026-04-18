import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { ProfilePageSkeleton } from '../../components/ui/Skeleton'
import { LogOut } from 'lucide-react'
import { CIStar, CIUnderline, CIWordmark } from '../../components/ui/CIElements'

const CI = {
  chalk: '#F5F1E8', ink: '#181614', inkMute: '#857F76',
  red: '#D13A2E', navy: '#2B3A5C', yellow: '#F4C430',
  darkBg: '#14120F', darkCard: '#1F1C18', darkRule: '#302B24', darkInk: '#F5F1E8',
}

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const { preference, setPreference } = useTheme()
  const [pbs, setPbs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const dark = useIsDark()

  const bg = dark ? CI.darkBg : CI.chalk
  const card = dark ? CI.darkCard : '#FFFDF5'
  const ink = dark ? CI.darkInk : CI.ink
  const mute = dark ? '#9A9387' : CI.inkMute
  const rule = dark ? CI.darkRule : '#D8CFBB'

  useEffect(() => {
    if (user) {
      Promise.all([loadPBs(), loadStats()]).finally(() => setLoading(false))
    }
  }, [user])

  async function loadPBs() {
    const { data } = await supabase
      .from('personal_bests')
      .select('weight, reps, achieved_at, exercises(name)')
      .eq('athlete_id', user.id)
      .not('set_id', 'is', null)
      .order('weight', { ascending: false })
    setPbs(data || [])
  }

  async function loadStats() {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, date')
      .eq('athlete_id', user.id)
      .not('completed_at', 'is', null)
      .order('date', { ascending: true })

    if (!sessions || sessions.length === 0) {
      setStats({ sessions: 0, tonnage: 0, streak: 0 })
      return
    }

    const sessionIds = sessions.map(s => s.id)
    const { data: seRows } = await supabase
      .from('session_exercises')
      .select('id')
      .in('session_id', sessionIds)

    let tonnage = 0
    if (seRows?.length > 0) {
      const { data: sets } = await supabase
        .from('sets')
        .select('weight, reps')
        .in('session_exercise_id', seRows.map(s => s.id))
      tonnage = (sets || []).reduce((sum, s) => sum + s.weight * s.reps, 0)
    }

    const dates = [...new Set(sessions.map(s => s.date))].sort()
    let best = 1, current = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000
      current = diff === 1 ? current + 1 : 1
      if (current > best) best = current
    }

    setStats({ sessions: sessions.length, tonnage, streak: best })
  }

  if (loading) return <ProfilePageSkeleton />

  const firstName = profile?.name?.trim().split(' ')[0] || 'Athlete'
  const lastName = profile?.name?.trim().split(' ').slice(1).join(' ') || ''

  const cardStyle = {
    background: card,
    border: `2px solid ${ink}`,
    borderRadius: 4,
    boxShadow: `3px 3px 0 ${ink}`,
  }

  const tonnageDisplay = stats
    ? stats.tonnage >= 1000
      ? `${(stats.tonnage / 1000).toFixed(1)}t`
      : `${Math.round(stats.tonnage)}kg`
    : '0kg'

  return (
    <div style={{ minHeight: '100vh', background: bg, paddingBottom: 140, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '56px 20px 12px' }}>
        <CIWordmark dark={dark} size={18} />
      </div>

      {/* Identity card */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{
          background: CI.navy, color: CI.chalk,
          border: `2px solid ${ink}`, borderRadius: 4,
          padding: '20px 18px 16px',
          boxShadow: `4px 4px 0 ${CI.red}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: CI.yellow, marginBottom: 2 }}>
            athlete · novice squad
          </div>
          <div style={{
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: Math.min(36, 300 / Math.max(firstName.length + lastName.length, 8)),
            fontWeight: 900, color: CI.chalk,
            letterSpacing: -1.2, lineHeight: 1, textTransform: 'uppercase',
          }}>
            {firstName}<br />{lastName}
          </div>

          <div style={{
            marginTop: 16, paddingTop: 12,
            borderTop: '2px dashed rgba(245,241,232,0.25)',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
          }}>
            {[
              { v: stats?.sessions ?? 0, l: 'sessions' },
              { v: tonnageDisplay, l: 'lifted', hero: true },
              { v: `${stats?.streak ?? 0}🔥`, l: 'best streak' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: '"Archivo Black", Impact, sans-serif',
                  fontSize: 26, fontWeight: 900,
                  color: s.hero ? CI.yellow : CI.chalk,
                  lineHeight: 1, letterSpacing: -0.5,
                }}>{s.v}</div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: 'rgba(245,241,232,0.8)', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <button
            onClick={signOut}
            style={{
              position: 'absolute', top: 16, right: 16,
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'Caveat, cursive', fontSize: 15,
              color: 'rgba(245,241,232,0.7)', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <LogOut size={14} /> sign out
          </button>
        </div>
      </div>

      {/* PR Board */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12,
        }}>
          <div style={{
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: 22, fontWeight: 900, color: ink,
            textTransform: 'uppercase', letterSpacing: -0.5,
          }}>PR Board</div>
          <div style={{ flex: 1, height: 2, background: ink, marginBottom: 4 }} />
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: mute }}>best evers</div>
        </div>

        {pbs.length === 0 ? (
          <div style={{ ...cardStyle, padding: '32px 20px', textAlign: 'center' }}>
            <CIStar color={rule} size={40} />
            <p style={{ color: mute, marginTop: 12, fontFamily: 'Caveat, cursive', fontSize: 18 }}>No PRs yet — start logging!</p>
          </div>
        ) : (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            {pbs.map((pb, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px',
                borderBottom: i < pbs.length - 1 ? `1px dashed ${rule}` : 'none',
                background: i === 0 ? 'rgba(244,196,48,0.18)' : 'transparent',
              }}>
                <div style={{
                  width: 26, height: 26,
                  background: i === 0 ? CI.yellow : (dark ? CI.darkRule : '#ECE5D4'),
                  border: `2px solid ${ink}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transform: i === 0 ? 'rotate(-6deg)' : 'none',
                  borderRadius: 2,
                }}>
                  {i === 0 ? (
                    <CIStar color={ink} size={14} />
                  ) : (
                    <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 12, fontWeight: 900, color: ink }}>{i + 1}</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: '"Archivo Black", Impact, sans-serif',
                    fontSize: 14, fontWeight: 900, color: ink,
                    textTransform: 'uppercase', letterSpacing: -0.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{pb.exercises?.name}</div>
                  <div style={{ fontFamily: 'Caveat, cursive', fontSize: 13, color: mute }}>
                    {new Date(pb.achieved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: '"Archivo Black", Impact, sans-serif',
                    fontSize: 20, fontWeight: 900, color: CI.red, lineHeight: 1, letterSpacing: -0.5,
                  }}>{pb.weight}<span style={{ fontSize: 12, color: mute }}>kg</span></div>
                  <div style={{ fontFamily: 'Caveat, cursive', fontSize: 12, color: mute }}>× {pb.reps} reps</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appearance */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12,
        }}>
          <div style={{
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: 18, fontWeight: 900, color: ink,
            textTransform: 'uppercase', letterSpacing: -0.5,
          }}>Appearance</div>
          <div style={{ flex: 1, height: 2, background: rule, marginBottom: 4 }} />
        </div>
        <div style={{ ...cardStyle, padding: 4, display: 'flex' }}>
          {[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPreference(value)}
              style={{
                flex: 1, padding: '10px 4px',
                background: preference === value ? CI.red : 'transparent',
                color: preference === value ? CI.chalk : mute,
                border: 'none', borderRadius: 2, cursor: 'pointer',
                fontFamily: '"Archivo Black", Impact, sans-serif',
                fontSize: 13, fontWeight: 900, textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
