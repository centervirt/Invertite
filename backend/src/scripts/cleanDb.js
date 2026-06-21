const { pool } = require('../config/database');

async function clean() {
  await pool.query("DELETE FROM lessons WHERE slug = 'leccion-test-admin' OR title = 'Leccion Test Admin Modificada'");
  await pool.query("DELETE FROM modules WHERE slug = 'modulo-test-admin'");
  console.log('Cleaned database test modules/lessons.');
  process.exit(0);
}

clean();
