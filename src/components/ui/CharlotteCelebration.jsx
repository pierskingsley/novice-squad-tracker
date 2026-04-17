import { useEffect } from 'react'
import confetti from 'canvas-confetti'

function fireCharlotteConfetti() {
  const burst = (opts) => confetti({ colors: ['#C0392B', '#F5CBA7', '#FFFFFF'], ...opts })
  burst({ particleCount: 100, spread: 70, origin: { x: 0.5, y: 0.4 } })
  setTimeout(() => burst({ particleCount: 60, angle: 60,  spread: 60, origin: { x: 0, y: 0.5 } }), 200)
  setTimeout(() => burst({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.5 } }), 200)
  setTimeout(() => burst({ particleCount: 50, spread: 90, origin: { x: 0.5, y: 0.6 } }), 500)
}

export default function CharlotteCelebration({ onDismiss }) {
  useEffect(() => {
    fireCharlotteConfetti()
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200])
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.80)' }}
    >
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-vesta-red px-6 pt-6 pb-4 text-center">
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            Clover's Speciality
          </h2>
          <p className="text-white/80 text-sm font-semibold mt-1">
            The legendary deadlift 🏋️‍♀️
          </p>
        </div>

        <div className="bg-white">
          <img
            src="/charlotte-deadlift.jpg"
            alt="Charlotte Clover's Special Deadlift"
            className="w-full object-cover max-h-72"
            draggable={false}
          />
        </div>

        <div className="bg-white px-6 pb-6 pt-4 text-center">
          <p className="text-slate-600 text-sm mt-1">
            I hope your back survived 😬
          </p>
          <p className="text-slate-400 text-xs mt-4">Tap to dismiss</p>
        </div>
      </div>
    </div>
  )
}
