import React from 'react'
import { useAuth } from '../context/AuthContext'

const Dashboard = () => {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-invertite-dark text-slate-200 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-white">Dashboard de Inversiones</h1>
        <div className="bg-invertite-card p-6 rounded-2xl border border-slate-900 space-y-4">
          <p>Hola, <strong>{user?.fullName}</strong>. ¡Bienvenido a tu panel!</p>
          <p>Plan actual: <span className="bg-accent-teal/10 text-accent-teal text-xs px-2.5 py-1 rounded-full font-bold">{user?.subscription?.planName || 'Gratuito'}</span></p>
          <button onClick={logout} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-xs font-bold transition-all">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
