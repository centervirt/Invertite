/**
 * INVERTITE — Servicio de Suscripciones
 */
const { query, queryOne, queryAll } = require('../config/database');
const ProgressService = require('./progressService');
const redis = require('../config/redis');
const LaunchService = require('./launchService');

const SubscriptionService = {
  // Activar o actualizar la suscripción de un usuario
  async activateSubscription(userId, planId, providerData = {}) {
    const { provider, providerSubscriptionId, providerPaymentId } = providerData;

    // 1. Obtener detalles del plan (soporta UUID o slug)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
    const plan = isUuid
      ? await queryOne(`SELECT id, slug, interval FROM plans WHERE id = $1`, [planId])
      : await queryOne(`SELECT id, slug, interval FROM plans WHERE slug = $1`, [planId]);
    if (!plan) throw new Error('El plan especificado no existe.');

    // 2. Calcular fecha de fin según el intervalo
    let currentPeriodEnd = null;
    if (plan.interval === 'monthly') {
      currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else if (plan.interval === 'yearly') {
      currentPeriodEnd = new Date();
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } // Para lifetime queda null

    // 3. Desactivar suscripciones anteriores activas
    await query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    // 4. Insertar nueva suscripción activa
    const subscription = await queryOne(
      `INSERT INTO subscriptions (
        user_id, plan_id, status, payment_provider, 
        provider_subscription_id, provider_payment_id, 
        current_period_start, current_period_end, created_at, updated_at
      ) VALUES ($1, $2, 'active', $3, $4, $5, NOW(), $6, NOW(), NOW())
      RETURNING id, user_id, plan_id, status, current_period_end`,
      [userId, planId, provider, providerSubscriptionId || null, providerPaymentId || null, currentPeriodEnd]
    );

    // 5. Invalidar caché del usuario en Redis
    await redis.del(redis.KEYS.cache(`dashboard:${userId}`));
    await redis.del(redis.KEYS.cache(`modules:list:${userId}`));

    // 6. Evaluar y otorgar logros de suscripción
    await ProgressService.checkAndAwardBadges(userId, { type: 'subscription' });

    // 7. Incrementar el contador del lanzamiento
    try {
      await LaunchService.incrementCounter();
    } catch (launchErr) {
      console.error('Error al incrementar contador de lanzamiento:', launchErr.message);
    }

    return subscription;
  },

  // Cancelar la renovación automática de la suscripción
  async cancelSubscription(userId, subscriptionId) {
    const sub = await queryOne(
      `SELECT id, user_id FROM subscriptions WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [subscriptionId, userId]
    );
    if (!sub) throw new Error('Suscripción activa no encontrada.');

    const updatedSub = await queryOne(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, current_period_end, cancelled_at`,
      [subscriptionId]
    );

    // Invalidar caché en Redis
    await redis.del(redis.KEYS.cache(`dashboard:${userId}`));
    await redis.del(redis.KEYS.cache(`modules:list:${userId}`));

    return updatedSub;
  },

  // Obtener estado actual de suscripción del usuario
  async getStatus(userId) {
    // Buscamos la suscripción activa (o cancelada pero aún no expirada)
    const sub = await queryOne(
      `SELECT s.id, s.status, s.current_period_start, s.current_period_end, s.cancelled_at,
              p.id AS plan_id, p.name AS plan_name, p.slug AS plan_slug, p.price_ars, p.interval
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1 AND (s.status = 'active' OR (s.status = 'cancelled' AND (s.current_period_end IS NULL OR s.current_period_end > NOW())))
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!sub) {
      // Si no tiene activa o cancelada vigente, asumimos plan free por defecto (si existe en la DB)
      const freePlan = await queryOne(`SELECT id, name, slug, price_ars, interval FROM plans WHERE slug = 'free'`);
      return {
        hasActiveSubscription: false,
        subscription: null,
        plan: freePlan ? {
          id: freePlan.id,
          name: freePlan.name,
          slug: freePlan.slug,
          interval: freePlan.interval
        } : null
      };
    }

    return {
      hasActiveSubscription: true,
      subscription: {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelledAt: sub.cancelled_at
      },
      plan: {
        id: sub.plan_id,
        name: sub.plan_name,
        slug: sub.plan_slug,
        priceArs: parseFloat(sub.price_ars),
        interval: sub.interval
      }
    };
  }
};

module.exports = SubscriptionService;
