/**
 * INVERTITE — Controlador de Módulos
 */
const ModuleModel = require('../models/moduleModel');
const { successResponse, errorResponse } = require('../utils/helpers');
const redis = require('../config/redis');

// GET /api/v1/modules
const getModules = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = redis.KEYS.cache(`modules:list:${userId}`);

    // Intentar leer de caché
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(successResponse(cachedData, 'Lista de módulos (desde caché).'));
    }

    const modules = await ModuleModel.findAllWithProgress(userId);

    // Guardar en caché con TTL de 5 minutos (300 segundos)
    await redis.set(cacheKey, modules, 300);

    return res.json(successResponse(modules, 'Lista de módulos obtenida.'));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/modules/:slug
const getModuleBySlug = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { slug } = req.params;

    const mod = await ModuleModel.findBySlugWithProgress(userId, slug);
    if (!mod) {
      return res.status(404).json(errorResponse('Módulo no encontrado o no publicado.'));
    }

    return res.json(successResponse(mod, 'Detalle del módulo obtenido.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getModules,
  getModuleBySlug
};
