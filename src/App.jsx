import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FullScreenSpinner } from './components/ui/Spinner'
import Layout from './components/ui/Layout'
import Login from './pages/Login'
import Home from './pages/athlete/Home'
import History from './pages/athlete/History'
import Progress from './pages/athlete/Progress'
import Profile from './pages/athlete/Profile'
import SessionEdit from './pages/athlete/SessionEdit'
import Programmes from './pages/coach/Programmes'
import ProgrammeBuilder from './pages/coach/ProgrammeBuilder'
import Squad from './pages/coach/Squad'
import AthleteDetail from './pages/coach/AthleteDetail'
import Heatmap from './pages/coach/Heatmap'
import { ROLES } from './lib/constants'

function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === ROLES.COACH ? '/coach/programmes' : '/athlete/home'} replace />
  }
  return children
}

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.role === ROLES.COACH) return <Navigate to="/coach/programmes" replace />
  return <Navigate to="/athlete/home" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Athlete */}
      <Route
        path="/athlete"
        element={
          <ProtectedRoute role={ROLES.ATHLETE}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<Home />} />
        <Route path="history" element={<History />} />
        <Route path="progress" element={<Progress />} />
        <Route path="profile" element={<Profile />} />
        <Route path="session/:id" element={<SessionEdit />} />
      </Route>

      {/* Coach */}
      <Route
        path="/coach"
        element={
          <ProtectedRoute role={ROLES.COACH}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="programmes" element={<Programmes />} />
        <Route path="programmes/new" element={<ProgrammeBuilder />} />
        <Route path="programmes/:id/edit" element={<ProgrammeBuilder />} />
        <Route path="squad" element={<Squad />} />
        <Route path="squad/:id" element={<AthleteDetail />} />
        <Route path="heatmap" element={<Heatmap />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
