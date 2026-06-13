/**
 * INVERTITE — Rutas del Tutor IA
 * Base: /api/v1/tutor
 */
const router = require('express').Router();
const tutorCtrl = require('../controllers/tutorController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

// POST /api/v1/tutor/chat (requiere autenticación y suscripción activa)
router.post('/chat', authenticate, requireSubscription, tutorCtrl.chat);

// GET /api/v1/tutor/conversations (requiere sólo autenticación para ver el historial)
router.get('/conversations', authenticate, tutorCtrl.getConversationsList);
router.get('/conversations/:id', authenticate, tutorCtrl.getConversationById);

module.exports = router;
