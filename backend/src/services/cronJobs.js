/**
 * INVERTITE — Tareas Programadas (Cron Jobs)
 */
const cron = require('node-cron');
const { queryAll } = require('../config/database');
const MarketDataService = require('./marketDataService');

const CronJobs = {
  /**
   * Inicializar todas las tareas programadas
   */
  init() {
    console.log('⏰ Inicializando cron jobs...');

    // 1. Snapshot diario de carteras: Lunes a Viernes a las 18:00 hs
    cron.schedule('0 18 * * 1-5', async () => {
      console.log('⏰ Ejecutando job diario de snapshots de carteras...');
      try {
        const portfolios = await queryAll('SELECT id FROM portfolios');
        
        // Ejecutar snapshots secuencialmente o en paralelo controlado para no saturar la DB/APIs
        let count = 0;
        for (const portfolio of portfolios) {
          await MarketDataService.takePortfolioSnapshot(portfolio.id);
          count++;
        }

        console.log(`🎉 Snapshots generados: ${count} carteras`);
      } catch (err) {
        console.error('❌ Error en cron job de snapshots de carteras:', err.message);
      }
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    // 2. Snapshot diario y ranking de carteras virtuales (Simulador): Lunes a Viernes a las 18:00 hs
    const PaperTradingService = require('./paperTradingService');
    cron.schedule('0 18 * * 1-5', async () => {
      console.log('⏰ Ejecutando job diario de snapshots y rankings de carteras simuladas...');
      try {
        const portfolios = await queryAll('SELECT id FROM paper_portfolios WHERE is_active = true');
        
        let count = 0;
        for (const pf of portfolios) {
          await PaperTradingService.takeSnapshot(pf.id);
          count++;
        }

        // Calcular rankings para los diferentes períodos
        await PaperTradingService.calculateRanking('weekly');
        await PaperTradingService.calculateRanking('monthly');
        await PaperTradingService.calculateRanking('alltime');

        console.log(`🎉 Snapshots y ranking actualizados: ${count} portfolios simulados`);
      } catch (err) {
        console.error('❌ Error en cron job de simulador:', err.message);
      }
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    });
  }
};

module.exports = CronJobs;
