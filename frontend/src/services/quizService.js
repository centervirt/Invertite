import api from './api'

const quizService = {
  async getQuiz(quizId) {
    const { data } = await api.get(`/quizzes/${quizId}`)
    return data.data // Contiene quiz y preguntas sin correct_option
  },

  async submitAttempt(quizId, answers) {
    const { data } = await api.post(`/quizzes/${quizId}/attempt`, { answers })
    return data.data // Contiene score, passed, results, badgesEarned
  }
}

export default quizService
