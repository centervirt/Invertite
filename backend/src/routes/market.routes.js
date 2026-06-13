/**
 * INVERTITE — Rutas de Datos de Mercado
 * Base: /api/v1/market
 */
const router = require('express').Router();
const marketCtrl = require('../controllers/marketController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

router.get('/ticker', authenticate, requireSubscription, marketCtrl.getTicker);
router.get('/chart-data/:dataKey', authenticate, requireSubscription, marketCtrl.getChartData);

module.exports = router;
