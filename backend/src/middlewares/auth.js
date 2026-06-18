/**
 * INVERTITE — Middlewares de autenticación y autorización
 */
const { verifyAccessToken, errorResponse } = require('../utils/helpers');
const UserModel = require('../models/userModel');

// ── authenticate ──────────────────────────────────────────────
/**
 * Verifica el JWT del header Authorization.
 * Adjunta `req.user = { id, email, role }` si es válido.
 * Retorna 401 si falta o es inválido, 403 si expiró.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(
      errorResponse('Token de autenticación requerido.')
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Verificar que el usuario aún exista y esté activo
    const user = await UserModel.findById(payload.sub);
    if (!user || !user.is_active) {
      return res.status(401).json(
        errorResponse('Usuario inactivo o no encontrado.')
      );
    }

    req.user = {
      id:    user.id,
      email: user.email,
      role:  user.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(
        errorResponse('El token expiró. Iniciá sesión nuevamente.')
      );
    }
    return res.status(401).json(
      errorResponse('Token inválido.')
    );
  }
};

// ── requireSubscription ───────────────────────────────────────
/**
 * Verifica que el usuario tenga una suscripción activa.
 * Debe usarse DESPUÉS de `authenticate`.
 */
const requireSubscription = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') {
      req.subscription = {
        id:        'admin-bypass',
        status:    'active',
        plan:      'yearly',
        planName:  'Administrador',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
      return next();
    }

    const userWithSub = await UserModel.findByIdWithSubscription(req.user.id);

    if (!userWithSub?.sub_status || userWithSub.sub_status !== 'active') {
      return res.status(403).json(
        errorResponse(
          'Esta función requiere una suscripción activa.',
          [{ field: 'subscription', message: 'Sin suscripción activa' }]
        )
      );
    }

    // Adjuntar info de suscripción al request
    req.subscription = {
      id:        userWithSub.sub_id,
      status:    userWithSub.sub_status,
      plan:      userWithSub.plan_slug,
      planName:  userWithSub.plan_name,
      expiresAt: userWithSub.sub_expires_at,
    };

    next();
  } catch (err) {
    next(err);
  }
};

// ── requireAdmin ──────────────────────────────────────────────
/**
 * Verifica que el usuario tenga role === 'admin'.
 * Debe usarse DESPUÉS de `authenticate`.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(
      errorResponse('Acceso restringido a administradores.')
    );
  }
  next();
};

module.exports = { authenticate, requireSubscription, requireAdmin };
