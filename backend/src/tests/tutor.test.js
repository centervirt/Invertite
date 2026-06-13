/**
 * INVERTITE — Tests de Integración del Tutor IA
 */

const redisMock = require('./__mocks__/redis.mock');
jest.mock('../config/redis', () => require('./__mocks__/redis.mock'));

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { generateAccessToken } = require('../../src/utils/helpers');

let userToken = null;
let userId = null;
let lessonId = null;
let moduleId = null;
let testPlanId = null;

const testUser = {
  email: `test_tutor_${Date.now()}@invertite.ar`,
  password_hash: 'hashedpassword',
  full_name: 'Test Tutor User',
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

  // 2. Obtener plan mensual (o crearlo) para la suscripción del test
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

  // 3. Crear suscripción activa (requerida para chatear con el tutor)
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days')`,
    [userId, testPlanId]
  );

  // 4. Crear Módulo y Lección de prueba
  const modRes = await pool.query(
    `INSERT INTO modules (order_index, title, slug, description, color_accent, estimated_hours, is_published)
     VALUES (99999, 'Modulo Test Tutor', 'modulo-test-tutor', 'Modulo para tutor', 'emerald', 1.0, true)
     RETURNING id`
  );
  moduleId = modRes.rows[0].id;

  const lesRes = await pool.query(
    `INSERT INTO lessons (module_id, order_index, title, slug, content_json, estimated_minutes, is_published)
     VALUES ($1, 1, 'Leccion Test Tutor', 'leccion-test-tutor', '{"blocks": []}'::jsonb, 10, true)
     RETURNING id`,
    [moduleId]
  );
  lessonId = lesRes.rows[0].id;
});

afterAll(async () => {
  if (userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
  if (moduleId) {
    await pool.query('DELETE FROM modules WHERE id = $1', [moduleId]);
  }
  await pool.end();
  redisMock.clearAll();
});

describe('=== ETAPA 6: API REST — TUTOR IA CON RAG ===', () => {

  let createdConversationId = null;

  describe('POST /api/v1/tutor/chat (General - sin Lección)', () => {
    it('✅ Inicia chat y devuelve respuesta del tutor (modo mock)', async () => {
      const res = await request(app)
        .post('/api/v1/tutor/chat')
        .send({ message: '¿Cómo compro dólar MEP?' })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('reply');
      expect(res.body.data).toHaveProperty('sources');
      expect(res.body.data).toHaveProperty('conversationId');
      expect(res.body.data.reply).toContain('Tutor IA');
      
      createdConversationId = res.body.data.conversationId;
    });

    it('❌ Rechaza mensaje vacío', async () => {
      const res = await request(app)
        .post('/api/v1/tutor/chat')
        .send({ message: '' })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tutor/chat (Asociado a una Lección)', () => {
    it('✅ Inicia chat con contexto de lección y almacena historial', async () => {
      const res = await request(app)
        .post('/api/v1/tutor/chat')
        .send({ message: 'No entiendo esta lección', lessonId })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('Tutor IA');
    });
  });

  describe('GET /api/v1/tutor/conversations', () => {
    it('✅ Obtiene el listado de conversaciones del usuario', async () => {
      const res = await request(app)
        .get('/api/v1/tutor/conversations')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('lastMessagePreview');
    });
  });

  describe('GET /api/v1/tutor/conversations/:id', () => {
    it('✅ Obtiene el historial completo de una conversación por su ID', async () => {
      const res = await request(app)
        .get(`/api/v1/tutor/conversations/${createdConversationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThan(0);
    });

    it('❌ Retorna 404 si la conversación no existe o no pertenece al usuario', async () => {
      const unusedUUID = 'e7208761-9c60-4824-a212-32b0c3676c38';
      const res = await request(app)
        .get(`/api/v1/tutor/conversations/${unusedUUID}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

});
