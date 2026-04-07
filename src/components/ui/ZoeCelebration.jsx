import { useEffect } from 'react'
import confetti from 'canvas-confetti'

const GERMAN_FLAG = ['#000000', '#DD0000', '#FFCE00']

function fireGermanConfetti() {
  const burst = (opts) => confetti({ colors: GERMAN_FLAG, ...opts })
  burst({ particleCount: 80, spread: 60, origin: { x: 0.5, y: 0.4 } })
  setTimeout(() => burst({ particleCount: 60, angle: 60,  spread: 55, origin: { x: 0, y: 0.5 } }), 150)
  setTimeout(() => burst({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.5 } }), 150)
  setTimeout(() => burst({ particleCount: 40, spread: 80, origin: { x: 0.3, y: 0.6 } }), 400)
  setTimeout(() => burst({ particleCount: 40, spread: 80, origin: { x: 0.7, y: 0.6 } }), 500)
}

export default function ZoeCelebration({ onDismiss }) {
  useEffect(() => {
    fireGermanConfetti()
    if (navigator.vibrate) navigator.vibrate([50, 40, 50, 40, 50, 40, 200])
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <div className="w-full max-w-sm text-center rounded-3xl overflow-hidden shadow-2xl">
        {/* German flag stripes */}
        <div className="h-4 bg-black" />
        <div className="h-4 bg-[#DD0000]" />
        <div className="h-4 bg-[#FFCE00]" />

        <div className="bg-white px-6 py-8">
          <div className="text-6xl mb-3">🇩🇪</div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase mb-1">
            WUNDERBAR!
          </h2>
          <p className="text-lg font-bold text-[#DD0000] mb-4 uppercase tracking-wide">
            Ausgezeichnet, Zoe!
          </p>
          <p className="text-slate-600 text-sm font-medium">
            Du bist <span className="font-black text-slate-900">unglaublich stark.</span>
          </p>
          <p className="text-slate-400 text-xs mt-5">Tap to dismiss</p>
        </div>

        <div className="h-4 bg-[#FFCE00]" />
        <div className="h-4 bg-[#DD0000]" />
        <div className="h-4 bg-black" />
      </div>
    </div>
  )
}
