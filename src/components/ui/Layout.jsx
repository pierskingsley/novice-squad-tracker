import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-lg mx-auto pb-safe">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
