/**
 * INVERTITE — Rutas del Simulador de Cartera
 * Base: /api/v1/simulator
 */
const router = require('express').Router();
const paperTradingCtrl = require('../controllers/paperTradingController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

router.get('/portfolio',
  authenticate,
  requireSubscription,
  paperTradingCtrl.getPortfolio
);

router.post('/buy',
  authenticate,
  requireSubscription,
  paperTradingCtrl.buyInstrument
);

router.post('/sell',
  authenticate,
  requireSubscription,
  paperTradingCtrl.sellInstrument
);

router.post('/reset',
  authenticate,
  requireSubscription,
  paperTradingCtrl.resetPortfolio
);

router.get('/transactions',
  authenticate,
  requireSubscription,
  paperTradingCtrl.getTransactions
);

router.get('/ranking',
  authenticate,
  paperTradingCtrl.getRanking
);

router.get('/history',
  authenticate,
  requireSubscription,
  paperTradingCtrl.getHistory
);

module.exports = router;
