/**
 * INVERTITE — Runner de migraciones SQL
 *
 * Ejecuta archivos SQL en orden numérico desde /backend/migrations/
 * Registra cada migración en la tabla schema_migrations para no repetirlas.
 *
 * Uso:
 *   node src/config/migrate.js           → Ejecuta migraciones pendientes
 *   node src/config/migrate.js --status  → Muestra estado de migraciones
 *   node src/config/migrate.js --reset   → ⚠️  Borra y recrea todo (solo dev)
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ── Colores para el log ───────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
};
const log = {
  ok:   (msg) => console.log(`${c.green}✅ ${msg}${c.reset}`),
  err:  (msg) => console.log(`${c.red}❌ ${msg}${c.reset}`),
  warn: (msg) => console.log(`${c.yellow}⚠️  ${msg}${c.reset}`),
  info: (msg) => console.log(`${c.cyan}ℹ️  ${msg}${c.reset}`),
  dim:  (msg) => console.log(`${c.dim}   ${msg}${c.reset}`),
  title:(msg) => console.log(`\n${c.bold}${c.cyan}${msg}${c.reset}`),
};

// ── Configuración ─────────────────────────────────────────────
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'invertite_db',
  user:     process.env.DB_USER     || 'invertite_user',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
});

// ── Asegurar que existe la tabla de control ───────────────────
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// ── Obtener migraciones ya ejecutadas ────────────────────────
async function getExecutedMigrations(client) {
  const result = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY id'
  );
  return new Set(result.rows.map(r => r.filename));
}

// ── Obtener archivos SQL disponibles ─────────────────────────
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    log.err(`Directorio de migraciones no encontrado: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Orden numérico por nombre
}

// ── Ejecutar una migración ────────────────────────────────────
async function runMigration(client, filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  const start = Date.now();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    await client.query('COMMIT');
    const duration = Date.now() - start;
    log.ok(`${filename} (${duration}ms)`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    log.err(`${filename} → ${error.message}`);
    if (error.detail) log.dim(`Detalle: ${error.detail}`);
    if (error.hint)   log.dim(`Sugerencia: ${error.hint}`);
    return false;
  }
}

// ── Comando: --status ─────────────────────────────────────────
async function showStatus(client) {
  log.title('📋 Estado de migraciones');
  const files    = getMigrationFiles();
  const executed = await getExecutedMigrations(client);

  if (files.length === 0) {
    log.warn('No hay archivos de migración en /migrations');
    return;
  }

  for (const file of files) {
    const done = executed.has(file);
    console.log(`  ${done ? `${c.green}✅` : `${c.yellow}⏳`} ${file}${c.reset}`);
  }

  const pending = files.filter(f => !executed.has(f));
  console.log('');
  log.info(`Total: ${files.length} | Ejecutadas: ${executed.size} | Pendientes: ${pending.length}`);
}

// ── Comando: --reset (solo desarrollo) ───────────────────────
async function resetDatabase(client) {
  if (process.env.NODE_ENV === 'production') {
    log.err('--reset no está permitido en producción.');
    process.exit(1);
  }
  log.warn('Reseteando base de datos... (todas las tablas serán eliminadas)');
  await client.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  log.ok('Base de datos reseteada.');
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isStatus = args.includes('--status');
  const isReset  = args.includes('--reset');

  log.title('🔄 INVERTITE — Migraciones PostgreSQL');
  log.dim(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT} | DB: ${process.env.DB_NAME}`);

  let client;
  try {
    client = await pool.connect();
    log.ok('Conectado a PostgreSQL');
  } catch (error) {
    log.err(`No se pudo conectar: ${error.message}`);
    log.warn('Verificá que PostgreSQL esté corriendo y que el .env sea correcto.');
    log.dim(`  DB_HOST=${process.env.DB_HOST}`);
    log.dim(`  DB_PORT=${process.env.DB_PORT}`);
    log.dim(`  DB_NAME=${process.env.DB_NAME}`);
    log.dim(`  DB_USER=${process.env.DB_USER}`);
    process.exit(1);
  }

  try {
    await ensureMigrationsTable(client);

    if (isReset) {
      await resetDatabase(client);
    }

    if (isStatus) {
      await showStatus(client);
      return;
    }

    // Ejecutar migraciones pendientes
    const files    = getMigrationFiles();
    const executed = await getExecutedMigrations(client);
    const pending  = files.filter(f => !executed.has(f));

    if (pending.length === 0) {
      log.ok('No hay migraciones pendientes. Base de datos al día.');
      return;
    }

    log.title(`📦 Ejecutando ${pending.length} migración(es) pendiente(s):`);

    let successCount = 0;
    for (const file of pending) {
      const ok = await runMigration(client, file);
      if (!ok) {
        log.err(`Migración abortada en: ${file}`);
        log.warn('Las migraciones posteriores NO se ejecutaron.');
        process.exit(1);
      }
      successCount++;
    }

    console.log('');
    log.ok(`${successCount} migración(es) ejecutada(s) correctamente.`);
    await showStatus(client);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
