import { createContext, useContext, useState, useCallback } from 'react'
import { X, Trophy, CheckCircle2, AlertCircle } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

function Toast({ toast, onDismiss }) {
  const icons = {
    pr:        <Trophy size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />,
    milestone: <Trophy size={15} className="text-vesta-red flex-shrink-0 mt-0.5" />,
    success:   <CheckCircle2 size={15} className="text-vesta-navy flex-shrink-0 mt-0.5" />,
    error:     <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />,
    german:    <span className="text-base flex-shrink-0 mt-0.5 leading-none">🇩🇪</span>,
  }
  const borders = {
    pr:        'border-l-amber-400',
    milestone: 'border-l-vesta-red',
    success:   'border-l-vesta-navy',
    error:     'border-l-red-400',
    german:    'border-l-[#FFCE00]',
  }

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-700 border-l-4 ${borders[toast.type] ?? borders.success} px-3.5 py-3 animate-toast-in ${toast.type === 'pr' ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-white dark:bg-[#1C1C1E]'}`}
    >
      {icons[toast.type] ?? icons.success}
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 leading-tight">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-slate-300 dark:text-zinc-600 hover:text-slate-500 dark:hover:text-zinc-400 transition-colors flex-shrink-0 mt-0.5 -mr-0.5">
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), type === 'pr' || type === 'german' || type === 'milestone' ? 4000 : 2500)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-[100] max-w-sm mx-auto space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
