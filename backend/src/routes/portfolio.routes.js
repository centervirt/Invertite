/**
 * INVERTITE — Rutas del Simulador de Cartera
 * Base: /api/v1/portfolio
 */
const router = require('express').Router();
const portfolioCtrl = require('../controllers/portfolioController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

router.get('/',
  authenticate,
  requireSubscription,
  portfolioCtrl.getPortfolio
);

router.post('/positions',
  authenticate,
  requireSubscription,
  portfolioCtrl.addPosition
);

router.put('/positions/:id',
  authenticate,
  requireSubscription,
  portfolioCtrl.updatePosition
);

router.delete('/positions/:id',
  authenticate,
  requireSubscription,
  portfolioCtrl.deletePosition
);

router.get('/history',
  authenticate,
  requireSubscription,
  portfolioCtrl.getHistory
);
router.post('/reset',
  authenticate,
  requireSubscription,
  portfolioCtrl.resetPortfolio
);
module.exports = router;
