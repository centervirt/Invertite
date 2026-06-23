/**
 * INVERTITE - Onboarding Routes
 */
const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { authenticate } = require('../middlewares/auth');

router.get('/status', authenticate, onboardingController.getStatus);
router.post('/profile', authenticate, onboardingController.saveProfile);
router.post('/tour-step', authenticate, onboardingController.recordTourStep);
router.post('/complete', authenticate, onboardingController.completeOnboarding);

module.exports = router;
