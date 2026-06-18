import React, { createContext, useContext, useState, useEffect } from 'react'
import authService from '../services/authService'
import paymentService from '../services/paymentService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 1. Restaurar sesión al iniciar
  useEffect(() => {
    const initSession = async () => {
      const storedToken = localStorage.getItem('invertite_token')
      const storedUser = localStorage.getItem('invertite_user')

      if (storedToken && storedUser) {
        try {
          setAccessToken(storedToken)
          setUser(JSON.parse(storedUser))
          setIsAuthenticated(true)

          // Validar sesión contra el servidor en segundo plano
          const userData = await authService.me()
          setUser(userData)
          localStorage.setItem('invertite_user', JSON.stringify(userData))
        } catch (err) {
          console.error('Error al verificar sesión:', err)
          // Si expira o falla, el Axios interceptor se encargará de refrescar o cerrar sesión
        }
      }
      setIsLoading(false)
    }

    initSession()
  }, [])

  // 2. Login
  const login = async (email, password) => {
    setIsLoading(true)
    try {
      const data = await authService.login(email, password)
      
      localStorage.setItem('invertite_token', data.accessToken)
      localStorage.setItem('invertite_refresh_token', data.refreshToken)
      localStorage.setItem('invertite_user', JSON.stringify(data.user))

      setAccessToken(data.accessToken)
      setUser(data.user)
      setIsAuthenticated(true)
      
      return data.user
    } catch (err) {
      setIsAuthenticated(false)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Registro
  const register = async (fullName, email, password) => {
    setIsLoading(true)
    try {
      const data = await authService.register(fullName, email, password)

      localStorage.setItem('invertite_token', data.accessToken)
      localStorage.setItem('invertite_refresh_token', data.refreshToken)
      localStorage.setItem('invertite_user', JSON.stringify(data.user))

      setAccessToken(data.accessToken)
      setUser(data.user)
      setIsAuthenticated(true)

      return data.user
    } catch (err) {
      setIsAuthenticated(false)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // 4. Logout
  const logout = async () => {
    const rToken = localStorage.getItem('invertite_refresh_token')
    if (rToken) {
      try {
        await authService.logout(rToken, user?.id)
      } catch (err) {
        console.error('Error al revocar refresh token en logout:', err)
      }
    }

    localStorage.removeItem('invertite_token')
    localStorage.removeItem('invertite_refresh_token')
    localStorage.removeItem('invertite_user')

    setAccessToken(null)
    setUser(null)
    setIsAuthenticated(false)
  }

  // 5. Refrescar detalles de suscripción del usuario
  const refreshUser = async () => {
    try {
      const userData = await authService.me()
      setUser(userData)
      localStorage.setItem('invertite_user', JSON.stringify(userData))
    } catch (err) {
      console.error('Error al actualizar datos de usuario:', err)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return context
}
