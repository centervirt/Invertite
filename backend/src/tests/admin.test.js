/**
 * INVERTITE — Tests de Integración del Panel Administrativo
 */

const redisMock = require('./__mocks__/redis.mock');
jest.mock('../config/redis', () => require('./__mocks__/redis.mock'));

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { generateAccessToken } = require('../../src/utils/helpers');

let studentToken = null;
let studentId = null;
let adminToken = null;
let adminId = null;
let testPlanId = null;
let createdModuleId = null;
let createdLessonId = null;

const testStudent = {
  email: `test_admin_student_${Date.now()}@invertite.ar`,
  password_hash: 'hashedpassword',
  full_name: 'Test Admin Student',
  role: 'student'
};

const testAdmin = {
  email: `test_admin_user_${Date.now()}@invertite.ar`,
  password_hash: 'hashedpassword',
  full_name: 'Test Admin User',
  role: 'admin'
};

beforeAll(async () => {
  // 1. Crear usuario estudiante
  const studentRes = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role) 
     VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
    [testStudent.email, testStudent.password_hash, testStudent.full_name, testStudent.role]
  );
  studentId = studentRes.rows[0].id;
  studentToken = generateAccessToken(studentRes.rows[0]);

  // 2. Crear usuario administrador
  const adminRes = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role) 
     VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
    [testAdmin.email, testAdmin.password_hash, testAdmin.full_name, testAdmin.role]
  );
  adminId = adminRes.rows[0].id;
  adminToken = generateAccessToken(adminRes.rows[0]);

  // 3. Obtener o crear plan mensual
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
});

afterAll(async () => {
  if (studentId) await pool.query('DELETE FROM users WHERE id = $1', [studentId]);
  if (adminId) await pool.query('DELETE FROM users WHERE id = $1', [adminId]);
  if (createdLessonId) await pool.query('DELETE FROM lessons WHERE id = $1', [createdLessonId]);
  if (createdModuleId) await pool.query('DELETE FROM modules WHERE id = $1', [createdModuleId]);
  await pool.end();
  redisMock.clearAll();
});

describe('=== ETAPA 11: API REST — PANEL DE ADMINISTRACIÓN ===', () => {

  describe('Autorización de Rutas Administrativas', () => {
    it('❌ Rechaza el acceso a usuarios sin token (401)', async () => {
      const res = await request(app).get('/api/v1/admin/metrics');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('❌ Rechaza el acceso a usuarios que no son admin (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('administradores');
    });

    it('✅ Permite el acceso a administradores (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
    });
  });

  describe('CRUD de Contenido (Módulos y Lecciones)', () => {
    it('✅ Permite listar todos los módulos', async () => {
      const res = await request(app)
        .get('/api/v1/admin/modules')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✅ Permite crear un módulo', async () => {
      const res = await request(app)
        .post('/api/v1/admin/modules')
        .send({
          orderIndex: 8888,
          title: 'Modulo Test Admin',
          slug: 'modulo-test-admin',
          description: 'Prueba de creación',
          colorAccent: 'blue',
          estimatedHours: 2,
          isPublished: false
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('modulo-test-admin');
      createdModuleId = res.body.data.id;
    });

    it('✅ Permite crear una lección', async () => {
      const res = await request(app)
        .post('/api/v1/admin/lessons')
        .send({
          moduleId: createdModuleId,
          orderIndex: 1,
          title: 'Leccion Test Admin',
          slug: 'leccion-test-admin',
          contentJson: [{ type: 'paragraph', text: 'Contenido test' }],
          estimatedMinutes: 15,
          isPublished: false
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('leccion-test-admin');
      createdLessonId = res.body.data.id;
    });

    it('✅ Permite editar una lección y publicarla', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/lessons/${createdLessonId}`)
        .send({
          title: 'Leccion Test Admin Modificada',
          isPublished: true
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Leccion Test Admin Modificada');
      expect(res.body.data.isPublished).toBe(true);
    });

    it('✅ Permite despublicar lección mediante endpoint específico', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/lessons/${createdLessonId}/publish`)
        .send({ isPublished: false })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPublished).toBe(false);
    });
  });

  describe('Gestión de Usuarios y Suscripciones', () => {
    it('✅ Permite listar los usuarios de la plataforma', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('✅ Permite ver el detalle de un usuario', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testStudent.email);
    });

    it('✅ Permite activar manualmente la suscripción de un estudiante', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/users/${studentId}/subscription`)
        .send({ status: 'active', planSlug: 'monthly' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription.status).toBe('active');
    });

    it('✅ Permite cancelar la suscripción de un estudiante', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/users/${studentId}/subscription`)
        .send({ status: 'expired' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription).toBeNull();
    });
  });
});
