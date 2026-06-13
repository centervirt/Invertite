const { createClient } = require('redis');

let client;
let isConnected = false;

const getRedisClient = async () => {
  if (client && isConnected) return client;

  client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('❌ Redis: Máximo de reintentos alcanzado.');
          return new Error('Redis: Máximo de reintentos.');
        }
        return Math.min(retries * 100, 3000);
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('connect', () => {
    isConnected = true;
    console.log('✅ Redis conectado');
  });

  client.on('error', (err) => {
    isConnected = false;
    console.error('❌ Redis error:', err.message);
  });

  client.on('end', () => {
    isConnected = false;
    console.log('⚠️  Redis desconectado');
  });

  await client.connect();
  return client;
};

// Helpers de alto nivel
const redisHelpers = {
  /**
   * Guardar valor con TTL opcional (en segundos)
   */
  async set(key, value, ttlSeconds = null) {
    const redis = await getRedisClient();
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setEx(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  /**
   * Obtener valor y deserializar
   */
  async get(key) {
    const redis = await getRedisClient();
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  /**
   * Eliminar clave
   */
  async del(key) {
    const redis = await getRedisClient();
    await redis.del(key);
  },

  /**
   * Verificar si una clave existe (para blacklist de tokens)
   */
  async exists(key) {
    const redis = await getRedisClient();
    return (await redis.exists(key)) === 1;
  },

  /**
   * Obtener TTL restante de una clave
   */
  async ttl(key) {
    const redis = await getRedisClient();
    return redis.ttl(key);
  },
};

module.exports = { getRedisClient, ...redisHelpers };
