/**
 * INVERTITE — Rutas de Módulos y Lecciones
 * Base: /api/v1/modules
 */
const router = require('express').Router();
const moduleCtrl = require('../controllers/moduleController');
const lessonCtrl = require('../controllers/lessonController');
const { authenticate, requireSubscription } = require('../middlewares/auth');

// Módulos
router.get('/',
  authenticate,
  requireSubscription,
  moduleCtrl.getModules
);

router.get('/:slug',
  authenticate,
  requireSubscription,
  moduleCtrl.getModuleBySlug
);

// Lecciones (dentro de módulos)
router.get('/:moduleSlug/lessons/:lessonSlug',
  authenticate,
  requireSubscription,
  lessonCtrl.getLesson
);

router.post('/:moduleSlug/lessons/:lessonSlug/complete',
  authenticate,
  requireSubscription,
  lessonCtrl.completeLesson
);

module.exports = router;
