import axios from 'axios'
import toast from 'react-hot-toast'

// Instancia base de Axios usando VITE_API_URL o fallback local
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: adjuntar token JWT ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('invertite_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: manejo de errores y refresh token ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // 401: token vencido → intentar refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('invertite_refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
        
        const newAccessToken = data.data.accessToken
        localStorage.setItem('invertite_token', newAccessToken)
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Si el refresh falla, cerrar sesión
        localStorage.removeItem('invertite_token')
        localStorage.removeItem('invertite_refresh_token')
        localStorage.removeItem('invertite_user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Mensajes de error amigables
    const message = error.response?.data?.message || 'Error de conexión. Revisá tu internet.'

    if (error.response?.status === 403) {
      toast.error('No tenés permisos para realizar esta acción.')
    } else if (error.response?.status === 429) {
      toast.error('Demasiadas solicitudes. Esperá unos minutos.')
    } else if (error.response?.status >= 500) {
      toast.error('Error del servidor. Intentá de nuevo más tarde.')
    }

    return Promise.reject({ ...error, userMessage: message })
  }
)

export default api
