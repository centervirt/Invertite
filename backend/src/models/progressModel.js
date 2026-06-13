/**
 * INVERTITE — Modelo de Progreso
 */
const { query, queryOne, queryAll } = require('../config/database');

const ProgressModel = {
  // Obtener estadísticas globales del usuario
  async getStats(userId) {
    const stats = await queryOne(
      `SELECT
         COUNT(*) FILTER (WHERE up.status = 'completed')::int AS lessons_completed,
         (SELECT COUNT(*)::int FROM lessons WHERE is_published = true) AS lessons_total
       FROM user_progress up
       JOIN lessons l ON l.id = up.lesson_id
       WHERE up.user_id = $1 AND l.is_published = true`,
      [userId]
    );

    // Contar módulos completados (donde todas sus lecciones publicadas están completadas)
    const modulesCompleted = await queryOne(
      `SELECT COUNT(*)::int AS count
       FROM (
         SELECT m.id
         FROM modules m
         JOIN lessons l ON l.module_id = m.id AND l.is_published = true
         LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1 AND up.status = 'completed'
         WHERE m.is_published = true
         GROUP BY m.id
         HAVING COUNT(l.id) = COUNT(up.id) AND COUNT(l.id) > 0
       ) AS completed_modules`,
      [userId]
    );

    const modulesTotal = await queryOne(
      `SELECT COUNT(*)::int AS count FROM modules WHERE is_published = true`
    );

    const badgesCount = await queryOne(
      `SELECT COUNT(*)::int AS count FROM user_badges WHERE user_id = $1`,
      [userId]
    );

    const lessonsCompleted = stats?.lessons_completed || 0;
    const lessonsTotal = stats?.lessons_total || 0;
    const progressPct = lessonsTotal > 0 ? parseFloat(((lessonsCompleted / lessonsTotal) * 100).toFixed(1)) : 0.0;

    return {
      lessonsCompleted,
      lessonsTotal,
      progressPct,
      modulesCompleted: modulesCompleted?.count || 0,
      modulesTotal: modulesTotal?.count || 0,
      badgesCount: badgesCount?.count || 0
    };
  },

  // Obtener todas las fechas de actividad únicas del usuario
  async getActivityDates(userId) {
    const rows = await queryAll(
      `SELECT DISTINCT date_trunc('day', activity_date)::date AS act_date
       FROM (
         SELECT completed_at AS activity_date FROM user_progress WHERE user_id = $1 AND completed_at IS NOT NULL
         UNION
         SELECT started_at AS activity_date FROM user_progress WHERE user_id = $1 AND started_at IS NOT NULL
         UNION
         SELECT completed_at AS activity_date FROM quiz_attempts WHERE user_id = $1 AND completed_at IS NOT NULL
       ) AS combined_activity
       ORDER BY act_date DESC`,
      [userId]
    );
    return rows.map(r => r.act_date);
  },

  // Verificar si un módulo específico está completo para un usuario
  async isModuleCompleted(userId, moduleId) {
    const row = await queryOne(
      `SELECT 
         COUNT(l.id) AS total,
         COUNT(up.id) FILTER (WHERE up.status = 'completed') AS completed
       FROM lessons l
       LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1
       WHERE l.module_id = $2 AND l.is_published = true`,
      [userId, moduleId]
    );
    if (!row) return false;
    const total = parseInt(row.total);
    const completed = parseInt(row.completed);
    return total > 0 && total === completed;
  },

  // Obtener cuántas lecciones ha completado un usuario en total
  async getCompletedLessonsCount(userId) {
    const row = await queryOne(
      `SELECT COUNT(*)::int AS count
       FROM user_progress
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    return row?.count || 0;
  },

  // Obtener cantidad de quizzes aprobados
  async getPassedQuizzesCount(userId) {
    const row = await queryOne(
      `SELECT COUNT(DISTINCT quiz_id)::int AS count
       FROM quiz_attempts
       WHERE user_id = $1 AND passed = true`,
      [userId]
    );
    return row?.count || 0;
  }
};

module.exports = ProgressModel;
