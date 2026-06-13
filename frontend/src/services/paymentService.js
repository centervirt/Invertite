import api from './api'

const paymentService = {
  async createSubscription(planId) {
    const { data } = await api.post('/payments/mp/subscribe', { planId })
    return data.data // Contiene init_point
  },

  async createPreference(planId) {
    const { data } = await api.post('/payments/mp/preference', { planId })
    return data.data // Contiene init_point, preference_id
  },

  async createUalaPay(planId) {
    const { data } = await api.post('/payments/uala/pay', { planId })
    return data.data // Contiene payment_url
  },

  async getStatus() {
    const { data } = await api.get('/payments/status')
    return data.data // Contiene hasActiveSubscription, subscription, plan
  }
}

export default paymentService
