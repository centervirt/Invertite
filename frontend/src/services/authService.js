import api from './api'

const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    return data.data // Contiene user, accessToken, refreshToken
  },

  async register(fullName, email, password) {
    const { data } = await api.post('/auth/register', { fullName, email, password })
    return data.data // Contiene user, accessToken, refreshToken
  },

  async logout(refreshToken) {
    const { data } = await api.post('/auth/logout', { refreshToken })
    return data
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data.data // Contiene user serializado con suscripción
  }
}

export default authService
