/**
 * INVERTITE — Script de prueba de suscripciones
 * Testea activación de planes monthly, yearly y lifetime con mock webhook
 * Uso: node src/scripts/testSubscriptions.js [email]
 *
 * Si no se pasa email, crea/usa un usuario de prueba: test-sub@invertite.ar
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, query } = require('../config/database');
const SubscriptionService = require('../services/subscriptionService');

const TEST_EMAIL    = process.argv[2] || 'test-sub@invertite.ar';
const TEST_PASSWORD = 'Test1234!';
const TEST_NAME     = 'Usuario Test Suscripciones';

// Colores para la consola
const ok  = (msg) => console.log(`  ✅ ${msg}`);
const err = (msg) => console.log(`  ❌ ${msg}`);
const inf = (msg) => console.log(`  ℹ️  ${msg}`);
const sep = ()    => console.log('\n' + '─'.repeat(55));

// ── Helpers ──────────────────────────────────────────────────

async function getOrCreateTestUser() {
  let user = await queryOne(
    `SELECT id, email, full_name, role FROM users WHERE email = $1`,
    [TEST_EMAIL]
  );

  if (!user) {
    inf(`Creando usuario de prueba: ${TEST_EMAIL}...`);
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    user = await queryOne(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, 'student', true, true)
       RETURNING id, email, full_name, role`,
      [TEST_EMAIL, hash, TEST_NAME]
    );
    ok(`Usuario creado: ${user.id}`);
  } else {
    inf(`Usando usuario existente: ${user.email} (${user.id})`);
  }
  return user;
}

async function cancelAllSubscriptions(userId) {
  await query(
    `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
}

async function getCurrentSubscription(userId) {
  return await queryOne(
    `SELECT s.id, s.status, s.current_period_end,
            p.slug AS plan_slug, p.name AS plan_name, p.interval
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active'
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );
}

async function getAllPlans() {
  return await queryAll(
    `SELECT id, slug, name, interval, price_ars FROM plans WHERE is_active = true ORDER BY price_ars`
  );
}

// ── Tests ─────────────────────────────────────────────────────

async function testPlan(userId, planSlug, planName) {
  console.log(`\n  📋 Testeando plan: ${planName} (slug: ${planSlug})`);

  // 1. Cancelar suscripción activa previa
  await cancelAllSubscriptions(userId);
  inf('Suscripciones previas canceladas');

  // 2. Activar suscripción via SubscriptionService (simula lo que hace el webhook)
  try {
    const result = await SubscriptionService.activateSubscription(
      userId,
      planSlug, // Pasamos el slug como haría el mock webhook
      {
        provider: 'mercadopago',
        providerPaymentId: `test-${planSlug}-${Date.now()}`
      }
    );
    ok(`activateSubscription completado → sub.id: ${result.id}`);
  } catch (e) {
    err(`activateSubscription FALLÓ: ${e.message}`);
    return false;
  }

  // 3. Verificar en DB
  const sub = await getCurrentSubscription(userId);
  if (!sub) {
    err('No se encontró suscripción activa en DB después de activar');
    return false;
  }

  ok(`Suscripción activa en DB:`);
  console.log(`       • Plan:    ${sub.plan_name} (${sub.plan_slug})`);
  console.log(`       • Status:  ${sub.status}`);
  console.log(`       • Expira:  ${sub.current_period_end ? sub.current_period_end.toISOString().split('T')[0] : 'NUNCA (lifetime)'}`);
  console.log(`       • Sub ID:  ${sub.id}`);

  // 4. Verificar via getStatus
  const status = await SubscriptionService.getStatus(userId);
  if (!status.hasActiveSubscription) {
    err('getStatus retornó hasActiveSubscription: false (debería ser true)');
    return false;
  }
  ok(`getStatus OK → plan: ${status.plan.slug}, activa: ${status.hasActiveSubscription}`);

  return true;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║    INVERTITE — Test de Suscripciones               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`  Usuario de prueba: ${TEST_EMAIL}`);

  let passed = 0;
  let failed = 0;
  const results = [];

  try {
    // Setup
    const user  = await getOrCreateTestUser();
    const plans = await getAllPlans();

    sep();
    console.log(`  Planes disponibles en DB:`);
    plans.forEach(p => {
      console.log(`  • ${p.name.padEnd(12)} slug: ${p.slug.padEnd(10)} interval: ${p.interval.padEnd(10)} precio: $${p.price_ars}`);
    });

    const plansToTest = [
      { slug: 'monthly',  name: 'Plan Mensual'  },
      { slug: 'yearly',   name: 'Plan Anual'    },
      { slug: 'lifetime', name: 'Plan Vitalicio' },
    ];

    for (const plan of plansToTest) {
      sep();
      const planExists = plans.find(p => p.slug === plan.slug);
      if (!planExists) {
        err(`Plan "${plan.slug}" NO existe en la base de datos!`);
        results.push({ plan: plan.name, ok: false, error: 'Plan no encontrado en DB' });
        failed++;
        continue;
      }

      const ok = await testPlan(user.id, plan.slug, plan.name);
      results.push({ plan: plan.name, ok });
      if (ok) passed++; else failed++;
    }

    // Limpiar al final — dejar sin suscripción activa
    sep();
    await cancelAllSubscriptions(user.id);
    inf('Suscripciones de prueba canceladas (cleanup)');

    // Resumen
    sep();
    console.log('\n  📊 RESUMEN:');
    results.forEach(r => {
      console.log(`  ${r.ok ? '✅' : '❌'} ${r.plan}${r.error ? ' — ' + r.error : ''}`);
    });
    console.log(`\n  Total: ${passed} pasaron, ${failed} fallaron`);

    if (failed === 0) {
      console.log('\n  🎉 ¡Todos los planes funcionan correctamente!\n');
    } else {
      console.log('\n  ⚠️  Algunos planes tienen problemas. Revisá los errores arriba.\n');
    }

  } catch (e) {
    console.error('\n❌ Error inesperado:', e.message);
    console.error(e.stack);
  } finally {
    process.exit(0);
  }
}

main();
