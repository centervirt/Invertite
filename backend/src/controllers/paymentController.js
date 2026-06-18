/**
 * INVERTITE — Controlador de Pagos
 */
const MercadoPagoService = require('../services/mercadopagoService');
const UalaBisService = require('../services/ualaBisService');
const SubscriptionService = require('../services/subscriptionService');
const { successResponse, errorResponse } = require('../utils/helpers');

// POST /api/v1/payments/mp/subscribe
const mpSubscribe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json(errorResponse('planId es requerido.'));
    }

    const result = await MercadoPagoService.createSubscription(userId, planId);
    return res.json(successResponse(result, 'Pre-aprobación de Mercado Pago creada con éxito.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/mp/preference
const mpPreference = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json(errorResponse('planId es requerido.'));
    }

    const result = await MercadoPagoService.createPaymentPreference(userId, planId);
    return res.json(successResponse(result, 'Preferencia de Mercado Pago creada con éxito.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/mp/webhook
const mpWebhook = async (req, res, next) => {
  try {
    const signatureOk = MercadoPagoService.verifySignature(req.headers, req.body, req.query);
    if (process.env.MP_WEBHOOK_SECRET && !signatureOk) {
      return res.status(400).send('Firma de webhook inválida.');
    }

    const result = await MercadoPagoService.processWebhook(req.body);
    return res.json(successResponse(result, 'Webhook de Mercado Pago procesado.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/uala/pay
const ualaPay = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json(errorResponse('planId es requerido.'));
    }

    const result = await UalaBisService.createPaymentLink(userId, planId);
    return res.json(successResponse(result, 'Link de pago Ualá Bis creado con éxito.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/uala/webhook
const ualaWebhook = async (req, res, next) => {
  try {
    const signatureHeader = req.headers['x-uala-signature'] || req.headers['x-signature'];
    
    // Necesitamos el raw string del body para verificar HMAC de Ualá.
    // Como express.json() ya parseó el body, podemos serializarlo de nuevo para verificar
    const rawBodyString = JSON.stringify(req.body);

    const signatureOk = UalaBisService.verifySignature(signatureHeader, rawBodyString);
    if (process.env.UALA_WEBHOOK_SECRET && !signatureOk) {
      return res.status(400).send('HMAC de webhook inválido.');
    }

    const result = await UalaBisService.processWebhook(req.body);
    return res.json(successResponse(result, 'Webhook de Ualá Bis procesado.'));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/payments/status
const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const status = await SubscriptionService.getStatus(userId);
    return res.json(successResponse(status, 'Estado de suscripción obtenido.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/cancel
const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json(errorResponse('subscriptionId es requerido.'));
    }

    const result = await SubscriptionService.cancelSubscription(userId, subscriptionId);
    return res.json(successResponse(result, 'Suscripción cancelada con éxito.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  mpSubscribe,
  mpPreference,
  mpWebhook,
  ualaPay,
  ualaWebhook,
  getStatus,
  cancelSubscription
};
