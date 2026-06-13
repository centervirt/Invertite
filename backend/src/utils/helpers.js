/**
 * INVERTITE — Helpers y utilidades generales
 */
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

// ── JWT ───────────────────────────────────────────────────────

/**
 * Genera un access token JWT con payload del usuario.
 * @param {{ id, email, role }} user
 * @returns {string} token firmado
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Genera un refresh token opaco (UUID) único.
 * @returns {{ token: string, jti: string }}
 */
const generateRefreshToken = () => {
  const jti   = crypto.randomUUID();
  const token = crypto.randomUUID();
  return { token, jti };
};

/**
 * Verifica y decodifica un access token JWT.
 * @param {string} token
 * @returns {object} payload decodificado
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// ── Respuestas estandarizadas ─────────────────────────────────

/**
 * Construye un objeto de respuesta exitosa.
 */
const successResponse = (data, message = 'OK', meta = null) => ({
  success: true,
  message,
  data,
  ...(meta && { meta }),
});

/**
 * Construye un objeto de respuesta de error.
 */
const errorResponse = (message, errors = null) => ({
  success: false,
  message,
  ...(errors && { errors }),
});

// ── Formatters ────────────────────────────────────────────────

/**
 * Serializa un usuario para la respuesta pública (sin password_hash).
 */
const serializeUser = (user) => ({
  id:            user.id,
  email:         user.email,
  fullName:      user.full_name,
  avatarUrl:     user.avatar_url || null,
  role:          user.role,
  emailVerified: user.email_verified,
  createdAt:     user.created_at,
  subscription:  user.sub_id ? {
    id:        user.sub_id,
    status:    user.sub_status,
    plan:      user.plan_slug,
    planName:  user.plan_name,
    expiresAt: user.sub_expires_at,
  } : null,
});

// ── Cálculo de racha (streak) ─────────────────────────────────

/**
 * Calcula la racha actual de días consecutivos de actividad.
 * Recibe un array de fechas de actividad (Date | string).
 * @param {Array<Date|string>} activityDates
 * @returns {number} días consecutivos hasta hoy
 */
const calculateStreak = (activityDates) => {
  if (!activityDates || activityDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Conjunto de días únicos con actividad (YYYY-MM-DD)
  const activeDays = new Set(
    activityDates.map(d => new Date(d).toISOString().split('T')[0])
  );

  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (activeDays.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  successResponse,
  errorResponse,
  serializeUser,
  calculateStreak,
};
