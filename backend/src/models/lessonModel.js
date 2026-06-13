/**
 * INVERTITE — Modelo de Lecciones
 */
const { query, queryOne, queryAll } = require('../config/database');

const LessonModel = {
  // Buscar lección por moduleSlug y lessonSlug
  async findBySlugs(moduleSlug, lessonSlug) {
    return queryOne(
      `SELECT l.id, l.module_id, l.order_index, l.title, l.slug, l.content_json, l.estimated_minutes, l.is_published,
              m.slug AS module_slug, m.order_index AS module_order
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE m.slug = $1 AND l.slug = $2 AND l.is_published = true AND m.is_published = true`,
      [moduleSlug, lessonSlug]
    );
  },

  // Obtener navegación (anterior y siguiente)
  async getNavigation(moduleOrder, lessonOrder) {
    const nextLesson = await queryOne(
      `SELECT l.slug AS lesson_slug, m.slug AS module_slug, l.title
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE l.is_published = true AND m.is_published = true
         AND (m.order_index > $1 OR (m.order_index = $1 AND l.order_index > $2))
       ORDER BY m.order_index ASC, l.order_index ASC
       LIMIT 1`,
      [moduleOrder, lessonOrder]
    );

    const prevLesson = await queryOne(
      `SELECT l.slug AS lesson_slug, m.slug AS module_slug, l.title
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE l.is_published = true AND m.is_published = true
         AND (m.order_index < $1 OR (m.order_index = $1 AND l.order_index < $2))
       ORDER BY m.order_index DESC, l.order_index DESC
       LIMIT 1`,
      [moduleOrder, lessonOrder]
    );

    return {
      prev: prevLesson ? { slug: prevLesson.lesson_slug, moduleSlug: prevLesson.module_slug, title: prevLesson.title } : null,
      next: nextLesson ? { slug: nextLesson.lesson_slug, moduleSlug: nextLesson.module_slug, title: nextLesson.title } : null
    };
  },

  // Obtener o crear progreso del usuario para una lección
  async getOrCreateProgress(userId, lessonId) {
    let progress = await queryOne(
      `SELECT id, status, started_at, completed_at, time_spent_seconds
       FROM user_progress
       WHERE user_id = $1 AND lesson_id = $2`,
      [userId, lessonId]
    );

    if (!progress) {
      progress = await queryOne(
        `INSERT INTO user_progress (user_id, lesson_id, status, started_at)
         VALUES ($1, $2, 'in_progress', NOW())
         RETURNING id, status, started_at, completed_at, time_spent_seconds`,
         [userId, lessonId]
      );
    }

    return {
      id: progress.id,
      status: progress.status,
      startedAt: progress.started_at,
      completedAt: progress.completed_at,
      timeSpentSeconds: progress.time_spent_seconds || 0
    };
  },

  // Marcar lección como completada
  async complete(userId, lessonId, secondsToAdd) {
    return queryOne(
      `INSERT INTO user_progress (user_id, lesson_id, status, started_at, completed_at, time_spent_seconds)
       VALUES ($1, $2, 'completed', NOW(), NOW(), $3)
       ON CONFLICT (user_id, lesson_id) 
       DO UPDATE SET 
         status = 'completed',
         completed_at = COALESCE(user_progress.completed_at, NOW()),
         time_spent_seconds = COALESCE(user_progress.time_spent_seconds, 0) + $3
       RETURNING id, status, started_at, completed_at, time_spent_seconds`,
      [userId, lessonId, secondsToAdd || 0]
    );
  },

  // Obtener el quiz de la lección sin respuestas correctas
  async getLessonQuiz(lessonId) {
    const quiz = await queryOne(
      `SELECT id, pass_score FROM quizzes WHERE lesson_id = $1 AND quiz_type = 'lesson'`,
      [lessonId]
    );

    if (!quiz) return null;

    const questions = await queryAll(
      `SELECT id, order_index, question_text, options
       FROM quiz_questions
       WHERE quiz_id = $1
       ORDER BY order_index ASC`,
      [quiz.id]
    );

    return {
      id: quiz.id,
      passScore: quiz.pass_score,
      questions: questions.map(q => ({
        id: q.id,
        orderIndex: q.order_index,
        questionText: q.question_text,
        options: q.options
      }))
    };
  }
};

module.exports = LessonModel;
