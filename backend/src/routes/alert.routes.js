/**
 * INVERTITE — Rutas del Sistema de Alertas
 * Base: /api/v1/alerts
 */
const router = require('express').Router();
const alertCtrl = require('../controllers/alertController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

router.get('/',
  authenticate,
  requireSubscription,
  alertCtrl.getNotifications
);

router.post('/mark-read',
  authenticate,
  alertCtrl.markAsRead
);

router.get('/rules',
  authenticate,
  requireSubscription,
  alertCtrl.getRules
);

router.post('/rules',
  authenticate,
  requireSubscription,
  alertCtrl.createRule
);

router.delete('/rules/:id',
  authenticate,
  alertCtrl.deleteRule
);

module.exports = router;
