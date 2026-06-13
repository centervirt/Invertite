/**
 * INVERTITE — Rutas de Usuarios
 * Base: /api/v1/users
 */
const router    = require('express').Router();
const userCtrl  = require('../controllers/userController');
const { authenticate, requireSubscription } = require('../middlewares/auth');
const { validate, rules }                   = require('../middlewares/validate');

// GET /api/v1/users/profile
router.get('/profile',
  authenticate,
  userCtrl.getProfile
);

// PUT /api/v1/users/profile
router.put('/profile',
  authenticate,
  rules.updateProfile,
  validate,
  userCtrl.updateProfile
);

// GET /api/v1/users/dashboard (requiere autenticación, pero no suscripción activa)
// El dashboard está disponible para todos los usuarios — el contenido varía según plan
router.get('/dashboard',
  authenticate,
  userCtrl.getDashboard
);

module.exports = router;
