import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AlertBell from './AlertBell'

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navItems = [
    { name: 'Inicio', path: '/dashboard', icon: '🏠' },
    { name: 'Módulos', path: '/modulos', icon: '📚' },
    { name: 'Mi Cartera', path: '/cartera', icon: '💼' },
    { name: 'Simulador', path: '/simulador', icon: '🎮' },
    { name: 'Ranking', path: '/ranking', icon: '🏆' },
    { name: 'Alertas', path: '/alertas', icon: '🔔' },
    { name: 'Tutor IA', path: '/tutor', icon: '🤖' },
    { name: 'Mi Perfil', path: '/perfil', icon: '👤' },
  ]

  return (
    <div className="min-h-screen bg-invertite-dark text-slate-100 flex flex-col font-sans">
      
      {/* ── TOPBAR ── */}
      <header className="h-16 bg-slate-950 border-b border-slate-900 flex justify-between items-center px-4 sm:px-6 sticky top-0 z-40 select-none">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            ☰
          </button>
          
          <Link to="/" className="text-xl font-black text-white tracking-tight">
            INVERT<span className="text-accent-teal">ITE</span>
          </Link>
        </div>

        {/* Right: User menu */}
        <div className="flex items-center space-x-4">
          <AlertBell />
          
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-bold text-white leading-none">{user?.fullName}</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
              Plan {user?.subscription?.planName || 'Free'}
            </span>
          </div>

          {/* Avatar */}
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-accent-teal to-accent-blue flex items-center justify-center font-bold text-invertite-dark text-sm border border-slate-800">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">

        {/* ── SIDEBAR (Escritorio) ── */}
        <aside className="hidden md:flex flex-col w-56 bg-slate-950 border-r border-slate-900 p-4 sticky top-16 h-[calc(100vh-64px)] justify-between select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-4">Navegación</span>
            {navItems.map((item) => (
              <NavLink 
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-accent-teal/10 text-accent-teal' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-all mt-auto"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </aside>

        {/* ── SIDEBAR (Móvil) Overlay ── */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar Drawer */}
        <aside className={`fixed inset-y-16 left-0 z-45 w-56 bg-slate-950 p-4 flex flex-col justify-between border-r border-slate-900 transition-transform duration-300 md:hidden h-[calc(100vh-64px)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-4">Navegación</span>
            {navItems.map((item) => (
              <NavLink 
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-accent-teal/10 text-accent-teal' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <button 
            onClick={() => {
              setIsSidebarOpen(false)
              handleLogout()
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-all"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0 bg-invertite-dark p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>

      </div>
    </div>
  )
}

export default DashboardLayout
