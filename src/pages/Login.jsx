import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../lib/constants'
import Spinner from '../components/ui/Spinner'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
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

  if (registered) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-vesta-red/10 flex items-center justify-center mb-5">
          <Dumbbell size={28} className="text-vesta-red" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h1>
        <p className="text-slate-500 text-sm max-w-xs mb-6">
          We've sent a confirmation link to <strong className="text-slate-900">{email}</strong>. Click it to activate your account, then sign in.
        </p>
        <button
          onClick={() => { setMode('login'); setRegistered(false) }}
          className="text-vesta-red font-medium text-sm"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center px-5 py-12">
      <div className="max-w-sm mx-auto w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-vesta-navy flex items-center justify-center flex-shrink-0">
            <Dumbbell size={22} className="text-white" />
          </div>
          <div>
            <div className="text-slate-900 font-bold text-lg leading-tight">Squad Tracker</div>
            <div className="text-slate-400 text-xs">Novice lifting programme</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          {mode === 'login' ? "Sign in to your account" : "Join the squad"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-vesta-red transition-colors shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {[ROLES.ATHLETE, ROLES.COACH].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                        role === r
                          ? 'bg-vesta-red text-white border-vesta-red'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {r === ROLES.ATHLETE ? 'Athlete' : 'Coach'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-vesta-red transition-colors shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-11 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-vesta-red transition-colors shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vesta-red hover:bg-vesta-red-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Spinner size="sm" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-vesta-red font-medium hover:text-vesta-red-dark transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
