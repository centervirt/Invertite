/**
 * INVERTITE — Modelo de Módulos
 */
const { query, queryOne, queryAll } = require('../config/database');

const ModuleModel = {
  // Obtener todos los módulos con progreso de usuario
  async findAllWithProgress(userId) {
    const rows = await queryAll(
      `SELECT 
         m.id,
         m.order_index,
         m.title,
         m.slug,
         m.description,
         m.color_accent,
         m.estimated_hours,
         COUNT(l.id)::int AS total_lessons,
         COUNT(up.id) FILTER (WHERE up.status = 'completed')::int AS completed_lessons
       FROM modules m
       LEFT JOIN lessons l ON l.module_id = m.id AND l.is_published = true
       LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1
       WHERE m.is_published = true
       GROUP BY m.id, m.order_index, m.title, m.slug, m.description, m.color_accent, m.estimated_hours
       ORDER BY m.order_index ASC`,
      [userId]
    );

    // Calcular progreso y estados locked / in_progress / completed
    let previousCompleted = true; // El módulo 1 siempre está desbloqueado
    return rows.map((mod, index) => {
      const { total_lessons, completed_lessons } = mod;
      const progressPct = total_lessons > 0 ? Math.round((completed_lessons / total_lessons) * 100) : 0;
      
      let status = 'locked';
      if (index === 0 || previousCompleted) {
        status = (progressPct === 100 && total_lessons > 0) ? 'completed' : 'in_progress';
      }

      // Guardar el estado del actual para el siguiente módulo
      previousCompleted = (total_lessons > 0 && completed_lessons === total_lessons);

      return {
        id: mod.id,
        orderIndex: mod.order_index,
        title: mod.title,
        slug: mod.slug,
        description: mod.description,
        colorAccent: mod.color_accent,
        estimatedHours: parseFloat(mod.estimated_hours || 0),
        totalLessons: total_lessons,
        completedLessons: completed_lessons,
        progressPct,
        status
      };
    });
  },

  // Obtener un módulo por slug con sus lecciones y progreso
  async findBySlugWithProgress(userId, slug) {
    const mod = await queryOne(
      `SELECT id, order_index, title, slug, description, color_accent, estimated_hours
       FROM modules
       WHERE slug = $1 AND is_published = true`,
      [slug]
    );

    if (!mod) return null;

    // Obtener lecciones con progreso del usuario
    const lessons = await queryAll(
      `SELECT 
         l.id,
         l.order_index,
         l.title,
         l.slug,
         l.estimated_minutes,
         COALESCE(up.status, 'not_started') AS status,
         up.time_spent_seconds
       FROM lessons l
       LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1
       WHERE l.module_id = $2 AND l.is_published = true
       ORDER BY l.order_index ASC`,
      [userId, mod.id]
    );

    // Obtener intento aprobado de quiz de módulo si existe
    const quizProgress = await queryOne(
      `SELECT qa.id, qa.score, qa.passed, qa.completed_at
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = $1 AND q.module_id = $2 AND q.quiz_type = 'module' AND qa.passed = true
       ORDER BY qa.score DESC, qa.completed_at DESC
       LIMIT 1`,
      [userId, mod.id]
    );

    // Calcular estado del módulo basándose en todos los módulos publicados
    const allModules = await this.findAllWithProgress(userId);
    const thisModuleStats = allModules.find(m => m.id === mod.id);

    return {
      id: mod.id,
      orderIndex: mod.order_index,
      title: mod.title,
      slug: mod.slug,
      description: mod.description,
      colorAccent: mod.color_accent,
      estimatedHours: parseFloat(mod.estimated_hours || 0),
      lessons: lessons.map(l => ({
        id: l.id,
        orderIndex: l.order_index,
        title: l.title,
        slug: l.slug,
        estimatedMinutes: l.estimated_minutes,
        status: l.status,
        timeSpentSeconds: l.time_spent_seconds || 0
      })),
      quizProgress: quizProgress ? {
        attemptId: quizProgress.id,
        score: quizProgress.score,
        passed: quizProgress.passed,
        completedAt: quizProgress.completed_at
      } : null,
      status: thisModuleStats ? thisModuleStats.status : 'locked',
      progressPct: thisModuleStats ? thisModuleStats.progressPct : 0
    };
  }
};

module.exports = ModuleModel;
