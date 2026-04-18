import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-ci-chalk dark:bg-ci-dark-bg">
      <main className="max-w-lg mx-auto pb-safe pt-safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
