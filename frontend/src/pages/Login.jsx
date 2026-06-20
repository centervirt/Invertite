import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

const Login = () => {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Redireccionar al destino anterior si existe (por ejemplo, después de ser interceptado por PrivateRoute)
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const loggedUser = await login(email, password)
      const target = loggedUser?.role === 'admin' && from === '/dashboard' ? '/admin' : from
      navigate(target, { replace: true })
    } catch (err) {
      console.error(err)
      setError(err.userMessage || 'Credenciales inválidas. Por favor, verificá tus datos.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-invertite-dark text-slate-100 min-h-screen flex items-center justify-center px-4 font-sans selection:bg-accent-teal selection:text-invertite-dark">
      <div className="w-full max-w-md bg-invertite-card border border-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        
        {/* Línea gradiente decorativa */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-teal to-accent-blue"></div>

        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black text-white tracking-tight">
            INVERT<span className="text-accent-teal">ITE</span>
          </Link>
          <h2 className="text-lg font-bold text-slate-200 mt-4">Iniciar Sesión</h2>
          <p className="text-xs text-slate-400 mt-1">Ingresá a tu cuenta comitente educativa</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold mb-6 flex items-start space-x-2">
            <span className="text-sm">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuemail@correo.com"
              className="w-full bg-slate-950 border border-slate-800 focus:border-accent-teal focus:ring-1 focus:ring-accent-teal rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contraseña</label>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 focus:border-accent-teal focus:ring-1 focus:ring-accent-teal rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-slate-900">
          <p className="text-xs text-slate-400">
            ¿No tenés una cuenta?{' '}
            <Link to="/registro" className="text-accent-teal font-bold hover:underline">
              Registrate gratis
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Login
