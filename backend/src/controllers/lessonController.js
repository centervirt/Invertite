/**
 * INVERTITE — Controlador de Lecciones
 */
const LessonModel = require('../models/lessonModel');
const ProgressModel = require('../models/progressModel');
const ProgressService = require('../services/progressService');
const { successResponse, errorResponse } = require('../utils/helpers');
const redis = require('../config/redis');

// GET /api/v1/modules/:moduleSlug/lessons/:lessonSlug
const getLesson = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { moduleSlug, lessonSlug } = req.params;

    // Intentar leer de caché la parte estática de la lección
    const cacheKey = redis.KEYS.cache(`lesson:data:${lessonSlug}`);
    let lesson = await redis.get(cacheKey);

    if (!lesson) {
      lesson = await LessonModel.findBySlugs(moduleSlug, lessonSlug);
      if (!lesson) {
        return res.status(404).json(errorResponse('Lección no encontrada.'));
      }

      // Obtener datos estáticos de navegación y quiz
      const navigation = await LessonModel.getNavigation(lesson.module_order, lesson.order_index);
      const quiz = await LessonModel.getLessonQuiz(lesson.id);

      lesson = {
        ...lesson,
        navigation,
        quiz
      };

      // Guardar en caché por 1 hora (3600 segundos)
      await redis.set(cacheKey, lesson, 3600);
    }

    // Obtener o crear progreso del usuario dinámicamente
    const progress = await LessonModel.getOrCreateProgress(userId, lesson.id);

    return res.json(successResponse({
      lesson: {
        id: lesson.id,
        moduleId: lesson.module_id,
        orderIndex: lesson.order_index,
        title: lesson.title,
        slug: lesson.slug,
        contentJson: lesson.content_json,
        estimatedMinutes: lesson.estimated_minutes,
        navigation: lesson.navigation,
        quiz: lesson.quiz
      },
      progress
    }, 'Lección obtenida correctamente.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/modules/:moduleSlug/lessons/:lessonSlug/complete
const completeLesson = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { moduleSlug, lessonSlug } = req.params;
    const { seconds } = req.body;

    const lesson = await LessonModel.findBySlugs(moduleSlug, lessonSlug);
    if (!lesson) {
      return res.status(404).json(errorResponse('Lección no encontrada.'));
    }

    // Completar lección y actualizar tiempo invertido
    const secondsToAdd = parseInt(seconds) || 0;
    await LessonModel.complete(userId, lesson.id, secondsToAdd);

    // Invalidar cachés del usuario
    await redis.del(redis.KEYS.cache(`dashboard:${userId}`));
    await redis.del(redis.KEYS.cache(`modules:list:${userId}`));

    // Evaluar y otorgar logros
    const badgesEarned = [];

    // Trigger: lesson_completed (e.g. 'Primer Paso')
    const completedBadge = await ProgressService.checkAndAwardBadges(userId, { type: 'lesson_completed' });
    badgesEarned.push(...completedBadge);

    // Trigger: lessons_count (e.g. 10 o 25 lecciones)
    const countBadge = await ProgressService.checkAndAwardBadges(userId, { type: 'lessons_count' });
    badgesEarned.push(...countBadge);

    // Trigger: streak_days (e.g. 7 o 30 días)
    const streakBadge = await ProgressService.checkAndAwardBadges(userId, { type: 'streak_days' });
    badgesEarned.push(...streakBadge);

    // Comprobar si completó el módulo entero
    const isModuleCompleted = await ProgressModel.isModuleCompleted(userId, lesson.module_id);
    if (isModuleCompleted) {
      // Trigger: module_completed (específico de cada módulo)
      const moduleBadge = await ProgressService.checkAndAwardBadges(userId, {
        type: 'module_completed',
        moduleOrder: lesson.module_order
      });
      badgesEarned.push(...moduleBadge);

      // Trigger: modules_all (todos los módulos completos)
      const allModulesBadge = await ProgressService.checkAndAwardBadges(userId, { type: 'modules_all' });
      badgesEarned.push(...allModulesBadge);
    }

    return res.json(successResponse({
      completed: true,
      badgesEarned,
      moduleCompleted: isModuleCompleted
    }, 'Lección marcada como completada con éxito.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLesson,
  completeLesson
};
