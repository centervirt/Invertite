/**
 * INVERTITE — Servicio de Lanzamiento
 * Lógica de escasez real, precios de lanzamiento y contador automático.
 */
const { query, queryOne } = require('../config/database');
const redis = require('../config/redis');

const LaunchService = {
  /**
   * Obtener el estado actual del lanzamiento
   */
  async getStatus() {
    const counter = await queryOne('SELECT total_subscribers, launch_limit, launch_active FROM launch_counter ORDER BY id DESC LIMIT 1');
    if (!counter) {
      return {
        totalSubscribers: 0,
        launchLimit: 100,
        remaining: 100,
        launchActive: false,
        percentageUsed: 0
      };
    }

    const totalSubscribers = counter.total_subscribers;
    const launchLimit = counter.launch_limit;
    const launchActive = counter.launch_active;
    const remaining = Math.max(0, launchLimit - totalSubscribers);
    const percentageUsed = Math.min(100, Math.round((totalSubscribers / launchLimit) * 100));

    return {
      totalSubscribers,
      launchLimit,
      remaining,
      launchActive,
      percentageUsed
    };
  },

  /**
   * Incrementar contador de suscriptores y desactivar lanzamiento si llega al límite
   */
  async incrementCounter() {
    // Usar transacción para evitar condiciones de carrera
    await query('BEGIN');
    try {
      const counter = await queryOne('SELECT id, total_subscribers, launch_limit, launch_active FROM launch_counter ORDER BY id DESC LIMIT 1 FOR UPDATE');
      if (!counter) {
        await query('ROLLBACK');
        return null;
      }

      let total = counter.total_subscribers + 1;
      let active = counter.launch_active;

      if (total >= counter.launch_limit) {
        active = false;
        console.log(`🎉 Launch completado - ${counter.launch_limit} suscriptores alcanzados`);
      }

      await query(
        `UPDATE launch_counter 
         SET total_subscribers = $1, launch_active = $2, updated_at = NOW() 
         WHERE id = $3`,
        [total, active, counter.id]
      );

      await query('COMMIT');

      // Invalidar cache de Redis
      try {
        await redis.del(redis.KEYS.cache('launch:status'));
      } catch (redisErr) {
        console.error('Error al invalidar caché en Redis:', redisErr.message);
      }

      return {
        totalSubscribers: total,
        launchLimit: counter.launch_limit,
        remaining: Math.max(0, counter.launch_limit - total),
        launchActive: active,
        percentageUsed: Math.min(100, Math.round((total / counter.launch_limit) * 100))
      };
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  },

  /**
   * Verificar si el lanzamiento está activo
   */
  async isLaunchActive() {
    const counter = await queryOne('SELECT launch_active FROM launch_counter ORDER BY id DESC LIMIT 1');
    return counter ? counter.launch_active : false;
  },

  /**
   * Obtener precio actual de un plan según estado de lanzamiento
   */
  async getCurrentPrice(planSlug) {
    // Normalizar slug
    const dbSlugMap = {
      mensual: 'monthly',
      anual: 'yearly',
      vitalicio: 'lifetime',
      monthly: 'monthly',
      yearly: 'yearly',
      lifetime: 'lifetime'
    };
    const slug = dbSlugMap[planSlug] || planSlug;

    const plan = await queryOne('SELECT price_ars, launch_price_ars FROM plans WHERE slug = $1', [slug]);
    if (!plan) throw new Error('El plan especificado no existe.');

    const active = await this.isLaunchActive();
    if (active && plan.launch_price_ars !== null) {
      return parseFloat(plan.launch_price_ars);
    }
    return parseFloat(plan.price_ars);
  }
};

module.exports = LaunchService;
