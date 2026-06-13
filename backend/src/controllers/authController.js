/**
 * INVERTITE — Controlador de Autenticación
 * Maneja: register, login, refresh, logout, me
 */
const bcrypt = require('bcryptjs');
const UserModel   = require('../models/userModel');
const redis       = require('../config/redis');
const {
  generateAccessToken,
  generateRefreshToken,
  successResponse,
  errorResponse,
  serializeUser,
} = require('../utils/helpers');

const BCRYPT_ROUNDS = 12;

// ── POST /api/v1/auth/register ────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    // Verificar email no existente
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json(
        errorResponse('El email ya está registrado. ¿Querés iniciar sesión?')
      );
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Crear usuario en DB
    const user = await UserModel.create({ email, passwordHash, fullName });

    // Generar tokens
    const accessToken              = generateAccessToken(user);
    const { token: refreshToken, jti } = generateRefreshToken();

    // Guardar refresh token en Redis (30 días)
    await redis.saveRefreshToken(user.id, jti, refreshToken);

    return res.status(201).json(
      successResponse(
        {
          user:         serializeUser(user),
          accessToken,
          refreshToken: `${jti}.${refreshToken}`, // jti.token para validar
        },
        '¡Cuenta creada correctamente! Bienvenido/a a Invertite.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/auth/login ───────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json(
        errorResponse('Email o contraseña incorrectos.')
      );
    }

    // Verificar cuenta activa
    if (!user.is_active) {
      return res.status(403).json(
        errorResponse('Tu cuenta está desactivada. Contactá con soporte.')
      );
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json(
        errorResponse('Email o contraseña incorrectos.')
      );
    }

    // Obtener usuario con suscripción
    const userWithSub = await UserModel.findByIdWithSubscription(user.id);

    // Generar tokens
    const accessToken              = generateAccessToken(user);
    const { token: refreshToken, jti } = generateRefreshToken();

    // Guardar refresh token en Redis
    await redis.saveRefreshToken(user.id, jti, refreshToken);

    return res.json(
      successResponse(
        {
          user:         serializeUser(userWithSub || user),
          accessToken,
          refreshToken: `${jti}.${refreshToken}`,
        },
        'Sesión iniciada correctamente.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/auth/refresh ─────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // El refreshToken tiene formato "jti.token"
    const dotIndex = refreshToken.indexOf('.');
    if (dotIndex === -1) {
      return res.status(401).json(errorResponse('Refresh token inválido.'));
    }

    const jti   = refreshToken.substring(0, dotIndex);
    const token = refreshToken.substring(dotIndex + 1);

    // Buscar en Redis — necesitamos el userId, así que buscamos con scan
    // Estrategia: el refreshToken debe incluir userId (lo enviamos en el body)
    const { userId } = req.body;
    if (!userId) {
      return res.status(401).json(errorResponse('userId requerido para refresh.'));
    }

    const stored = await redis.getRefreshToken(userId, jti);
    if (!stored || stored.token !== token) {
      return res.status(401).json(
        errorResponse('Refresh token inválido o expirado. Iniciá sesión nuevamente.')
      );
    }

    // Obtener usuario actualizado
    const user = await UserModel.findById(userId);
    if (!user || !user.is_active) {
      return res.status(401).json(
        errorResponse('Usuario inactivo o no encontrado.')
      );
    }

    // Rotar: eliminar token viejo, generar nuevo par
    await redis.deleteRefreshToken(userId, jti);

    const newAccessToken               = generateAccessToken(user);
    const { token: newRefreshToken, jti: newJti } = generateRefreshToken();
    await redis.saveRefreshToken(user.id, newJti, newRefreshToken);

    return res.json(
      successResponse(
        {
          accessToken:  newAccessToken,
          refreshToken: `${newJti}.${newRefreshToken}`,
        },
        'Token renovado correctamente.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/auth/logout ──────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken, userId } = req.body;

    if (refreshToken && userId) {
      const dotIndex = refreshToken.indexOf('.');
      if (dotIndex !== -1) {
        const jti = refreshToken.substring(0, dotIndex);
        await redis.deleteRefreshToken(userId, jti);
      }
    }

    return res.json(
      successResponse(null, 'Sesión cerrada correctamente.')
    );
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/auth/me ───────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const userWithSub = await UserModel.findByIdWithSubscription(req.user.id);

    if (!userWithSub) {
      return res.status(404).json(
        errorResponse('Usuario no encontrado.')
      );
    }

    return res.json(
      successResponse(
        { user: serializeUser(userWithSub) },
        'Perfil obtenido correctamente.'
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, me };
