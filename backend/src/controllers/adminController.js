/**
 * INVERTITE — Controlador Administrativo
 */
const { query, queryOne, queryAll, queryPaginated } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');
const redis = require('../config/redis');

// Helper para registrar acciones en admin_actions_log
const logAdminAction = async (adminId, targetId, action, details) => {
  try {
    await query(
      `INSERT INTO admin_actions_log (admin_user_id, target_user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, targetId, action, JSON.stringify(details || {})]
    );
  } catch (err) {
    console.error('❌ Error al guardar log de acción admin:', err.message);
  }
};

// ── USUARIOS ──────────────────────────────────────────────────

// GET /api/v1/admin/users
const listUsers = async (req, res, next) => {
  try {
    const { page, limit = 20, search = '', planSlug = '', isActive = '' } = req.query;

    let baseQuery = `
      SELECT 
        u.id, 
        u.email, 
        u.full_name AS "fullName", 
        u.role, 
        u.is_active AS "isActive", 
        u.created_at AS "createdAt",
        s.status AS "subStatus",
        p.name AS "planName",
        COALESCE((SELECT COUNT(*)::int FROM user_progress up WHERE up.user_id = u.id AND up.status = 'completed'), 0) AS "lessonsCompleted"
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE 1=1
    `;

    const params = [];

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      baseQuery += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }

    if (planSlug) {
      params.push(planSlug);
      baseQuery += ` AND p.slug = $${params.length}`;
    }

    if (isActive !== '') {
      params.push(isActive === 'true');
      baseQuery += ` AND u.is_active = $${params.length}`;
    }

    baseQuery += ` ORDER BY u.created_at DESC`;

    if (!page) {
      const allUsers = await queryAll(baseQuery, params);
      return res.json(successResponse(allUsers, 'Usuarios listados con éxito.'));
    }

    const result = await queryPaginated(baseQuery, parseInt(page), parseInt(limit), params);
    return res.json(successResponse(result, 'Usuarios listados con éxito.'));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/users/:id
const getUserDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await queryOne(
      `SELECT 
         u.id, 
         u.email, 
         u.full_name AS "fullName", 
         u.avatar_url AS "avatarUrl",
         u.role, 
         u.is_active AS "isActive", 
         u.created_at AS "createdAt",
         u.updated_at AS "updatedAt",
         s.id AS "subId",
         s.status AS "subStatus",
         s.current_period_end AS "subExpiresAt",
         p.name AS "planName",
         p.slug AS "planSlug"
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE u.id = $1`,
      [id]
    );

    if (!user) {
      return res.status(404).json(errorResponse('Usuario no encontrado.'));
    }

    const badges = await queryAll(
      `SELECT b.name, b.icon, ub.earned_at AS "earnedAt"
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [id]
    );

    const progress = await queryAll(
      `SELECT 
         l.title, 
         m.title AS "moduleTitle", 
         up.status, 
         up.completed_at AS "completedAt", 
         up.time_spent_seconds AS "timeSpentSeconds"
       FROM user_progress up
       JOIN lessons l ON l.id = up.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE up.user_id = $1
       ORDER BY up.completed_at DESC NULLS LAST, up.started_at DESC`,
      [id]
    );

    // Obtener historial de auditoría del usuario
    const actionsLog = await queryAll(
      `SELECT 
         al.id,
         al.action,
         al.details,
         al.created_at AS "createdAt",
         admin.full_name AS "adminName",
         admin.email AS "adminEmail"
       FROM admin_actions_log al
       LEFT JOIN users admin ON admin.id = al.admin_user_id
       WHERE al.target_user_id = $1
       ORDER BY al.created_at DESC`,
      [id]
    );

    return res.json(successResponse({ user, badges, progress, actionsLog }, 'Detalle del usuario obtenido.'));
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/users/:id/subscription
const updateUserSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, planSlug } = req.body; // status: 'active' | 'cancelled' | 'expired' (or 'subscription_extended')

    if (!status) {
      return res.status(400).json(errorResponse('El estado (status) es requerido.'));
    }

    // Obtener info anterior de suscripción
    const oldSub = await queryOne(
      `SELECT s.id, s.status, p.slug AS "planSlug"
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [id]
    );

    // Desactivar suscripción activa actual
    await query(
      `UPDATE subscriptions 
       SET status = 'expired', 
           cancelled_at = NOW(),
           updated_at = NOW() 
       WHERE user_id = $1 AND status = 'active'`,
      [id]
    );

    let newSub = null;
    let actionName = 'subscription_cancelled';
    let details = { previousStatus: oldSub?.status || 'none', previousPlan: oldSub?.planSlug || 'none' };

    if (status === 'active') {
      const slug = planSlug || 'monthly';
      const plan = await queryOne(`SELECT id FROM plans WHERE slug = $1`, [slug]);
      if (!plan) {
        return res.status(404).json(errorResponse('Plan no encontrado.'));
      }

      newSub = await queryOne(
        `INSERT INTO subscriptions (
           user_id, plan_id, status, payment_provider, 
           current_period_start, current_period_end, created_at, updated_at
         )
         VALUES ($1, $2, 'active', 'manual', NOW(), NOW() + INTERVAL '1 month', NOW(), NOW())
         RETURNING id, status, current_period_end AS "expiresAt"`,
         [id, plan.id]
      );

      // Si ya tenía suscripción activa y se activa de nuevo, se considera una extensión o reactivación
      if (oldSub) {
        actionName = 'subscription_extended';
      } else {
        actionName = 'subscription_activated';
      }
      details.newPlan = slug;
    }

    // Registrar en auditoría
    await logAdminAction(req.user.id, id, actionName, details);

    // Invalidar caché de Redis
    await redis.del(redis.KEYS.cache(`dashboard:${id}`));
    await redis.del(redis.KEYS.cache(`modules:list:${id}`));

    return res.json(successResponse({ subscription: newSub }, 'Suscripción de usuario actualizada con éxito.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/admin/users/:id/reset
const resetUserProgress = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [id]);
    if (!user) {
      return res.status(404).json(errorResponse('Usuario no encontrado.'));
    }

    // Borrar todo el progreso y logs asociados a este usuario
    await query('DELETE FROM user_progress WHERE user_id = $1', [id]);
    await query('DELETE FROM quiz_attempts WHERE user_id = $1', [id]);
    await query('DELETE FROM user_badges WHERE user_id = $1', [id]);
    await query('DELETE FROM tutor_conversations WHERE user_id = $1', [id]);

    // Registrar en auditoría
    await logAdminAction(req.user.id, id, 'user_progress_reset', { reset_at: new Date().toISOString() });

    // Invalidar caché de Redis del usuario
    await redis.del(redis.KEYS.cache(`dashboard:${id}`));
    await redis.del(redis.KEYS.cache(`modules:list:${id}`));

    return res.json(successResponse(null, 'Progreso de curso del usuario reiniciado con éxito.'));
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/users/:id/status
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json(errorResponse('El campo isActive es requerido.'));
    }

    const user = await queryOne(
      `UPDATE users 
       SET is_active = $2, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, is_active AS "isActive"`,
      [id, !!isActive]
    );

    if (!user) {
      return res.status(404).json(errorResponse('Usuario no encontrado.'));
    }

    // Registrar acción de auditoría
    const action = !!isActive ? 'user_activated' : 'user_deactivated';
    await logAdminAction(req.user.id, id, action, { isActive: !!isActive });

    // Invalidar caché de Redis del usuario
    await redis.del(redis.KEYS.cache(`dashboard:${id}`));
    await redis.del(redis.KEYS.cache(`modules:list:${id}`));

    return res.json(successResponse(user, `Estado del usuario actualizado a ${!!isActive ? 'Activo' : 'Inactivo'}.`));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/admin/users/:id
const deactivateOrDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Hacemos soft delete: is_active = false
    const user = await queryOne(
      `UPDATE users 
       SET is_active = false, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, is_active AS "isActive"`,
      [id]
    );

    if (!user) {
      return res.status(404).json(errorResponse('Usuario no encontrado.'));
    }

    // Registrar acción de auditoría
    await logAdminAction(req.user.id, id, 'user_deleted', { softDelete: true });

    // Invalidar caché de Redis del usuario
    await redis.del(redis.KEYS.cache(`dashboard:${id}`));
    await redis.del(redis.KEYS.cache(`modules:list:${id}`));

    return res.json(successResponse(user, 'Usuario desactivado (soft delete) con éxito.'));
  } catch (err) {
    next(err);
  }
};

// ── CONTENIDO ─────────────────────────────────────────────────

// GET /api/v1/admin/modules
const listModules = async (req, res, next) => {
  try {
    const modules = await queryAll(
      `SELECT id, order_index AS "orderIndex", title, slug, description, color_accent AS "colorAccent", estimated_hours AS "estimatedHours", is_published AS "isPublished"
       FROM modules
       ORDER BY order_index ASC`
    );

    // Obtener lecciones para cada módulo
    for (let mod of modules) {
      mod.lessons = await queryAll(
        `SELECT id, order_index AS "orderIndex", title, slug, estimated_minutes AS "estimatedMinutes", is_published AS "isPublished"
         FROM lessons
         WHERE module_id = $1
         ORDER BY order_index ASC`,
        [mod.id]
      );
    }

    return res.json(successResponse(modules, 'Módulos y lecciones listados con éxito.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/admin/modules
const createModule = async (req, res, next) => {
  try {
    const { orderIndex, title, slug, description, colorAccent, estimatedHours, isPublished } = req.body;

    if (!title || !slug || orderIndex === undefined) {
      return res.status(400).json(errorResponse('orderIndex, title y slug son obligatorios.'));
    }

    const newModule = await queryOne(
      `INSERT INTO modules (order_index, title, slug, description, color_accent, estimated_hours, is_published, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, order_index AS "orderIndex", title, slug, description, color_accent AS "colorAccent", estimated_hours AS "estimatedHours", is_published AS "isPublished"`,
      [orderIndex, title, slug, description, colorAccent || 'teal', estimatedHours || 0, !!isPublished]
    );

    return res.json(successResponse(newModule, 'Módulo creado con éxito.'));
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/modules/:id
const updateModule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderIndex, title, slug, description, colorAccent, estimatedHours, isPublished } = req.body;

    const existing = await queryOne(`SELECT id FROM modules WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json(errorResponse('Módulo no encontrado.'));
    }

    const updated = await queryOne(
      `UPDATE modules
       SET order_index = COALESCE($2, order_index),
           title = COALESCE($3, title),
           slug = COALESCE($4, slug),
           description = COALESCE($5, description),
           color_accent = COALESCE($6, color_accent),
           estimated_hours = COALESCE($7, estimated_hours),
           is_published = COALESCE($8, is_published),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, order_index AS "orderIndex", title, slug, description, color_accent AS "colorAccent", estimated_hours AS "estimatedHours", is_published AS "isPublished"`,
      [id, orderIndex, title, slug, description, colorAccent, estimatedHours, isPublished !== undefined ? !!isPublished : undefined]
    );

    return res.json(successResponse(updated, 'Módulo actualizado con éxito.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/admin/lessons
const createLesson = async (req, res, next) => {
  try {
    const { moduleId, orderIndex, title, slug, contentJson, estimatedMinutes, isPublished } = req.body;

    if (!moduleId || !title || !slug || orderIndex === undefined) {
      return res.status(400).json(errorResponse('moduleId, orderIndex, title y slug son requeridos.'));
    }

    const newLesson = await queryOne(
      `INSERT INTO lessons (module_id, order_index, title, slug, content_json, estimated_minutes, is_published, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, module_id AS "moduleId", order_index AS "orderIndex", title, slug, content_json AS "contentJson", estimated_minutes AS "estimatedMinutes", is_published AS "isPublished"`,
      [moduleId, orderIndex, title, slug, JSON.stringify(contentJson || []), estimatedMinutes || 20, !!isPublished]
    );

    return res.json(successResponse(newLesson, 'Lección creada con éxito.'));
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/lessons/:id
const updateLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderIndex, title, slug, contentJson, estimatedMinutes, isPublished } = req.body;

    const existing = await queryOne(`SELECT id FROM lessons WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json(errorResponse('Lección no encontrada.'));
    }

    const updated = await queryOne(
      `UPDATE lessons
       SET order_index = COALESCE($2, order_index),
           title = COALESCE($3, title),
           slug = COALESCE($4, slug),
           content_json = COALESCE($5, content_json),
           estimated_minutes = COALESCE($6, estimated_minutes),
           is_published = COALESCE($7, is_published),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, module_id AS "moduleId", order_index AS "orderIndex", title, slug, content_json AS "contentJson", estimated_minutes AS "estimatedMinutes", is_published AS "isPublished"`,
      [id, orderIndex, title, slug, contentJson ? JSON.stringify(contentJson) : undefined, estimatedMinutes, isPublished !== undefined ? !!isPublished : undefined]
    );

    return res.json(successResponse(updated, 'Lección actualizada con éxito.'));
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/lessons/:id/publish
const togglePublishLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (isPublished === undefined) {
      return res.status(400).json(errorResponse('El campo isPublished es requerido.'));
    }

    const updated = await queryOne(
      `UPDATE lessons
       SET is_published = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, is_published AS "isPublished"`,
      [id, !!isPublished]
    );

    if (!updated) {
      return res.status(404).json(errorResponse('Lección no encontrada.'));
    }

    return res.json(successResponse(updated, `Lección ${!!isPublished ? 'publicada' : 'despublicada'} con éxito.`));
  } catch (err) {
    next(err);
  }
};

// ── MÉTRICAS ──────────────────────────────────────────────────

// GET /api/v1/admin/metrics
const getMetrics = async (req, res, next) => {
  try {
    const totalUsers = await queryOne(`SELECT COUNT(*)::int AS count FROM users`);
    const activeSub = await queryOne(`SELECT COUNT(*)::int AS count FROM subscriptions WHERE status = 'active'`);
    
    // MRR en ARS
    const mrrRes = await queryOne(
      `SELECT COALESCE(SUM(
         CASE 
           WHEN p.interval = 'monthly' THEN p.price_ars 
           WHEN p.interval = 'yearly' THEN p.price_ars / 12.0 
           ELSE 0.0 
         END
       ), 0.0)::double precision AS mrr
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.status = 'active'`
    );

    // Lecciones completadas hoy
    const completedToday = await queryOne(
      `SELECT COUNT(*)::int AS count 
       FROM user_progress 
       WHERE status = 'completed' AND completed_at::date = NOW()::date`
    );

    // Lecciones más visitadas
    const mostVisited = await queryAll(
      `SELECT l.title, m.title AS "moduleTitle", COUNT(up.id)::int AS "completionsCount"
       FROM user_progress up
       JOIN lessons l ON l.id = up.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE up.status = 'completed'
       GROUP BY l.id, l.title, m.title
       ORDER BY "completionsCount" DESC
       LIMIT 5`
    );

    // Tasa de aprobación de quizzes por lección
    const passRates = await queryAll(
      `SELECT 
         l.title, 
         COUNT(qa.id)::int AS "totalAttempts", 
         COUNT(qa.id) FILTER (WHERE qa.passed = true)::int AS "passedAttempts", 
         COALESCE(ROUND((COUNT(qa.id) FILTER (WHERE qa.passed = true))::numeric / NULLIF(COUNT(qa.id), 0) * 100, 1), 0.0)::double precision AS "passRate"
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       GROUP BY l.id, l.title
       ORDER BY "passRate" DESC`
    );

    // Churn rate (Cancelados vs Activos últimos 30 días)
    const churnRes = await queryOne(
      `SELECT 
         COALESCE(ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM subscriptions WHERE status = 'active'), 0) * 100), 1), 0.0)::double precision AS churn
       FROM subscriptions 
       WHERE status = 'cancelled' AND cancelled_at >= NOW() - INTERVAL '30 days'`
    );

    return res.json(successResponse({
      totalUsers: totalUsers.count,
      activeSubscriptions: activeSub.count,
      mrrArs: mrrRes.mrr,
      lessonsCompletedToday: completedToday.count,
      mostVisitedLessons: mostVisited,
      quizPassRateByLesson: passRates,
      churnRate: churnRes.churn
    }, 'Métricas obtenidas con éxito.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  getUserDetail,
  updateUserSubscription,
  resetUserProgress,
  updateUserStatus,
  deactivateOrDeleteUser,
  listModules,
  createModule,
  updateModule,
  createLesson,
  updateLesson,
  togglePublishLesson,
  getMetrics
};
