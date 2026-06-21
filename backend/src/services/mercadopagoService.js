/**
 * INVERTITE — Servicio de Mercado Pago
 * Comunicación directa con la API REST de Mercado Pago (Preferences y Preapproval)
 */
const { query, queryOne } = require('../config/database');
const SubscriptionService = require('./subscriptionService');
const LaunchService = require('./launchService');
const crypto = require('crypto');

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || process.env.MERCADOPAGO_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

// Helper para llamadas HTTP fetch a Mercado Pago
const mpFetch = async (url, options = {}) => {
  const headers = {
    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mercado Pago API Error: ${response.status} - ${errText}`);
  }
  return response.json();
};

const MercadoPagoService = {
  // Modo Mock: ¿Debemos saltar llamadas reales?
  isMockMode() {
    return process.env.NODE_ENV === 'test' || !MP_ACCESS_TOKEN || MP_ACCESS_TOKEN.startsWith('tu_');
  },

  // 1. Suscripción Mensual / Anual (Preapproval)
  async createSubscription(userId, planId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
    const plan = isUuid
      ? await queryOne(`SELECT id, name, slug, price_ars, interval FROM plans WHERE id = $1`, [planId])
      : await queryOne(`SELECT id, name, slug, price_ars, interval FROM plans WHERE slug = $1`, [planId]);
    if (!plan) throw new Error('El plan especificado no existe.');

    const user = await queryOne(`SELECT email FROM users WHERE id = $1`, [userId]);
    if (!user) throw new Error('El usuario no existe.');

    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, payment_provider, created_at, updated_at)
       VALUES ($1, $2, 'pending', 'mercadopago', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [userId, plan.id]
    );

    if (this.isMockMode()) {
      return {
        init_point: `https://www.mercadopago.com.ar/preapproval/mock-init-point?userId=${userId}&planId=${planId}`
      };
    }

    const price = await LaunchService.getCurrentPrice(plan.slug);
    const frequency = 1;
    const frequencyType = plan.interval === 'yearly' ? 'years' : 'months';

    const body = {
      preapproval_plan_id: undefined, // Opcional, definimos el plan ad-hoc
      reason: plan.slug === 'yearly' 
        ? "Invertite — Plan Anual (Educación financiera + Tutor IA)" 
        : "Invertite — Plan Mensual (Educación financiera + Tutor IA)",
      external_reference: `${userId}:${plan.slug}:${Date.now()}`,
      payer_email: user.email,
      auto_recurring: {
        frequency,
        frequency_type: frequencyType,
        transaction_amount: price,
        currency_id: 'ARS'
      },
      // Mercado Pago Preapproval requiere HTTPS válido, rechaza localhost.
      back_url: FRONTEND_URL.includes('localhost') 
        ? 'https://invertite.com/pago/resultado' 
        : `${FRONTEND_URL}/pago/resultado`,
      status: 'pending'
    };

    const mpRes = await mpFetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    // Actualizar registro en DB con preapproval_id si corresponde
    if (mpRes.id) {
      await query(
        `UPDATE subscriptions 
         SET provider_subscription_id = $1 
         WHERE user_id = $2 AND plan_id = $3 AND status = 'pending'`,
        [mpRes.id, userId, plan.id]
      );
    }

    return { init_point: mpRes.init_point };
  },

  // 2. Pago único Lifetime (Preference)
  async createPaymentPreference(userId, planId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
    const plan = isUuid
      ? await queryOne(`SELECT id, name, slug, price_ars FROM plans WHERE id = $1`, [planId])
      : await queryOne(`SELECT id, name, slug, price_ars FROM plans WHERE slug = $1`, [planId]);
    if (!plan) throw new Error('El plan especificado no existe.');

    const user = await queryOne(`SELECT email FROM users WHERE id = $1`, [userId]);
    if (!user) throw new Error('El usuario no existe.');

    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, payment_provider, created_at, updated_at)
       VALUES ($1, $2, 'pending', 'mercadopago', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [userId, plan.id]
    );

    if (this.isMockMode()) {
      return {
        init_point: `https://www.mercadopago.com.ar/checkout/mock-init-point?userId=${userId}&planId=${planId}`,
        preference_id: 'mock-pref-123'
      };
    }

    const price = await LaunchService.getCurrentPrice(plan.slug);

    const body = {
      items: [
        {
          id: plan.id,
          title: `Invertite — Acceso Vitalicio`,
          description: "Acceso de por vida a todos los módulos, tutor IA y simulador de cartera",
          quantity: 1,
          currency_id: 'ARS',
          unit_price: price
        }
      ],
      payer: {
        email: user.email
      },
      external_reference: `${userId}:${plan.slug}:${Date.now()}`,
      back_urls: {
        success: `${FRONTEND_URL}/pago/resultado?status=approved`,
        failure: `${FRONTEND_URL}/pago/resultado?status=failure`,
        pending: `${FRONTEND_URL}/pago/resultado?status=pending`
      },
      auto_return: 'all',
      notification_url: `${APP_URL}/api/v1/payments/mp/webhook`
    };

    const mpRes = await mpFetch('https://api.mercadopago.com/v1/preferences', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return {
      init_point: mpRes.init_point,
      preference_id: mpRes.id
    };
  },

  // Verificar firma X-Signature de Mercado Pago
  verifySignature(headers, body, rawQueryParams) {
    if (this.isMockMode()) return true;
    if (!MP_WEBHOOK_SECRET) return true; // Si no está configurado, permitimos en dev

    try {
      const xSignature = headers['x-signature'];
      const xRequestId = headers['x-request-id'];
      if (!xSignature) return false;

      // MP X-Signature contiene ts=... y v1=...
      const parts = xSignature.split(',');
      let ts = '';
      let hash = '';
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k.trim() === 'ts') ts = v.trim();
        if (k.trim() === 'v1') hash = v.trim();
      }

      // Estructurar el manifest string para computar SHA-256
      // id: id del recurso desde query params del webhook
      const resourceId = rawQueryParams.id || body?.data?.id;
      const manifest = `id:${resourceId};request-id:${xRequestId};ts:${ts};`;
      const computedHash = crypto
        .createHmac('sha256', MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex');

      return computedHash === hash;
    } catch (e) {
      console.error('Error verificando firma MP:', e.message);
      return false;
    }
  },

  // 3. Webhook Handler
  async processWebhook(payload) {
    const type = payload.type || payload.action;
    const data = payload.data || {};
    const resourceId = data.id;

    if (!resourceId) return { processed: false, reason: 'ID de recurso faltante' };

    // Guardar en payment_events
    await query(
      `INSERT INTO payment_events (provider, event_type, payload, processed, created_at)
       VALUES ('mercadopago', $1, $2, false, NOW())`,
      [type, JSON.stringify(payload)]
    );

    if (this.isMockMode()) {
      // Flujo de prueba / mock para tests
      if (payload.mock_approved && payload.mock_user_id && payload.mock_plan_id) {
        await SubscriptionService.activateSubscription(
          payload.mock_user_id,
          payload.mock_plan_id,
          {
            provider: 'mercadopago',
            providerPaymentId: resourceId
          }
        );
        return { processed: true, activated: true };
      }
      return { processed: true, mock: true };
    }

    try {
      if (type === 'payment' || type === 'payment.created' || type === 'payment.updated') {
        // Consultar el pago en MP
        const payment = await mpFetch(`https://api.mercadopago.com/v1/payments/${resourceId}`);
        
        if (payment.status === 'approved') {
          const externalRef = payment.external_reference;
          if (externalRef && externalRef.includes(':')) {
            const [userId, planId] = externalRef.split(':');
            
            // Activar la suscripción
            await SubscriptionService.activateSubscription(userId, planId, {
              provider: 'mercadopago',
              providerPaymentId: resourceId
            });

            return { processed: true, activated: true, userId, planId };
          }
        }
      } else if (type === 'subscription_preapproval' || type === 'preapproval') {
        // Consultar suscripción preapproval en MP
        const preapproval = await mpFetch(`https://api.mercadopago.com/preapproval/${resourceId}`);

        if (preapproval.status === 'authorized') {
          const externalRef = preapproval.external_reference;
          if (externalRef && externalRef.includes(':')) {
            const [userId, planId] = externalRef.split(':');

            await SubscriptionService.activateSubscription(userId, planId, {
              provider: 'mercadopago',
              providerSubscriptionId: resourceId
            });

            return { processed: true, activated: true, userId, planId };
          }
        } else if (preapproval.status === 'cancelled') {
          // Si fue cancelada, actualizar estado en DB
          await query(
            `UPDATE subscriptions 
             SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
             WHERE provider_subscription_id = $1`,
            [resourceId]
          );
          return { processed: true, cancelled: true };
        }
      }

      return { processed: true, activated: false };
    } catch (err) {
      console.error('Error procesando webhook Mercado Pago:', err.message);
      throw err;
    }
  }
};

module.exports = MercadoPagoService;
