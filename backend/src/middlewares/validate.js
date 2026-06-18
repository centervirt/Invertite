/**
 * INVERTITE — Middleware de validación con express-validator
 */
const { validationResult, body } = require('express-validator');
const { errorResponse } = require('../utils/helpers');

/**
 * Ejecuta los resultados de validación y responde 422 si hay errores.
 * Debe ir DESPUÉS de las reglas de validación en la ruta.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({
      field:   e.path,
      message: e.msg,
    }));
    return res.status(422).json(
      errorResponse('Datos inválidos. Revisá los campos.', formatted)
    );
  }
  next();
};

// ── Reglas de validación reutilizables ────────────────────────

const rules = {
  register: [
    body('email')
      .isEmail().withMessage('Email inválido.')
      .normalizeEmail()
      .trim(),
    body('password')
      .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
      .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una mayúscula.')
      .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número.'),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/).withMessage('El nombre solo puede contener letras.'),
  ],

  login: [
    body('email')
      .isEmail().withMessage('Email inválido.')
      .normalizeEmail()
      .trim(),
    body('password')
      .notEmpty().withMessage('La contraseña es requerida.'),
  ],

  updateProfile: [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
    body('avatarUrl')
      .optional()
      .isLength({ max: 500 }).withMessage('El avatar/URL es demasiado largo.')
      .custom((value) => {
        if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
          try {
            new URL(value);
          } catch (err) {
            throw new Error('La URL del avatar es inválida.');
          }
        }
        return true;
      }),
  ],

  refreshToken: [
    body('refreshToken')
      .notEmpty().withMessage('refreshToken es requerido.')
      .isUUID(4).withMessage('Format de refreshToken inválido.'),
  ],
};

module.exports = { validate, rules };
