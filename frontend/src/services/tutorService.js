import api from './api'

const tutorService = {
  async sendMessage(message, conversationId = null, lessonId = null) {
    const { data } = await api.post('/tutor/chat', { message, conversationId, lessonId })
    return data.data // Contiene reply, conversationId, sources
  },

  async getConversations() {
    const { data } = await api.get('/tutor/conversations')
    return data.data // Listado de conversaciones del usuario
  },

  async getConversation(id) {
    const { data } = await api.get(`/tutor/conversations/${id}`)
    return data.data // Historial completo de la conversación
  },

  async deleteConversation(id) {
    const { data } = await api.delete(`/tutor/conversations/${id}`)
    return data.data
  }
}

export default tutorService
