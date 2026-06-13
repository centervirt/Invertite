/**
 * INVERTITE — Configuración del pool de conexiones PostgreSQL
 * Usa variables de entorno definidas en backend/.env
 */
require('dotenv').config();
const { Pool } = require('pg');

// ── Pool de conexiones ────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'invertite_db',
  user:     process.env.DB_USER     || 'invertite_user',
  password: process.env.DB_PASSWORD || '',
  // Configuración del pool
  max:                    20,
  min:                    2,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 5000,
  // SSL: controlado por DB_SSL en .env (false para EasyPanel sin SSL)
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
});

// ── Manejadores de eventos del pool ──────────────────────────
pool.on('connect', (client) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 Nueva conexión a PostgreSQL establecida');
  }
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

// ── Verificación de conexión al iniciar ──────────────────────
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS server_time, current_database() AS db_name');
    client.release();
    console.log(`✅ PostgreSQL conectado → DB: "${result.rows[0].db_name}" | Hora servidor: ${result.rows[0].server_time}`);
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a PostgreSQL:', error.message);
    console.error('   Verificá que PostgreSQL esté corriendo y que el .env sea correcto.');
    return false;
  }
};

// ── Helper: query con logging en desarrollo ──────────────────
/**
 * Ejecuta una query con parámetros.
 * @param {string} text - SQL query
 * @param {Array}  params - Parámetros parametrizados
 * @returns {Promise<QueryResult>}
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
      const shortQuery = text.replace(/\s+/g, ' ').trim().substring(0, 100);
      console.log(`🔍 [${duration}ms] ${shortQuery}${text.length > 100 ? '...' : ''} → ${result.rowCount} filas`);
    }

    return result;
  } catch (error) {
    console.error('❌ Error en query PostgreSQL:', {
      query:   text.substring(0, 200),
      params,
      error:   error.message,
      code:    error.code,
    });
    throw error;
  }
};

// ── Helper: query que retorna una sola fila ──────────────────
const queryOne = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// ── Helper: query que retorna todas las filas ────────────────
const queryAll = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows;
};

// ── Helper: transacciones ────────────────────────────────────
/**
 * Ejecuta un bloque de código dentro de una transacción.
 * Hace COMMIT si todo sale bien, ROLLBACK si hay error.
 * @param {Function} callback - async (client) => resultado
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transacción revertida:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// ── Helper: paginación ───────────────────────────────────────
/**
 * Agrega LIMIT y OFFSET a una query para paginación.
 * @param {string} baseQuery
 * @param {number} page  - Página (1-indexed)
 * @param {number} limit - Items por página
 * @param {Array}  params
 */
const queryPaginated = async (baseQuery, page = 1, limit = 20, params = []) => {
  const offset = (page - 1) * limit;
  const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS count_query`;
  const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const [countResult, dataResult] = await Promise.all([
    query(countQuery, params),
    query(paginatedQuery, [...params, limit, offset]),
  ]);

  const total = parseInt(countResult.rows[0].count);
  return {
    data:        dataResult.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext:    page < Math.ceil(total / limit),
      hasPrev:    page > 1,
    },
  };
};

module.exports = {
  pool,
  query,
  queryOne,
  queryAll,
  withTransaction,
  queryPaginated,
  testConnection,
};
