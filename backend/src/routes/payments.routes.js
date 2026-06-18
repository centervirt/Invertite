/**
 * INVERTITE — Rutas de Pagos
 * Base: /api/v1/payments
 */
const router = require('express').Router();
const paymentCtrl = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/auth');

// Mercado Pago
router.post('/mp/subscribe', authenticate, paymentCtrl.mpSubscribe);
router.post('/mp/preference', authenticate, paymentCtrl.mpPreference);
router.post('/mp/webhook', paymentCtrl.mpWebhook); // Público

// Ualá Bis
router.post('/uala/pay', authenticate, paymentCtrl.ualaPay);
router.post('/uala/webhook', paymentCtrl.ualaWebhook); // Público

// Estado de suscripción
router.get('/status', authenticate, paymentCtrl.getStatus);

// Cancelar suscripción
router.post('/cancel', authenticate, paymentCtrl.cancelSubscription);

module.exports = router;
