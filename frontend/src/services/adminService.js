import api from './api'

const adminService = {
  async getMetrics() {
    const { data } = await api.get('/admin/metrics')
    return data.data
  },

  async getUsers() {
    const { data } = await api.get('/admin/users')
    return data.data
  },

  async getUsersWithParams(params) {
    const { data } = await api.get('/admin/users', { params })
    return data.data
  },

  async getUserDetail(id) {
    const { data } = await api.get(`/admin/users/${id}`)
    return data.data
  },

  async updateUserSubscription(id, status, planSlug) {
    const { data } = await api.put(`/admin/users/${id}/subscription`, { status, planSlug })
    return data.data
  },

  async resetUserProgress(id) {
    const { data } = await api.post(`/admin/users/${id}/reset`)
    return data.data
  },

  async getModules() {
    const { data } = await api.get('/admin/modules')
    return data.data
  },

  async createModule(moduleData) {
    const { data } = await api.post('/admin/modules', moduleData)
    return data.data
  },

  async updateModule(id, moduleData) {
    const { data } = await api.put(`/admin/modules/${id}`, moduleData)
    return data.data
  },

  async createLesson(lessonData) {
    const { data } = await api.post('/admin/lessons', lessonData)
    return data.data
  },

  async updateLesson(id, lessonData) {
    const { data } = await api.put(`/admin/lessons/${id}`, lessonData)
    return data.data
  },

  async togglePublishLesson(id, isPublished) {
    const { data } = await api.put(`/admin/lessons/${id}/publish`, { isPublished })
    return data.data
  },

  async updateUserStatus(id, isActive) {
    const { data } = await api.put(`/admin/users/${id}/status`, { isActive })
    return data.data
  },

  async deleteUser(id) {
    const { data } = await api.delete(`/admin/users/${id}`)
    return data.data
  }
}

export default adminService
