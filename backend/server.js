require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

const subscriptionChecker = require('./src/services/subscriptionChecker');

const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         INVERTITE API - Backend          ║
  ╠══════════════════════════════════════════╣
  ║  🚀 Servidor corriendo en puerto ${PORT}   ║
  ║  🌿 Entorno: ${process.env.NODE_ENV}           ║
  ║  📡 URL: http://localhost:${PORT}         ║
  ╚══════════════════════════════════════════╝
  `);
  
  if (process.env.NODE_ENV !== 'test') {
    subscriptionChecker.start();
  }
});

// Graceful shutdown para PM2
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
});

module.exports = server;
