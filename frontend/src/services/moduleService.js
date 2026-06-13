import api from './api'

const moduleService = {
  async getModules() {
    const { data } = await api.get('/modules')
    return data.data // Listado de módulos con progreso
  },

  async getModule(slug) {
    const { data } = await api.get(`/modules/${slug}`)
    return data.data // Detalle de módulo con lecciones y progreso
  },

  async getLesson(moduleSlug, lessonSlug) {
    const { data } = await api.get(`/modules/${moduleSlug}/lessons/${lessonSlug}`)
    return data.data // Contiene lección (con quiz) y progreso del usuario
  },

  async completeLesson(moduleSlug, lessonSlug, seconds) {
    const { data } = await api.post(`/modules/${moduleSlug}/lessons/${lessonSlug}/complete`, { seconds })
    return data.data // Contiene completed: true, badgesEarned, moduleCompleted
  }
}

export default moduleService
