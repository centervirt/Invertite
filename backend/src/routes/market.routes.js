/**
 * INVERTITE — Rutas de Datos de Mercado
 * Base: /api/v1/market
 */
const router = require('express').Router();
const marketCtrl = require('../controllers/marketController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

// ── Rutas Públicas ─────────────────────────────────────────────
router.get('/dolar', marketCtrl.getDolar);
router.get('/caucion', marketCtrl.getCaucion);

// ── Rutas Autenticadas ──────────────────────────────────────────
router.get('/price/:type/:ticker', authenticate, marketCtrl.getPrice);
router.post('/prices', authenticate, marketCtrl.getPrices);

// ── Rutas con Suscripción Requerida ─────────────────────────────
router.get('/chart-data/:dataKey', authenticate, requireSubscription, marketCtrl.getChartData);

module.exports = router;
