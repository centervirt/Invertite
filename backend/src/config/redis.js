/**
 * INVERTITE — Cliente Redis
 * Gestiona refresh tokens, caché y sesiones.
 * Usa el paquete oficial `redis` v4 (compatible con Redis 7).
 */
require('dotenv').config();
const { createClient } = require('redis');

// ── Singleton del cliente ─────────────────────────────────────
let client = null;
let isReady = false;

const getClient = async () => {
  if (client && isReady) return client;

  client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Redis: máx reintentos alcanzado');
        return Math.min(retries * 200, 5000);
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('ready',        () => { isReady = true;  console.log('✅ Redis conectado'); });
  client.on('error',   (e) => { isReady = false; console.error('❌ Redis error:', e.message); });
  client.on('end',          () => { isReady = false; console.log('⚠️  Redis desconectado'); });
  client.on('reconnecting', () => console.log('🔄 Redis reconectando...'));

  await client.connect();
  return client;
};

// ── Prefijos de claves ────────────────────────────────────────
const KEYS = {
  refreshToken: (userId, jti) => `rt:${userId}:${jti}`,
  rateLimit:    (ip)          => `rl:${ip}`,
  cache:        (key)         => `cache:${key}`,
};

// ── API pública ───────────────────────────────────────────────

/**
 * Obtener valor (deserializa JSON automáticamente)
 */
const get = async (key) => {
  try {
    const redis = await getClient();
    const val = await redis.get(key);
    if (val === null) return null;
    try { return JSON.parse(val); } catch { return val; }
  } catch (e) {
    console.error('Redis get error:', e.message);
    return null;
  }
};

/**
 * Guardar valor con TTL opcional en segundos
 */
const set = async (key, value, ttlSeconds = null) => {
  try {
    const redis = await getClient();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setEx(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
    return true;
  } catch (e) {
    console.error('Redis set error:', e.message);
    return false;
  }
};

/**
 * Alias semántico: guardar con expiración
 */
const setWithExpiry = (key, value, ttlSeconds) => set(key, value, ttlSeconds);

/**
 * Eliminar clave
 */
const del = async (key) => {
  try {
    const redis = await getClient();
    await redis.del(key);
    return true;
  } catch (e) {
    console.error('Redis del error:', e.message);
    return false;
  }
};

/**
 * Verificar si una clave existe
 */
const exists = async (key) => {
  try {
    const redis = await getClient();
    return (await redis.exists(key)) === 1;
  } catch (e) {
    console.error('Redis exists error:', e.message);
    return false;
  }
};

/**
 * TTL restante de una clave (en segundos). -2 si no existe, -1 si no expira.
 */
const ttl = async (key) => {
  try {
    const redis = await getClient();
    return redis.ttl(key);
  } catch (e) {
    return -2;
  }
};

// ── Helpers específicos para refresh tokens ───────────────────

const REFRESH_TTL = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS) || 60 * 60 * 24 * 30; // 30 días

/**
 * Almacena un refresh token en Redis.
 * @param {string} userId
 * @param {string} jti   - ID único del token
 * @param {string} token - Token opaco
 */
const saveRefreshToken = (userId, jti, token) => {
  const key = KEYS.refreshToken(userId, jti);
  return setWithExpiry(key, { token, userId }, REFRESH_TTL);
};

/**
 * Valida que el refresh token exista y coincida.
 * @returns {{ token, userId } | null}
 */
const getRefreshToken = (userId, jti) => {
  return get(KEYS.refreshToken(userId, jti));
};

/**
 * Invalida (elimina) un refresh token — logout.
 */
const deleteRefreshToken = (userId, jti) => {
  return del(KEYS.refreshToken(userId, jti));
};

module.exports = {
  getClient,
  get,
  set,
  setWithExpiry,
  del,
  exists,
  ttl,
  KEYS,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
};
