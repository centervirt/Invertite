/**
 * INVERTITE — Controlador de Alertas y Reglas de Mercado
 */
const { query, queryOne, queryAll } = require('../config/database');
const UserModel = require('../models/userModel');
const { successResponse, errorResponse } = require('../utils/helpers');

const INTERNAL_KEY = process.env.INTERNAL_KEY || 'invertite_internal_secret_key_2026';

const AlertController = {
  /**
   * Obtener notificaciones no leídas del usuario
   */
  async getNotifications(req, res, next) {
    try {
      const userId = req.user.id;

      const notifications = await queryAll(
        `SELECT id, alert_rule_id, title, body, is_read, triggered_at 
         FROM alert_notifications 
         WHERE user_id = $1 
         ORDER BY triggered_at DESC 
         LIMIT 20`,
        [userId]
      );

      const unreadCountRes = await queryOne(
        `SELECT COUNT(*)::int AS count 
         FROM alert_notifications 
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      );

      return res.json(
        successResponse({
          notifications,
          unread_count: unreadCountRes ? unreadCountRes.count : 0
        }, 'Notificaciones obtenidas.')
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * Marcar notificaciones como leídas
   */
  async markAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { notification_ids, all } = req.body;

      let result;
      if (all) {
        result = await query(
          `UPDATE alert_notifications 
           SET is_read = true 
           WHERE user_id = $1 AND is_read = false`,
          [userId]
        );
      } else {
        if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
          return res.status(400).json(errorResponse('notification_ids debe ser un array no vacío o all=true.'));
        }

        result = await query(
          `UPDATE alert_notifications 
           SET is_read = true 
           WHERE user_id = $1 AND id = ANY($2::uuid[])`,
          [userId, notification_ids]
        );
      }

      return res.json(successResponse({ updated: result.rowCount }, 'Notificaciones marcadas como leídas.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtener las reglas de alerta personalizadas del usuario
   */
  async getRules(req, res, next) {
    try {
      const userId = req.user.id;

      const rules = await queryAll(
        `SELECT id, instrument, condition, threshold, currency, is_active, created_at 
         FROM alert_rules 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      return res.json(successResponse({ rules }, 'Reglas de alerta obtenidas.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Crear nueva regla de alerta personalizada
   */
  async createRule(req, res, next) {
    try {
      const userId = req.user.id;
      const { instrument, condition, threshold, currency } = req.body;

      if (!instrument || !condition || threshold === undefined) {
        return res.status(400).json(errorResponse('Campos requeridos faltantes.'));
      }

      const validConditions = ['above', 'below', 'change_pct'];
      if (!validConditions.includes(condition)) {
        return res.status(400).json(errorResponse('Condición de alerta inválida.'));
      }

      // Validar límite del plan del usuario
      // Plan mensual = max 10 reglas
      const userWithSub = await UserModel.findByIdWithSubscription(userId);
      const planSlug = userWithSub?.plan_slug || 'free';

      if (planSlug === 'free') {
        return res.status(403).json(errorResponse('El simulador de alertas requiere una suscripción activa.'));
      }

      if (planSlug === 'monthly') {
        const countRes = await queryOne(
          'SELECT COUNT(*)::int AS count FROM alert_rules WHERE user_id = $1',
          [userId]
        );
        if (countRes && countRes.count >= 10) {
          return res.status(403).json(
            errorResponse('Límite alcanzado: El plan Mensual permite un máximo de 10 alertas. Actualizá al plan Anual o Vitalicio para alertas ilimitadas.')
          );
        }
      }

      // Crear regla
      const rule = await queryOne(
        `INSERT INTO alert_rules (user_id, instrument, condition, threshold, currency, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, instrument, condition, threshold, currency, is_active, created_at`,
        [userId, instrument.toUpperCase().trim(), condition, threshold, currency || 'ARS']
      );

      return res.status(201).json(successResponse({ rule }, 'Regla de alerta creada correctamente.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Eliminar regla de alerta personalizada
   */
  async deleteRule(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const rule = await queryOne(
        'SELECT id FROM alert_rules WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (!rule) {
        return res.status(404).json(errorResponse('Regla de alerta no encontrada.'));
      }

      await query('DELETE FROM alert_rules WHERE id = $1', [id]);

      return res.json(successResponse({ deleted: true }, 'Regla de alerta eliminada correctamente.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Enviar alertas automáticas (broadcast) a múltiples o todos los usuarios activos
   */
  async broadcastAlert(req, res, next) {
    try {
      const authKey = req.headers['x-internal-key'];
      if (!authKey || authKey !== INTERNAL_KEY) {
        return res.status(401).json(errorResponse('Clave interna inválida o no provista.'));
      }

      const { title, body, instrument, user_ids } = req.body;

      if (!title || !body || !instrument) {
        return res.status(400).json(errorResponse('Campos title, body e instrument son requeridos.'));
      }

      let targetUserIds = [];

      if (Array.isArray(user_ids) && user_ids.length > 0) {
        targetUserIds = user_ids;
      } else {
        // Broadcast a todos los usuarios activos
        const activeUsers = await queryAll('SELECT id FROM users WHERE is_active = true');
        targetUserIds = activeUsers.map(u => u.id);
      }

      if (targetUserIds.length === 0) {
        return res.json(successResponse({ sent_to: 0 }, 'No hay usuarios activos para enviar la alerta.'));
      }

      // Inserción masiva de notificaciones
      // Construimos una query parametrizada en lotes
      const values = [];
      const placeholders = [];
      let index = 1;

      targetUserIds.forEach(uid => {
        placeholders.push(`($${index}, $${index + 1}, $${index + 2})`);
        values.push(uid, title, body);
        index += 3;
      });

      await query(
        `INSERT INTO alert_notifications (user_id, title, body)
         VALUES ${placeholders.join(', ')}`,
        values
      );

      return res.json(successResponse({ sent_to: targetUserIds.length }, `Alerta enviada correctamente a ${targetUserIds.length} usuarios.`));
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AlertController;
