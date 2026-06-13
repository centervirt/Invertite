/**
 * INVERTITE — Controlador de Usuarios
 * Maneja: profile GET/PUT, dashboard
 */
const UserModel = require('../models/userModel');
const {
  successResponse,
  errorResponse,
  serializeUser,
  calculateStreak,
} = require('../utils/helpers');
const { queryAll } = require('../config/database');

// ── GET /api/v1/users/profile ─────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const userWithSub = await UserModel.findByIdWithSubscription(req.user.id);

    if (!userWithSub) {
      return res.status(404).json(errorResponse('Usuario no encontrado.'));
    }

    return res.json(
      successResponse(
        { user: serializeUser(userWithSub) },
        'Perfil obtenido.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/v1/users/profile ─────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, avatarUrl } = req.body;

    // No permitir cambiar el email por esta ruta
    if (req.body.email) {
      return res.status(400).json(
        errorResponse('No podés cambiar el email por esta ruta.')
      );
    }

    const updated = await UserModel.updateProfile(req.user.id, {
      fullName,
      avatarUrl,
    });

    if (!updated) {
      return res.status(404).json(errorResponse('Usuario no encontrado.'));
    }

    return res.json(
      successResponse(
        {
          user: {
            id:        updated.id,
            email:     updated.email,
            fullName:  updated.full_name,
            avatarUrl: updated.avatar_url,
            role:      updated.role,
            updatedAt: updated.updated_at,
          },
        },
        'Perfil actualizado correctamente.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/users/dashboard ───────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Stats principales del modelo
    const stats = await UserModel.getDashboardStats(userId);

    // Calcular racha: fechas de actividad de los últimos 60 días
    const activityDates = await queryAll(
      `SELECT DISTINCT completed_at::date AS activity_date
       FROM user_progress
       WHERE user_id = $1
         AND completed_at IS NOT NULL
         AND completed_at >= NOW() - INTERVAL '60 days'
       ORDER BY activity_date DESC`,
      [userId]
    );

    const streak = calculateStreak(
      activityDates.map(r => r.activity_date)
    );

    // Últimos badges obtenidos
    const recentBadges = await queryAll(
      `SELECT
         b.name, b.icon, b.description,
         ub.earned_at
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC
       LIMIT 5`,
      [userId]
    );

    // Módulos con progreso
    const modulesProgress = await queryAll(
      `SELECT
         m.id, m.title, m.slug, m.color_accent,
         m.order_index, m.is_published,
         COUNT(l.id)                                          AS lessons_total,
         COUNT(up.id) FILTER (WHERE up.status = 'completed') AS lessons_done
       FROM modules m
       LEFT JOIN lessons l ON l.module_id = m.id AND l.is_published = true
       LEFT JOIN user_progress up
         ON up.lesson_id = l.id AND up.user_id = $1
       GROUP BY m.id, m.title, m.slug, m.color_accent, m.order_index, m.is_published
       ORDER BY m.order_index`,
      [userId]
    );

    return res.json(
      successResponse(
        {
          progress:       stats.progress,
          streak:         { current: streak, unit: 'días' },
          badges: {
            count:  stats.badges.count,
            recent: recentBadges,
          },
          lastLesson:     stats.lastLesson,
          nextLesson:     stats.nextLesson,
          modules:        modulesProgress.map(m => ({
            id:           m.id,
            title:        m.title,
            slug:         m.slug,
            colorAccent:  m.color_accent,
            order:        m.order_index,
            lessonsTotal: parseInt(m.lessons_total),
            lessonsDone:  parseInt(m.lessons_done),
            pct:          m.lessons_total > 0
              ? Math.round(m.lessons_done / m.lessons_total * 100)
              : 0,
          })),
        },
        'Dashboard obtenido correctamente.'
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, getDashboard };
