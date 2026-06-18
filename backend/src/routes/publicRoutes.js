/**
 * INVERTITE — Rutas Públicas (Lanzamiento, etc.)
 * Base: /api/v1/launch
 */
const router = require('express').Router();
const launchService = require('../services/launchService');
const redis = require('../config/redis');
const { successResponse } = require('../utils/helpers');

router.get('/status', async (req, res, next) => {
  try {
    const cacheKey = redis.KEYS.cache('launch:status');
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(successResponse(cached, 'Estado de lanzamiento obtenido de caché.'));
    }

    const status = await launchService.getStatus();

    const prices = {
      mensual:  { normal: 6990,   current: status.launchActive ? 4990 : 6990,  isLaunch: status.launchActive },
      anual:    { normal: 59990,  current: status.launchActive ? 39990 : 59990, isLaunch: status.launchActive },
      lifetime: { normal: 149990, current: status.launchActive ? 79990 : 149990, isLaunch: status.launchActive }
    };

    const responseData = {
      totalSubscribers: status.totalSubscribers,
      launchLimit: status.launchLimit,
      remaining: status.remaining,
      launchActive: status.launchActive,
      percentageUsed: status.percentageUsed,
      prices
    };

    await redis.setWithExpiry(cacheKey, responseData, 60);

    return res.json(successResponse(responseData, 'Estado de lanzamiento obtenido.'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
