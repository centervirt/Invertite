/**
 * INVERTITE — Rutas de Autenticación
 * Base: /api/v1/auth
 */
const router     = require('express').Router();
const authCtrl   = require('../controllers/authController');
const { validate, rules } = require('../middlewares/validate');
const { authenticate }    = require('../middlewares/auth');

// POST /api/v1/auth/register
router.post('/register',
  rules.register,
  validate,
  authCtrl.register
);

// POST /api/v1/auth/login
router.post('/login',
  rules.login,
  validate,
  authCtrl.login
);

// POST /api/v1/auth/refresh
router.post('/refresh',
  authCtrl.refresh
);

// POST /api/v1/auth/logout
router.post('/logout',
  authCtrl.logout
);

// GET /api/v1/auth/me  (protegida)
router.get('/me',
  authenticate,
  authCtrl.me
);

module.exports = router;
