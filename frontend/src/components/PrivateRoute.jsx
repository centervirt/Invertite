import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PrivateRoute = ({ children, requireSub = true, requireAdmin = false }) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-invertite-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-teal"></div>
      </div>
    )
  }

  // 1. Redirigir a login si no está autenticado
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Redirigir si requiere admin y no lo es
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // 3. Redirigir a checkout si requiere suscripción activa y no la tiene (los admins no requieren)
  const hasActiveSub = user.subscription?.status === 'active' || user.role === 'admin'
  if (requireSub && !hasActiveSub) {
    return <Navigate to="/pagar/mensual" replace />
  }

  return children
}

export default PrivateRoute
