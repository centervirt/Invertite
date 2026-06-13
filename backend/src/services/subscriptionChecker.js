/**
 * INVERTITE — Job de Verificación de Suscripciones Vencidas
 * Ejecuta comprobaciones regulares para marcar las suscripciones vencidas como 'expired'.
 * Incluye un período de gracia de 3 días antes de desactivar el acceso.
 */
const { query } = require('../config/database');

const SubscriptionChecker = {
  // Buscar y marcar suscripciones vencidas
  async checkExpiredSubscriptions() {
    try {
      // Marcamos como 'expired' aquellas con status active/cancelled cuyo period_end + 3 días ya pasó.
      const result = await query(
        `UPDATE subscriptions
         SET status = 'expired', updated_at = NOW()
         WHERE status IN ('active', 'cancelled')
           AND current_period_end IS NOT NULL
           AND current_period_end + INTERVAL '3 days' < NOW()
         RETURNING id, user_id`
      );

      if (result.rowCount > 0) {
        console.log(`[SubscriptionChecker] Se marcaron ${result.rowCount} suscripciones como expiradas.`);
      }
      return result.rows;
    } catch (e) {
      console.error('[SubscriptionChecker] Error al verificar expiraciones:', e.message);
      return [];
    }
  },

  // Iniciar timer cada hora
  start() {
    console.log('[SubscriptionChecker] Iniciando job de verificación horaria...');
    
    // Correr de inmediato al arrancar
    this.checkExpiredSubscriptions();

    // Configurar intervalo (1 hora = 3600000 ms)
    const intervalMs = 60 * 60 * 1000;
    const intervalId = setInterval(async () => {
      await this.checkExpiredSubscriptions();
    }, intervalMs);

    // Evitar que el event loop se mantenga activo solo por este timer en entornos de test
    if (process.env.NODE_ENV === 'test') {
      clearInterval(intervalId);
    }

    return intervalId;
  }
};

module.exports = SubscriptionChecker;
