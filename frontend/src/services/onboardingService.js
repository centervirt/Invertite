import api from './api';

const onboardingService = {
  getStatus: async () => {
    const { data } = await api.get('/onboarding/status');
    return data.data; // data.data because of successResponse mapping
  },

  saveProfile: async (profileData) => {
    const { data } = await api.post('/onboarding/profile', profileData);
    return data.data;
  },

  recordTourStep: async (stepKey) => {
    const { data } = await api.post('/onboarding/tour-step', { stepKey });
    return data.data;
  },

  completeOnboarding: async () => {
    const { data } = await api.post('/onboarding/complete');
    return data.data;
  }
};

export default onboardingService;
