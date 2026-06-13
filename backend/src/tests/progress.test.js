/**
 * INVERTITE — Tests de Progreso, Lecciones, Quizzes y Badges
 */

const redisMock = require('./__mocks__/redis.mock');
jest.mock('../config/redis', () => require('./__mocks__/redis.mock'));

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { generateAccessToken } = require('../../src/utils/helpers');

let userToken = null;
let userId = null;
let testPlanId = null;

// IDs de recursos de prueba creados dinámicamente
let moduleId = null;
let lessonId = null;
let quizId = null;

const testUser = {
  email: `test_progress_${Date.now()}@invertite.ar`,
  password_hash: 'hashedpassword',
  full_name: 'Test Progress User',
  role: 'student'
};

beforeAll(async () => {
  // 1. Crear usuario
  const userRes = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role) 
     VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
    [testUser.email, testUser.password_hash, testUser.full_name, testUser.role]
  );
  userId = userRes.rows[0].id;
  userToken = generateAccessToken(userRes.rows[0]);

  // 2. Obtener plan mensual (o crearlo si no existe)
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

  // 3. Crear suscripción activa para el usuario
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days')`,
    [userId, testPlanId]
  );

  // 4. Crear Módulo de prueba
  const modRes = await pool.query(
    `INSERT INTO modules (order_index, title, slug, description, color_accent, estimated_hours, is_published)
     VALUES (9999, 'Modulo Test Progreso', 'modulo-test-progreso', 'Descripcion de test', 'teal', 2.0, true)
     RETURNING id`
  );
  moduleId = modRes.rows[0].id;

  // 5. Crear Lección de prueba
  const lesRes = await pool.query(
    `INSERT INTO lessons (module_id, order_index, title, slug, content_json, estimated_minutes, is_published)
     VALUES ($1, 1, 'Leccion Test 1', 'leccion-test-1', '{"blocks": []}'::jsonb, 15, true)
     RETURNING id`,
    [moduleId]
  );
  lessonId = lesRes.rows[0].id;

  // 6. Crear Quiz de prueba
  const quizRes = await pool.query(
    `INSERT INTO quizzes (lesson_id, module_id, quiz_type, pass_score)
     VALUES ($1, $2, 'lesson', 70) RETURNING id`,
    [lessonId, moduleId]
  );
  quizId = quizRes.rows[0].id;

  // 7. Crear preguntas para el Quiz
  await pool.query(
    `INSERT INTO quiz_questions (quiz_id, order_index, question_text, options, correct_option, explanation)
     VALUES 
     ($1, 1, '¿Cuál es la moneda de Argentina?', '["Peso", "Dólar", "Euro", "Real"]'::jsonb, 0, 'El peso es la moneda oficial.'),
     ($1, 2, '¿Qué significa TNA?', '["Tasa Nacional Anual", "Tasa Nominal Anual", "Total Neto Anual", "Tasa Neta Activa"]'::jsonb, 1, 'TNA significa Tasa Nominal Anual.')`,
    [quizId]
  );
});

afterAll(async () => {
  // Limpiar base de datos
  if (userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
  if (moduleId) {
    await pool.query('DELETE FROM modules WHERE id = $1', [moduleId]);
  }
  await pool.end();
  redisMock.clearAll();
});

describe('=== ETAPA 4: API REST — PROGRESO Y APRENDIZAJE ===', () => {

  describe('GET /api/v1/modules', () => {
    it('✅ Lista los módulos publicados con progreso', async () => {
      const res = await request(app)
        .get('/api/v1/modules')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      const testMod = res.body.data.find(m => m.id === moduleId);
      expect(testMod).toBeDefined();
      expect(testMod.totalLessons).toBe(1);
      expect(testMod.completedLessons).toBe(0);
      expect(testMod.progressPct).toBe(0);
    });

    it('❌ Deniega acceso sin suscripción activa', async () => {
      // Registrar usuario sin suscripción
      const tempUserRes = await pool.query(
        `INSERT INTO users (email, password_hash, full_name) 
         VALUES ($1, $2, $3) RETURNING id, email, role`,
        [`temp_${Date.now()}@invertite.ar`, 'pass', 'Temp User']
      );
      const tempToken = generateAccessToken(tempUserRes.rows[0]);

      const res = await request(app)
        .get('/api/v1/modules')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('suscripción activa');

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [tempUserRes.rows[0].id]);
    });
  });

  describe('GET /api/v1/modules/:slug', () => {
    it('✅ Obtiene el detalle de un módulo por slug', async () => {
      const res = await request(app)
        .get('/api/v1/modules/modulo-test-progreso')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('modulo-test-progreso');
      expect(res.body.data.lessons.length).toBe(1);
      expect(res.body.data.lessons[0].slug).toBe('leccion-test-1');
    });

    it('❌ Retorna 404 si el módulo no existe', async () => {
      const res = await request(app)
        .get('/api/v1/modules/modulo-no-existe')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/modules/:moduleSlug/lessons/:lessonSlug', () => {
    it('✅ Obtiene contenido de lección y crea progreso in_progress', async () => {
      const res = await request(app)
        .get('/api/v1/modules/modulo-test-progreso/lessons/leccion-test-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lesson.slug).toBe('leccion-test-1');
      expect(res.body.data.progress.status).toBe('in_progress');
    });
  });

  describe('POST /api/v1/modules/:moduleSlug/lessons/:lessonSlug/complete', () => {
    it('✅ Marca lección como completada y otorga badges', async () => {
      const res = await request(app)
        .post('/api/v1/modules/modulo-test-progreso/lessons/leccion-test-1/complete')
        .send({ seconds: 120 })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completed).toBe(true);
      expect(res.body.data.moduleCompleted).toBe(true);
      expect(Array.isArray(res.body.data.badgesEarned)).toBe(true);
      // Al ser la primera lección completada, debería ganar el badge 'Primer Paso'
      const firstStepBadge = res.body.data.badgesEarned.find(b => b.name === 'Primer Paso');
      expect(firstStepBadge).toBeDefined();
    });
  });

  describe('GET /api/v1/quizzes/:quizId', () => {
    it('✅ Obtiene preguntas del quiz sin revelar respuestas correctas', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questions.length).toBe(2);
      expect(res.body.data.questions[0]).not.toHaveProperty('correct_option');
      expect(res.body.data.questions[0]).not.toHaveProperty('explanation');
    });
  });

  describe('POST /api/v1/quizzes/:quizId/attempt', () => {
    it('✅ Procesa intento de quiz y calcula score correctamente', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${quizId}/attempt`)
        .send({ answers: [0, 1] }) // Las dos correctas
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(100);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.results[0].isCorrect).toBe(true);
      expect(res.body.data.results[1].isCorrect).toBe(true);
    });

    it('✅ Procesa intento fallido', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${quizId}/attempt`)
        .send({ answers: [3, 3] }) // Ambas incorrectas
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(0);
      expect(res.body.data.passed).toBe(false);
    });
  });

  describe('GET /api/v1/users/badges', () => {
    it('✅ Obtiene el listado completo de badges con estado de obtención del usuario', async () => {
      const res = await request(app)
        .get('/api/v1/users/badges')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      const earnedBadge = res.body.data.find(b => b.name === 'Primer Paso');
      expect(earnedBadge).toBeDefined();
      expect(earnedBadge.earned).toBe(true);
    });
  });

});
