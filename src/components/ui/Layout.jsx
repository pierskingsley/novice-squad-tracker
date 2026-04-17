import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#09090B]">
      <main className="max-w-lg mx-auto pb-safe pt-safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
