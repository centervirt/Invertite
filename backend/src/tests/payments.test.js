/**
 * INVERTITE — Tests de Integración del Sistema de Pagos
 */

const redisMock = require('./__mocks__/redis.mock');
jest.mock('../config/redis', () => require('./__mocks__/redis.mock'));

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { generateAccessToken } = require('../../src/utils/helpers');
const SubscriptionChecker = require('../../src/services/subscriptionChecker');

let userToken = null;
let userId = null;
let testPlanId = null;
let lifetimePlanId = null;

const testUser = {
  email: `test_payment_${Date.now()}@invertite.ar`,
  password_hash: 'hashedpassword',
  full_name: 'Test Payment User',
  role: 'student'
};

beforeAll(async () => {
  // 1. Crear usuario de prueba
  const userRes = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role) 
     VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
    [testUser.email, testUser.password_hash, testUser.full_name, testUser.role]
  );
  userId = userRes.rows[0].id;
  userToken = generateAccessToken(userRes.rows[0]);

  // 2. Obtener planes desde DB
  const planRes = await pool.query(`SELECT id FROM plans WHERE slug = 'monthly'`);
  if (planRes.rows.length > 0) {
    testPlanId = planRes.rows[0].id;
  } else {
    const newPlan = await pool.query(
      `INSERT INTO plans (name, slug, price_ars, interval, is_active)
       VALUES ('Mensual Test', 'monthly', 4990, 'monthly', true) RETURNING id`
    );
    testPlanId = newPlan.rows[0].id;
  }

  const lifePlanRes = await pool.query(`SELECT id FROM plans WHERE slug = 'lifetime'`);
  if (lifePlanRes.rows.length > 0) {
    lifetimePlanId = lifePlanRes.rows[0].id;
  } else {
    const newLifePlan = await pool.query(
      `INSERT INTO plans (name, slug, price_ars, interval, is_active)
       VALUES ('Vitalicio Test', 'lifetime', 149990, 'lifetime', true) RETURNING id`
    );
    lifetimePlanId = newLifePlan.rows[0].id;
  }
});

afterAll(async () => {
  // Limpiar base de datos
  if (userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
  await pool.end();
  redisMock.clearAll();
});

describe('=== ETAPA 5: API REST — SISTEMA DE PAGOS ===', () => {

  describe('GET /api/v1/payments/status', () => {
    it('✅ Retorna plan libre por defecto si no tiene suscripción activa', async () => {
      const res = await request(app)
        .get('/api/v1/payments/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasActiveSubscription).toBe(false);
      expect(res.body.data.plan.slug).toBe('free');
    });
  });

  describe('POST /api/v1/payments/mp/subscribe', () => {
    it('✅ Genera pre-aprobación / suscripción recurrente en Mercado Pago', async () => {
      const res = await request(app)
        .post('/api/v1/payments/mp/subscribe')
        .send({ planId: testPlanId })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('init_point');
    });
  });

  describe('POST /api/v1/payments/mp/preference', () => {
    it('✅ Genera preferencia de pago para plan único / lifetime', async () => {
      const res = await request(app)
        .post('/api/v1/payments/mp/preference')
        .send({ planId: lifetimePlanId })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('init_point');
    });
  });

  describe('POST /api/v1/payments/uala/pay', () => {
    it('✅ Genera link de pago para Ualá Bis', async () => {
      const res = await request(app)
        .post('/api/v1/payments/uala/pay')
        .send({ planId: testPlanId })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('payment_url');
    });
  });

  describe('Webhooks & Activación de Suscripción', () => {
    it('✅ Webhook MP aprueba e inicia la suscripción del usuario', async () => {
      // Simular payload del webhook de MP con trigger de aprobación
      const webhookPayload = {
        action: 'payment.created',
        data: { id: 'mp-payment-test-999' },
        mock_approved: true,
        mock_user_id: userId,
        mock_plan_id: testPlanId
      };

      const res = await request(app)
        .post('/api/v1/payments/mp/webhook')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activated).toBe(true);

      // Comprobar estado en la DB
      const statusRes = await request(app)
        .get('/api/v1/payments/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(statusRes.body.data.hasActiveSubscription).toBe(true);
      expect(statusRes.body.data.subscription.status).toBe('active');
    });

    it('✅ Webhook Ualá aprueba e inicia la suscripción del usuario', async () => {
      const webhookPayload = {
        uuid: 'uala-checkout-test-999',
        status: 'SUCCESS',
        mock_approved: true,
        mock_user_id: userId,
        mock_plan_id: lifetimePlanId
      };

      const res = await request(app)
        .post('/api/v1/payments/uala/webhook')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activated).toBe(true);

      // Comprobar estado en la DB (debería ser lifetime)
      const statusRes = await request(app)
        .get('/api/v1/payments/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(statusRes.body.data.hasActiveSubscription).toBe(true);
      expect(statusRes.body.data.plan.slug).toBe('lifetime');
    });
  });

  describe('Job de Expiración de Suscripciones (SubscriptionChecker)', () => {
    it('✅ Mantiene activa una suscripción vencida si está dentro de los 3 días de gracia', async () => {
      // 1. Forzar una suscripción vencida hace 1 día (dentro del período de gracia)
      await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan_id, status, payment_provider, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', 'mercadopago', NOW() - INTERVAL '31 days', NOW() - INTERVAL '1 day')`,
        [userId, testPlanId]
      );

      // Correr verificación
      const expiredSubs = await SubscriptionChecker.checkExpiredSubscriptions();
      
      // No debería haber expirado esta suscripción por estar en período de gracia (1 día vencida < 3 días gracia)
      const found = expiredSubs.find(s => s.user_id === userId);
      expect(found).toBeUndefined();

      // Comprobar que sigue activa
      const statusRes = await request(app)
        .get('/api/v1/payments/status')
        .set('Authorization', `Bearer ${userToken}`);
      expect(statusRes.body.data.subscription.status).toBe('active');
    });

    it('✅ Expira una suscripción vencida hace más de 3 días', async () => {
      // 2. Forzar una suscripción vencida hace 4 días (fuera del período de gracia)
      await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan_id, status, payment_provider, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', 'mercadopago', NOW() - INTERVAL '35 days', NOW() - INTERVAL '4 days')`,
        [userId, testPlanId]
      );

      // Correr verificación
      const expiredSubs = await SubscriptionChecker.checkExpiredSubscriptions();

      // Debería haber expirado
      const found = expiredSubs.find(s => s.user_id === userId);
      expect(found).toBeDefined();

      // Comprobar que ya no tiene suscripción activa
      const statusRes = await request(app)
        .get('/api/v1/payments/status')
        .set('Authorization', `Bearer ${userToken}`);
      expect(statusRes.body.data.hasActiveSubscription).toBe(false);
    });
  });

});
