/**
 * INVERTITE — Setup inicial de la base de datos
 *
 * Este script crea el usuario y la base de datos si no existen.
 * Conecta como superusuario (postgres) para poder crear usuarios y DBs.
 *
 * Uso:
 *   node src/config/setup-db.js
 *
 * Variables de entorno requeridas (en .env):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   DB_SUPERUSER (default: postgres)
 *   DB_SUPERPASSWORD (password del superusuario)
 */
require('dotenv').config();
const { Client } = require('pg');

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
  title:(msg) => console.log(`\n${c.bold}${c.cyan}${msg}${c.reset}`),
};

async function setupDatabase() {
  log.title('🛠️  INVERTITE — Setup de base de datos PostgreSQL');

  const config = {
    host:     process.env.DB_HOST          || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    user:     process.env.DB_SUPERUSER     || 'postgres',
    password: process.env.DB_SUPERPASSWORD || '',
    database: 'postgres', // Conectar a la DB por defecto primero
    connectionTimeoutMillis: 5000,
  };

  const targetDb   = process.env.DB_NAME     || 'invertite_db';
  const targetUser = process.env.DB_USER     || 'invertite_user';
  const targetPass = process.env.DB_PASSWORD || 'invertite_pass';

  log.info(`Conectando como superusuario "${config.user}" a ${config.host}:${config.port}...`);

  const client = new Client(config);

  try {
    await client.connect();
    log.ok('Conectado como superusuario.');

    // 1. Crear usuario si no existe
    const userExists = await client.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`, [targetUser]
    );
    if (userExists.rows.length === 0) {
      await client.query(
        `CREATE USER ${targetUser} WITH PASSWORD '${targetPass}'`
      );
      log.ok(`Usuario "${targetUser}" creado.`);
    } else {
      log.info(`Usuario "${targetUser}" ya existe.`);
      // Actualizar password por si cambió
      await client.query(
        `ALTER USER ${targetUser} WITH PASSWORD '${targetPass}'`
      );
    }

    // 2. Crear base de datos si no existe
    const dbExists = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]
    );
    if (dbExists.rows.length === 0) {
      await client.query(
        `CREATE DATABASE ${targetDb} OWNER ${targetUser} ENCODING 'UTF8'`
      );
      log.ok(`Base de datos "${targetDb}" creada.`);
    } else {
      log.info(`Base de datos "${targetDb}" ya existe.`);
    }

    // 3. Otorgar privilegios
    await client.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${targetDb} TO ${targetUser}`
    );
    log.ok(`Privilegios otorgados a "${targetUser}" sobre "${targetDb}".`);

    console.log('');
    log.ok('Setup completado. Ahora ejecutá: npm run db:migrate');
    console.log(`${c.dim}   Credenciales configuradas:${c.reset}`);
    console.log(`${c.dim}   DB:       ${targetDb}${c.reset}`);
    console.log(`${c.dim}   Usuario:  ${targetUser}${c.reset}`);
    console.log(`${c.dim}   Password: ${targetPass}${c.reset}`);
    console.log(`${c.dim}   Host:     ${config.host}:${config.port}${c.reset}`);

  } catch (error) {
    log.err(`Error durante el setup: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('');
      log.warn('PostgreSQL no está corriendo. Opciones:');
      console.log(`${c.dim}  Windows: net start postgresql-x64-15${c.reset}`);
      console.log(`${c.dim}  WSL/Linux: sudo service postgresql start${c.reset}`);
      console.log(`${c.dim}  Docker: docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15${c.reset}`);
    } else if (error.code === '28P01') {
      log.warn('Contraseña del superusuario incorrecta.');
      log.info('Agregá DB_SUPERPASSWORD=tu_password al archivo .env');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
