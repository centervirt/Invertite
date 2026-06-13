/**
 * INVERTITE — Mock de Redis para tests
 * Implementación en memoria (Map) que reemplaza Redis cuando NODE_ENV=test
 * Se activa automáticamente via jest.config / jest.setup
 */

const store = new Map();

const get = async (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const set = async (key, value, ttlSeconds = null) => {
  store.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
  return true;
};

const setWithExpiry = (key, value, ttlSeconds) => set(key, value, ttlSeconds);

const del = async (key) => { store.delete(key); return true; };

const exists = async (key) => store.has(key);

const ttl = async (key) => {
  const entry = store.get(key);
  if (!entry) return -2;
  if (!entry.expiresAt) return -1;
  return Math.ceil((entry.expiresAt - Date.now()) / 1000);
};

// Helpers de refresh token (misma interfaz que redis.js)
const REFRESH_TTL = 2592000;

const KEYS = {
  refreshToken: (userId, jti) => `rt:${userId}:${jti}`,
  rateLimit:    (ip)          => `rl:${ip}`,
  cache:        (key)         => `cache:${key}`,
};

const saveRefreshToken   = (userId, jti, token) =>
  setWithExpiry(KEYS.refreshToken(userId, jti), { token, userId }, REFRESH_TTL);

const getRefreshToken    = (userId, jti) => get(KEYS.refreshToken(userId, jti));
const deleteRefreshToken = (userId, jti) => del(KEYS.refreshToken(userId, jti));

// Utilitario para tests: limpiar el store
const clearAll = () => store.clear();

module.exports = {
  get, set, setWithExpiry, del, exists, ttl,
  KEYS, saveRefreshToken, getRefreshToken, deleteRefreshToken,
  clearAll,
  // Stub para getClient (no se usa en tests)
  getClient: async () => ({ ping: async () => 'PONG' }),
};
