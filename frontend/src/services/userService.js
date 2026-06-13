import api from './api'

const userService = {
  async getDashboard() {
    const { data } = await api.get('/users/dashboard')
    return data.data
  },

  async getProfile() {
    const { data } = await api.get('/users/profile')
    return data.data
  },

  async updateProfile(profileData) {
    const { data } = await api.put('/users/profile', profileData)
    return data.data
  },

  async getBadges() {
    const { data } = await api.get('/users/badges')
    return data.data
  }
}

export default userService
