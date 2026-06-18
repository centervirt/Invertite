/**
 * INVERTITE — Controlador de Contenido y Resúmenes Semanales
 */
const { query, queryOne, queryAll } = require('../config/database');
const redis = require('../config/redis');
const { successResponse, errorResponse } = require('../utils/helpers');

const INTERNAL_KEY = process.env.INTERNAL_KEY || 'invertite_internal_secret_key_2026';

const ContentController = {
  /**
   * Obtener el resumen semanal financiero actual
   */
  async getWeeklySummary(req, res, next) {
    try {
      const cacheKey = redis.KEYS.cache('content:weekly-summary');
      
      // 1. Intentar obtener de caché Redis
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(successResponse(cached, 'Resumen semanal obtenido de caché.'));
      }

      // 2. Si no está en caché, consultar la base de datos
      // Buscamos el resumen más reciente (de la semana actual o anterior)
      const record = await queryOne(
        `SELECT id, week_start, content_json, generated_at 
         FROM weekly_summaries 
         ORDER BY week_start DESC 
         LIMIT 1`
      );

      if (!record) {
        return res.status(404).json(errorResponse('No se encontraron resúmenes semanales registrados.'));
      }

      const responseData = {
        id: record.id,
        week_start: record.week_start,
        summary: record.content_json,
        generated_at: record.generated_at
      };

      // 3. Calcular TTL en segundos hasta el próximo Lunes a las 9:00 AM
      // Si hay error en el cálculo dinámico, usamos 24 hs (86400 segundos) de fallback
      let ttlSeconds = 86400;
      try {
        const now = new Date();
        const nextMonday = new Date();
        nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
        nextMonday.setHours(9, 0, 0, 0);

        if (nextMonday <= now) {
          // Si ya pasó el lunes de esta semana, el próximo es en 7 días
          nextMonday.setDate(nextMonday.getDate() + 7);
        }

        const diffMs = nextMonday.getTime() - now.getTime();
        ttlSeconds = Math.max(60, Math.floor(diffMs / 1000));
      } catch (ttlErr) {
        console.error('Error calculando TTL dinámico para el resumen semanal:', ttlErr.message);
      }

      // 4. Guardar en Redis con el TTL calculado
      await redis.setWithExpiry(cacheKey, responseData, ttlSeconds);

      return res.json(successResponse(responseData, 'Resumen semanal obtenido de la DB.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Endpoint interno para que N8N publique el resumen generado por IA
   */
  async postWeeklySummary(req, res, next) {
    try {
      const authKey = req.headers['x-internal-key'];
      if (!authKey || authKey !== INTERNAL_KEY) {
        return res.status(401).json(errorResponse('Clave interna inválida o no provista.'));
      }

      const { content_json, week_start } = req.body;

      if (!content_json || !week_start) {
        return res.status(400).json(errorResponse('Campos content_json y week_start son requeridos.'));
      }

      // Guardar en la DB
      await query(`
        INSERT INTO weekly_summaries (week_start, content_json, generated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (week_start) 
        DO UPDATE SET content_json = EXCLUDED.content_json, generated_at = NOW()
      `, [week_start, typeof content_json === 'string' ? content_json : JSON.stringify(content_json)]);

      // Invalidar caché de Redis
      const cacheKey = redis.KEYS.cache('content:weekly-summary');
      await redis.del(cacheKey);

      return res.status(200).json(successResponse({ saved: true }, 'Resumen semanal guardado y caché invalidado.'));
    } catch (err) {
      next(err);
    }
  }
};

module.exports = ContentController;
