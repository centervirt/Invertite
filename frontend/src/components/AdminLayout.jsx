import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navItems = [
    { name: 'Overview', path: '/admin', icon: '📊', end: true },
    { name: 'Usuarios', path: '/admin/users', icon: '👥' },
    { name: 'Pagos y suscripciones', path: '/admin/users?filter=sub', icon: '💰' },
    { name: 'Contenido (módulos/lecciones)', path: '/admin/contenido', icon: '📚' },
    { name: 'Estadísticas', path: '/admin', icon: '📈' },
    { name: 'Configuración', path: '/admin/users', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-invertite-dark text-slate-100 flex flex-col font-sans">
      
      {/* TOPBAR */}
      <header className="h-16 bg-slate-950 border-b border-slate-900 flex justify-between items-center px-4 sm:px-6 sticky top-0 z-40 select-none">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            ☰
          </button>
          
          <Link to="/admin" className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
            <span>INVERT<span className="text-accent-teal">ITE</span></span>
            <span className="text-[9px] bg-accent-blue/15 text-accent-blue font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link 
            to="/dashboard" 
            className="hidden sm:inline-block text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-800 transition-all"
          >
            Volver a Alumno 👨‍🎓
          </Link>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-none">{user?.fullName}</span>
              <span className="text-[9px] text-accent-teal mt-1 uppercase font-bold tracking-wider">
                Administrador
              </span>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-accent-blue to-accent-teal flex items-center justify-center font-bold text-invertite-dark text-sm border border-slate-800">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">

        {/* SIDEBAR (Escritorio) */}
        <aside className="hidden md:flex flex-col w-56 bg-slate-950 border-r border-slate-900 p-4 sticky top-16 h-[calc(100vh-64px)] justify-between select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-4">Administración</span>
            {navItems.map((item) => (
              <NavLink 
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-accent-blue/10 text-accent-blue' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <div className="space-y-2">
            <Link 
              to="/dashboard" 
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 md:hidden"
            >
              <span>👨‍🎓</span>
              <span>Vista Alumno</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-all"
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* SIDEBAR (Móvil) Overlay */}
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
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-4">Administración</span>
            {navItems.map((item) => (
              <NavLink 
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-accent-blue/10 text-accent-blue' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <div className="space-y-2">
            <Link 
              to="/dashboard" 
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <span>👨‍🎓</span>
              <span>Vista Alumno</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-all"
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-invertite-dark max-h-[calc(100vh-64px)]">
          {children}
        </main>

      </div>
    </div>
  )
}

export default AdminLayout
