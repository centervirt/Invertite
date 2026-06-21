require('dotenv').config();
const { query } = require('./src/config/database');

async function fix() {
  const userRes = await query(`SELECT id FROM users WHERE email = 'alumno@test.com'`);
  const userId = userRes.rows[0].id;
  const planRes = await query(`SELECT id FROM plans WHERE slug = 'lifetime'`);
  const planId = planRes.rows[0].id;
  
  await query(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);
  await query(`INSERT INTO subscriptions (user_id, plan_id, status, payment_provider, created_at, updated_at) VALUES ($1, $2, 'active', 'manual', NOW(), NOW())`, [userId, planId]);
  console.log('Sub assigned');
}
fix().finally(()=>process.exit(0));
