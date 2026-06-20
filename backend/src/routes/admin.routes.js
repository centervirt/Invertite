/**
 * INVERTITE — Rutas de Administración
 * Base: /api/v1/admin
 */
const router = require('express').Router();
const adminCtrl = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Middleware global para todas las rutas de este router
router.use(authenticate, requireAdmin);

// Usuarios
router.get('/users', adminCtrl.listUsers);
router.get('/users/:id', adminCtrl.getUserDetail);
router.put('/users/:id/subscription', adminCtrl.updateUserSubscription);
router.post('/users/:id/reset', adminCtrl.resetUserProgress);
router.put('/users/:id/status', adminCtrl.updateUserStatus);
router.delete('/users/:id', adminCtrl.deactivateOrDeleteUser);

// Contenido
router.get('/modules', adminCtrl.listModules);
router.post('/modules', adminCtrl.createModule);
router.put('/modules/:id', adminCtrl.updateModule);
router.post('/lessons', adminCtrl.createLesson);
router.put('/lessons/:id', adminCtrl.updateLesson);
router.put('/lessons/:id/publish', adminCtrl.togglePublishLesson);

// Métricas
router.get('/metrics', adminCtrl.getMetrics);

module.exports = router;
