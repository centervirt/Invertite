/**
 * INVERTITE — Rutas de Quizzes
 * Base: /api/v1/quizzes
 */
const router = require('express').Router();
const quizCtrl = require('../controllers/quizController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

router.get('/:quizId',
  authenticate,
  requireSubscription,
  quizCtrl.getQuiz
);

router.post('/:quizId/attempt',
  authenticate,
  requireSubscription,
  quizCtrl.submitAttempt
);

module.exports = router;
