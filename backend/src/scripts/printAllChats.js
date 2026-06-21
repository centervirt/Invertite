const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const res = await pool.query("SELECT * FROM tutor_conversations ORDER BY updated_at DESC");
    console.log(`Found ${res.rows.length} conversations:`);
    res.rows.forEach((row, i) => {
      console.log(`\n--- Conversation ${i+1} (ID: ${row.id}, User ID: ${row.user_id}) ---`);
      console.log('Messages:', JSON.stringify(row.messages, null, 2));
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
