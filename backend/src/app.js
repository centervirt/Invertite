/**
 * INVERTITE — Express Application
 * Configuración central del servidor API
 */
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const app = express();

// ── Seguridad ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true,
  methods:      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
// Global: 100 req / 15min por IP
app.use('/api/', rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: 'Demasiadas solicitudes. Intentá en 15 minutos.' },
}));

// Auth: 5 req / 15min por IP (más estricto para login/register)
// En entorno de tests se deshabilita para no interferir
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs:        15 * 60 * 1000,
      max:             5,
      standardHeaders: true,
      legacyHeaders:   false,
      message: { success: false, message: 'Demasiados intentos. Esperá 15 minutos.' },
    });

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Health check (sin /api/v1 para monitoreo simple) ─────────
app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    app:         'Invertite API',
    version:     '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// ── Rutas API v1 ──────────────────────────────────────────────
app.use('/api/v1/auth',  authLimiter, require('./routes/auth.routes'));
app.use('/api/v1/users',             require('./routes/users.routes'));
app.use('/api/v1/modules',           require('./routes/modules.routes'));
app.use('/api/v1/quizzes',           require('./routes/quizzes.routes'));
app.use('/api/v1/payments',          require('./routes/payments.routes'));
app.use('/api/v1/tutor',             require('./routes/tutor.routes'));
app.use('/api/v1/market',            require('./routes/market.routes'));
// Próximas etapas:
// app.use('/api/v1/simulator', require('./routes/simulator.routes'));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ── Error handler global ──────────────────────────────────────
// En Express 5 los errores async se propagan automáticamente
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Errores de PostgreSQL
  if (err.code === '23505') { // unique_violation
    return res.status(409).json({ success: false, message: 'El recurso ya existe.' });
  }
  if (err.code === '23503') { // foreign_key_violation
    return res.status(400).json({ success: false, message: 'Referencia inválida.' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor.'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
