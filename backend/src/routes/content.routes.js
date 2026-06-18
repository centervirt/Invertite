/**
 * INVERTITE — Rutas de Contenido y Novedades
 * Base: /api/v1/content
 */
const router = require('express').Router();
const contentCtrl = require('../controllers/contentController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

router.get('/weekly-summary',
  authenticate,
  contentCtrl.getWeeklySummary
);

module.exports = router;
