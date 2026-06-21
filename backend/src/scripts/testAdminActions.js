/**
 * INVERTITE — Script para testear endpoints administrativos y probar la auditoría.
 */
require('dotenv').config();
const { queryOne } = require('../config/database');

// Simulamos que el admin realiza algunas llamadas internas al controlador directamente
const adminController = require('../controllers/adminController');

const run = async () => {
  try {
    console.log('Buscando un usuario no-admin para testear...');
    const targetUser = await queryOne("SELECT id, email, full_name FROM users WHERE role != 'admin' LIMIT 1");
    const adminUser = await queryOne("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");

    if (!targetUser || !adminUser) {
      console.log('No se encontró administrador o estudiante de prueba.');
      process.exit(1);
    }

    console.log(`Admin ejecutor: ${adminUser.email} (${adminUser.id})`);
    console.log(`Usuario objetivo: ${targetUser.email} (${targetUser.id})`);

    // Mock Express request/response object
    const req = {
      user: { id: adminUser.id, email: adminUser.email, role: 'admin' },
      params: { id: targetUser.id },
      body: { status: 'active', planSlug: 'yearly' }
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log('Respuesta recibida:', JSON.stringify(data, null, 2));
      }
    };

    const next = (err) => {
      if (err) console.error('Error en controlador:', err);
    };

    console.log('\n--- 1. Activando suscripción manualmente para probar auditoría ---');
    await adminController.updateUserSubscription(req, res, next);

    console.log('\n--- 2. Desactivando usuario para probar auditoría de status ---');
    req.body = { isActive: false };
    await adminController.updateUserStatus(req, res, next);

    console.log('\n--- 3. Reactivando usuario ---');
    req.body = { isActive: true };
    await adminController.updateUserStatus(req, res, next);

    process.exit(0);
  } catch (error) {
    console.error('Error en test:', error);
    process.exit(1);
  }
};

run();
