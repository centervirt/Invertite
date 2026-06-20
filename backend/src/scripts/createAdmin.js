/**
 * INVERTITE — Script para crear usuarios administradores
 * Uso: node src/scripts/createAdmin.js <email> <password> <fullName>
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { queryOne } = require('../config/database');

const BCRYPT_ROUNDS = 12;

const run = async () => {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('❌ Error: Faltan argumentos.');
    console.log('Uso: node src/scripts/createAdmin.js <email> <password> <fullName>');
    process.exit(1);
  }

  const [email, password, fullName] = args;

  try {
    console.log(`Creando administrador con email: ${email}...`);

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insertar/actualizar en DB a rol de administrador
    const user = await queryOne(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (email) 
       DO UPDATE SET role = 'admin', password_hash = $2, full_name = $3, is_active = true, updated_at = NOW()
       RETURNING id, email, full_name, role, is_active, created_at`,
      [email.toLowerCase().trim(), passwordHash, fullName.trim()]
    );

    console.log('✅ Administrador creado/actualizado con éxito:');
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear administrador:', error.message);
    process.exit(1);
  }
};

run();
