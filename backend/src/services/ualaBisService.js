/**
 * INVERTITE — Servicio de Ualá Bis
 * Integración con la API REST de Ualá Bis para cobros con tarjeta/QR.
 */
const { query, queryOne } = require('../config/database');
const SubscriptionService = require('./subscriptionService');
const LaunchService = require('./launchService');
const crypto = require('crypto');

const UALA_CLIENT_ID = process.env.UALA_CLIENT_ID;
const UALA_CLIENT_SECRET = process.env.UALA_CLIENT_SECRET;
const UALA_WEBHOOK_SECRET = process.env.UALA_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTH_URL = IS_PRODUCTION 
  ? 'https://auth.prod.bis.uala.com.ar/oauth/token' 
  : 'https://auth.stage.bis.uala.com.ar/oauth/token';
const API_URL = IS_PRODUCTION 
  ? 'https://api.prod.bis.uala.com.ar/v1' 
  : 'https://api.stage.bis.uala.com.ar/v1';

const UalaBisService = {
  isMockMode() {
    return process.env.NODE_ENV === 'test' || !UALA_CLIENT_ID || UALA_CLIENT_ID.trim() === '';
  },

  // Obtener Token OAuth2 de Ualá
  async getAccessToken() {
    if (this.isMockMode()) return 'mock-uala-token';

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: UALA_CLIENT_ID,
        client_secret: UALA_CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ualá Bis Auth Error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return data.access_token;
  },

  // Crear link de pago Ualá Bis
  async createPaymentLink(userId, planId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
    const plan = isUuid
      ? await queryOne(`SELECT id, name, slug, price_ars FROM plans WHERE id = $1`, [planId])
      : await queryOne(`SELECT id, name, slug, price_ars FROM plans WHERE slug = $1`, [planId]);
    if (!plan) throw new Error('El plan especificado no existe.');

    const user = await queryOne(`SELECT full_name, email FROM users WHERE id = $1`, [userId]);
    if (!user) throw new Error('El usuario no existe.');

    // Crear registro preliminar en DB
    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, payment_provider, created_at, updated_at)
       VALUES ($1, $2, 'pending', 'uala', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [userId, planId]
    );

    const currentPrice = await LaunchService.getCurrentPrice(plan.slug);

    if (this.isMockMode()) {
      return {
        payment_url: `https://checkout.uala.com.ar/mock-pay?userId=${userId}&planId=${planId}&amount=${currentPrice}`
      };
    }

    const token = await this.getAccessToken();
    const amount = currentPrice.toFixed(2);

    const body = {
      amount,
      description: `Invertite — Plan ${plan.name}`,
      userName: user.full_name,
      callback_fail: `${FRONTEND_URL}/payment/status?status=failure`,
      callback_success: `${FRONTEND_URL}/payment/status?status=approved`,
      notification_url: `${APP_URL}/api/v1/payments/uala/webhook`
    };

    const response = await fetch(`${API_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ualá Bis Checkout Error: ${response.status} - ${text}`);
    }

    const data = await response.json();

    // Guardar el order ID en DB para el match de webhook posterior
    if (data.uuid) {
      await query(
        `UPDATE subscriptions 
         SET provider_subscription_id = $1 
         WHERE user_id = $2 AND plan_id = $3 AND status = 'pending'`,
        [data.uuid, userId, planId]
      );
    }

    return { payment_url: data.links.checkoutLink };
  },

  // Verificar firma HMAC del webhook
  verifySignature(signature, bodyString) {
    if (this.isMockMode()) return true;
    if (!UALA_WEBHOOK_SECRET) return true;

    try {
      const computedSignature = crypto
        .createHmac('sha256', UALA_WEBHOOK_SECRET)
        .update(bodyString)
        .digest('hex');

      return computedSignature === signature;
    } catch (e) {
      console.error('Error verificando firma Ualá:', e.message);
      return false;
    }
  },

  // Procesar webhook de Ualá
  async processWebhook(payload) {
    const orderId = payload.uuid;
    const status = payload.status; // e.g. 'SUCCESS' o 'FAILED'

    if (!orderId) return { processed: false, reason: 'ID de orden faltante (uuid)' };

    // Registrar evento
    await query(
      `INSERT INTO payment_events (provider, event_type, payload, processed, created_at)
       VALUES ('uala', $1, $2, false, NOW())`,
      [status || 'unknown', JSON.stringify(payload)]
    );

    if (this.isMockMode()) {
      // Mock para testeo
      if (payload.mock_approved && payload.mock_user_id && payload.mock_plan_id) {
        await SubscriptionService.activateSubscription(
          payload.mock_user_id,
          payload.mock_plan_id,
          {
            provider: 'uala',
            providerSubscriptionId: orderId
          }
        );
        return { processed: true, activated: true };
      }
      return { processed: true, mock: true };
    }

    try {
      if (status === 'SUCCESS') {
        // Encontrar la suscripción pendiente en base a la orden de Ualá (uuid)
        const sub = await queryOne(
          `SELECT user_id, plan_id 
           FROM subscriptions 
           WHERE provider_subscription_id = $1 AND status = 'pending'`,
          [orderId]
        );

        if (sub) {
          await SubscriptionService.activateSubscription(sub.user_id, sub.plan_id, {
            provider: 'uala',
            providerSubscriptionId: orderId
          });
          return { processed: true, activated: true, userId: sub.user_id, planId: sub.plan_id };
        }
      } else if (status === 'FAILED') {
        await query(
          `UPDATE subscriptions 
           SET status = 'failed', updated_at = NOW() 
           WHERE provider_subscription_id = $1 AND status = 'pending'`,
          [orderId]
        );
        return { processed: true, failed: true };
      }

      return { processed: true, activated: false };
    } catch (err) {
      console.error('Error procesando webhook Ualá Bis:', err.message);
      throw err;
    }
  }
};

module.exports = UalaBisService;
