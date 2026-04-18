import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../lib/constants'
import Spinner from '../components/ui/Spinner'
import { Eye, EyeOff } from 'lucide-react'
import { CIScribble, CIStar, CIUnderline, CIWordmark } from '../components/ui/CIElements'

const CI = {
  chalk: '#F5F1E8', ink: '#181614', inkMute: '#857F76',
  red: '#D13A2E', navy: '#2B3A5C', yellow: '#F4C430',
  darkBg: '#14120F', darkCard: '#1F1C18', darkInk: '#F5F1E8',
}

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState(ROLES.ATHLETE)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const dark = useIsDark()

  const bg = dark ? CI.darkBg : CI.chalk
  const card = dark ? CI.darkCard : '#FFFDF5'
  const ink = dark ? CI.darkInk : CI.ink
  const mute = dark ? '#9A9387' : CI.inkMute
  const rule = dark ? '#302B24' : '#D8CFBB'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/')
      } else {
        if (!name.trim()) throw new Error('Name is required')
        await signUp(email, password, name.trim(), role)
        setRegistered(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: card,
    border: `2px solid ${ink}`, borderRadius: 4,
    padding: '10px 14px',
    boxShadow: `3px 3px 0 ${ink}`,
    color: ink, fontSize: 16, outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontFamily: 'Caveat, cursive',
    fontSize: 15, color: mute, marginBottom: 4, display: 'block',
  }

  if (registered) {
    return (
      <div style={{
        minHeight: '100vh', background: bg, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: '"Archivo Black", Impact, sans-serif',
          fontSize: 36, fontWeight: 900, color: ink,
          letterSpacing: -1.5, lineHeight: 0.9, textTransform: 'uppercase',
          marginBottom: 16,
        }}>Check your inbox</div>
        <p style={{ fontSize: 14, color: mute, marginBottom: 24, maxWidth: 280, lineHeight: 1.5 }}>
          We sent a confirmation link to <strong style={{ color: ink }}>{email}</strong>.
          Click it to activate your account, then sign in.
        </p>
        <button
          onClick={() => { setMode('login'); setRegistered(false) }}
          style={{
            fontFamily: 'Caveat, cursive', fontSize: 18, color: CI.red,
            textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: bg,
      padding: '60px 24px 40px',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* decorative scribbles */}
      <div style={{ position: 'absolute', top: 80, left: -20, opacity: 0.5, transform: 'rotate(-20deg)' }}>
        <CIScribble color={CI.navy} />
      </div>
      <div style={{ position: 'absolute', bottom: 120, right: -10, opacity: 0.6, transform: 'rotate(15deg)' }}>
        <CIStar color={CI.yellow} size={40} />
      </div>

      <CIWordmark dark={dark} size={22} />
      <div style={{ flex: '0 0 10vh' }} />

      <div>
        <div style={{
          fontFamily: 'Caveat, cursive', fontSize: 24, color: CI.red,
          marginBottom: 4, transform: 'rotate(-2deg)', transformOrigin: 'left',
        }}>oi oi,</div>
        <div style={{
          fontFamily: '"Archivo Black", Impact, sans-serif',
          fontSize: 52, fontWeight: 900, color: ink,
          lineHeight: 0.9, letterSpacing: -2, textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          {mode === 'login' ? (
            <>Get in, <span style={{ color: CI.red, position: 'relative', display: 'inline-block' }}>
              squad
              <CIUnderline color={CI.yellow} w={130} style={{ position: 'absolute', bottom: -6, left: 0 }} />
            </span></>
          ) : (
            <>Join the <span style={{ color: CI.red, position: 'relative', display: 'inline-block' }}>
              squad
              <CIUnderline color={CI.yellow} w={130} style={{ position: 'absolute', bottom: -6, left: 0 }} />
            </span></>
          )}
        </div>
        <div style={{ fontSize: 14, color: mute, marginBottom: 28, marginTop: 14 }}>
          {mode === 'login' ? 'Time to shift some tin.' : 'Join the Vesta novice squad.'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          {mode === 'register' && (
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                style={inputStyle}
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label style={labelStyle}>Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[ROLES.ATHLETE, ROLES.COACH].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '10px',
                      border: `2px solid ${ink}`,
                      borderRadius: 4,
                      background: role === r ? CI.red : card,
                      color: role === r ? CI.chalk : ink,
                      fontFamily: '"Archivo Black", Impact, sans-serif',
                      fontSize: 14, fontWeight: 900,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      boxShadow: role === r ? `3px 3px 0 ${ink}` : 'none',
                    }}
                  >
                    {r === ROLES.ATHLETE ? 'Athlete' : 'Coach'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@vesta.rowing"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              style={{
                position: 'absolute', right: 12, bottom: 12,
                color: mute, background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: `2px solid ${CI.red}`, borderRadius: 4,
              padding: '10px 14px', color: CI.red, fontSize: 14,
              fontFamily: 'Caveat, cursive', fontSize: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px',
              background: CI.red, color: CI.chalk,
              border: `2px solid ${ink}`, borderRadius: 4,
              cursor: 'pointer', boxShadow: `4px 4px 0 ${ink}`,
              fontFamily: '"Archivo Black", Impact, sans-serif',
              fontSize: 18, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: loading ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {loading ? <Spinner size="sm" /> : (mode === 'login' ? "LET'S GO →" : 'JOIN UP')}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          fontFamily: 'Caveat, cursive', fontSize: 18, color: mute,
        }}>
          {mode === 'login' ? 'new here? ' : 'already in? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{
              color: CI.red, textDecoration: 'underline',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Caveat, cursive', fontSize: 18,
            }}
          >
            {mode === 'login' ? 'sign up' : 'sign in'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        textAlign: 'center', fontFamily: 'Caveat, cursive',
        fontSize: 16, color: mute, transform: 'rotate(-1deg)', marginTop: 32,
      }}>
        Vesta Rowing Club · novice squad ✺
      </div>
    </div>
  )
}
