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

  // 2. Crear Módulo y Lección de prueba para asociar la conversación
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

  describe('POST /api/v1/tutor/chat (General - sin Lección)', () => {
    it('✅ Inicia chat y devuelve respuesta del tutor (modo mock)', async () => {
      const res = await request(app)
        .post('/api/v1/tutor/chat')
        .send({ message: '¿Cómo compro dólar MEP?' })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('response');
      expect(res.body.data).toHaveProperty('sources');
      expect(res.body.data).toHaveProperty('conversationId');
      expect(res.body.data.response).toContain('Tutor IA');
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
      expect(res.body.data.response).toContain('Tutor IA');

      // Consultar historial
      const historyRes = await request(app)
        .get(`/api/v1/tutor/conversations/${lessonId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.success).toBe(true);
      expect(historyRes.body.data.messages.length).toBe(2);
      expect(historyRes.body.data.messages[0].role).toBe('user');
      expect(historyRes.body.data.messages[1].role).toBe('assistant');
    });
  });

  describe('GET /api/v1/tutor/conversations/:lessonId', () => {
    it('✅ Obtiene el historial general', async () => {
      const res = await request(app)
        .get('/api/v1/tutor/conversations/general')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThan(0);
    });

    it('✅ Retorna arreglo vacío si no hay conversación para la lección', async () => {
      const unusedUUID = 'e7208761-9c60-4824-a212-32b0c3676c38';
      const res = await request(app)
        .get(`/api/v1/tutor/conversations/${unusedUUID}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toEqual([]);
    });
  });

});
