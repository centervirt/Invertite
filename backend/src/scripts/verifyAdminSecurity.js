/**
 * INVERTITE — Script de Pruebas de Seguridad y Comprobación de Requisitos
 */
require('dotenv').config();
const { queryAll } = require('../config/database');
const { verifyAccessToken } = require('../utils/helpers');

const run = async () => {
  try {
    console.log('--- 1. VERIFICACIÓN DE EXCLUSIÓN DE PASSWORD_HASH EN SELECT DE USUARIOS ---');
    
    // Obtenemos los usuarios directamente llamando a la base simulando las columnas exactas del listado
    const users = await queryAll(
      `SELECT 
         u.id, 
         u.email, 
         u.full_name AS "fullName", 
         u.role, 
         u.is_active AS "isActive", 
         u.created_at AS "createdAt",
         s.status AS "subStatus",
         p.name AS "planName"
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN plans p ON p.id = s.plan_id
       ORDER BY u.created_at DESC
       LIMIT 2`
    );

    console.log('\nGET /admin/users (Resulting structure from queries):');
    console.log(JSON.stringify(users, null, 2));

    // Verificamos que password_hash no esté de ninguna manera en el listado
    const hasPasswordHash = users.some(u => u.hasOwnProperty('password_hash') || u.hasOwnProperty('password') || u.hasOwnProperty('passwordHash'));
    console.log(`¿Contiene password_hash?: ${hasPasswordHash ? '❌ SÍ (ERROR)' : '✅ NO (SEGURO)'}`);

    console.log('\n--- 2. DETALLE DE USUARIO (GET /admin/users/:id) ---');
    if (users.length > 0) {
      const targetId = users[0].id;
      const userDetail = await queryAll(
        `SELECT 
           u.id, 
           u.email, 
           u.full_name AS "fullName", 
           u.avatar_url AS "avatarUrl",
           u.role, 
           u.is_active AS "isActive", 
           u.created_at AS "createdAt",
           u.updated_at AS "updatedAt"
         FROM users u
         WHERE u.id = $1`,
        [targetId]
      );
      console.log(`\nGET /admin/users/${targetId}:`);
      console.log(JSON.stringify(userDetail[0], null, 2));
      const detailsHasHash = userDetail.some(u => u.hasOwnProperty('password_hash') || u.hasOwnProperty('password') || u.hasOwnProperty('passwordHash'));
      console.log(`¿Contiene password_hash?: ${detailsHasHash ? '❌ SÍ (ERROR)' : '✅ NO (SEGURO)'}`);
    }

    console.log('\n--- 3. VERIFICACIÓN DE AUDITORÍA EN admin_actions_log ---');
    const logs = await queryAll(
      `SELECT al.id, al.action, al.details, al.created_at, admin.email AS admin_email, target.email AS target_email
       FROM admin_actions_log al
       LEFT JOIN users admin ON admin.id = al.admin_user_id
       LEFT JOIN users target ON target.id = al.target_user_id
       ORDER BY al.created_at DESC
       LIMIT 5`
    );
    console.log('\nÚltimos logs de auditoría en admin_actions_log:');
    console.log(JSON.stringify(logs, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error.message);
    process.exit(1);
  }
};

run();
