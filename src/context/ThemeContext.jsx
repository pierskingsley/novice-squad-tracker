import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => {
    return localStorage.getItem('theme-pref') || 'auto'
  })

  const getIsDark = (pref) => {
    if (pref === 'dark') return true
    if (pref === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const applyTheme = (pref) => {
    const dark = getIsDark(pref)
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const setPreference = (pref) => {
    localStorage.setItem('theme-pref', pref)
    setPreferenceState(pref)
    applyTheme(pref)
  }

  // Apply on mount
  useEffect(() => {
    applyTheme(preference)
  }, [])

  // Listen for OS-level changes when in auto mode
  useEffect(() => {
    if (preference !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const isDark = getIsDark(preference)

  return (
    <ThemeContext.Provider value={{ preference, setPreference, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}
