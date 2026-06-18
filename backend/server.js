require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

const subscriptionChecker = require('./src/services/subscriptionChecker');
const cronJobs = require('./src/services/cronJobs');

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
    cronJobs.init();

    // Calentar al arrancar
    const { warmCache } = require('./src/services/cacheWarmer');
    warmCache().catch(err => 
      console.error('Cache warmer inicial falló:', err.message)
    );

    // Renovar cada 4 minutos (antes de que expiren los 5 min de TTL)
    setInterval(() => {
      warmCache().catch(err => 
        console.error('Cache warmer periódico falló:', err.message)
      );
    }, 4 * 60 * 1000);
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
