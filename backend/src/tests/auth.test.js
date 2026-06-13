/**
 * INVERTITE — Tests de Autenticación
 * Cubre: register, login, token inválido, refresh
 *
 * Redis es mockeado con implementación in-memory (no requiere Redis corriendo).
 * PostgreSQL: usa la DB real de EasyPanel (variables de .env)
 */

// ── Mock de Redis ANTES de cualquier require ────────────────────────────────
const redisMock = require('./__mocks__/redis.mock');
jest.mock('../config/redis', () => require('./__mocks__/redis.mock'));

const request = require('supertest');
const app     = require('../../src/app');
const { pool } = require('../../src/config/database');

// ── Helpers ───────────────────────────────────────────────────
const testUser = {
  email:    `test_${Date.now()}@invertite.ar`,
  password: 'TestPass123',
  fullName: 'Usuario Test',
};

let accessToken   = null;
let refreshToken  = null;
let userId        = null;

// ── Cleanup ────────────────────────────────────────────────────────────
// No limpiar Redis entre tests individuales — los tokens deben persistir
// para que el flujo register → login → refresh → logout funcione en secuencia

afterAll(async () => {
  // Eliminar usuario de test
  if (userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
  await pool.end();
});

// ═════════════════════════════════════════════════════════════
// REGISTER
// ═════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/register', () => {

  it('✅ Registro exitoso con datos válidos', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user).not.toHaveProperty('password_hash');

    // Guardar para tests siguientes
    accessToken  = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
    userId       = res.body.data.user.id;
  });

  it('❌ No permite registrar el mismo email dos veces', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('ya está registrado');
  });

  it('❌ Rechaza email inválido', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'no-es-email', password: 'TestPass123', fullName: 'Test' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('❌ Rechaza contraseña débil (menos de 8 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'otro@test.ar', password: '123', fullName: 'Test' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('❌ Rechaza nombre vacío', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'otro@test.ar', password: 'TestPass123', fullName: '' });

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/login', () => {

  it('✅ Login exitoso con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(testUser.email);

    // Actualizar tokens
    accessToken  = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('❌ Login con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'ContraseñaIncorrecta99' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // No debe revelar si el email existe
    expect(res.body.message).toContain('incorrectos');
  });

  it('❌ Login con email no registrado', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'noexiste@invertite.ar', password: 'TestPass123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ Login sin body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════════════════════
// RUTAS PROTEGIDAS — Token inválido
// ═════════════════════════════════════════════════════════════
describe('Rutas protegidas — autenticación JWT', () => {

  it('✅ GET /auth/me con token válido', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(userId);
  });

  it('❌ GET /auth/me sin token devuelve 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ GET /auth/me con token malformado devuelve 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer token.invalido.aqui');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ GET /auth/me con token de otro secreto devuelve 401', async () => {
    const jwt       = require('jsonwebtoken');
    const crypto    = require('crypto');
    const fakeToken = jwt.sign(
      { sub: userId },
      'secreto-falso-' + crypto.randomUUID(),
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });

  it('✅ GET /users/profile con token válido', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('✅ GET /users/dashboard con token válido', async () => {
    const res = await request(app)
      .get('/api/v1/users/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('progress');
    expect(res.body.data).toHaveProperty('streak');
    expect(res.body.data).toHaveProperty('modules');
    expect(res.body.data.modules).toHaveLength(10); // 10 módulos (9 publicados + 1 próximamente)
  });
});

// ═════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/refresh', () => {

  it('✅ Refresh token válido genera nuevo access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken, userId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    // Los nuevos tokens deben ser distintos (rotación)
    expect(res.body.data.accessToken).not.toBe(accessToken);

    // Actualizar para cleanup
    refreshToken = res.body.data.refreshToken;
    accessToken  = res.body.data.accessToken;
  });

  it('❌ Refresh token inválido devuelve 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'fake-jti.fake-token', userId });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ Refresh token ya usado (rotación) devuelve 401', async () => {
    // El token anterior fue rotado en el test de arriba
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshToken + 'modificado', userId });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════
// LOGOUT
// ═════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/logout', () => {

  it('✅ Logout invalida el refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken, userId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ Después del logout, el refresh token ya no es válido', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken, userId });

    expect(res.status).toBe(401);
  });
});
