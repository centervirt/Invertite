import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

// Páginas
import Landing from './pages/Landing'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'
import Modules from './pages/Modules'
import ModuleDetail from './pages/ModuleDetail'
import Lesson from './pages/Lesson'
import TutorChat from './pages/TutorChat'
import Profile from './pages/Profile'
import Checkout from './pages/Checkout'
import PaymentResult from './pages/PaymentResult'

// Guard para redirigir a dashboard si el usuario ya está autenticado (para login/registro)
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-invertite-dark text-slate-100">
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Landing />} />
          
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          } />
          
          <Route path="/registro" element={
            <PublicOnlyRoute>
              <Registro />
            </PublicOnlyRoute>
          } />

          {/* Rutas Privadas — Sin requerir suscripción (ej: Perfil, Checkout, etc.) */}
          <Route path="/pagar/:planSlug" element={
            <PrivateRoute requireSub={false}>
              <Checkout />
            </PrivateRoute>
          } />
          
          <Route path="/pago/resultado" element={
            <PrivateRoute requireSub={false}>
              <PaymentResult />
            </PrivateRoute>
          } />
          
          <Route path="/perfil" element={
            <PrivateRoute requireSub={false}>
              <Profile />
            </PrivateRoute>
          } />

          {/* Rutas Privadas — Con requerimiento de suscripción activa */}
          <Route path="/dashboard" element={
            <PrivateRoute requireSub={true}>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/modulos" element={
            <PrivateRoute requireSub={true}>
              <Modules />
            </PrivateRoute>
          } />
          
          <Route path="/modulos/:slug" element={
            <PrivateRoute requireSub={true}>
              <ModuleDetail />
            </PrivateRoute>
          } />
          
          <Route path="/modulos/:moduleSlug/lecciones/:lessonSlug" element={
            <PrivateRoute requireSub={true}>
              <Lesson />
            </PrivateRoute>
          } />
          
          <Route path="/tutor" element={
            <PrivateRoute requireSub={true}>
              <TutorChat />
            </PrivateRoute>
          } />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-invertite-dark">
              <div className="text-center">
                <h2 className="text-6xl font-black text-white mb-4">404</h2>
                <p className="text-slate-400 text-sm">Página no encontrada</p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
