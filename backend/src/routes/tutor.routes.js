/**
 * INVERTITE — Rutas del Tutor IA
 * Base: /api/v1/tutor
 */
const router = require('express').Router();
const tutorCtrl = require('../controllers/tutorController');
const { authenticate } = require('../middlewares/auth');

router.post('/chat', authenticate, tutorCtrl.chat);
router.get('/conversations/:lessonId', authenticate, tutorCtrl.getConversationHistory);

module.exports = router;
