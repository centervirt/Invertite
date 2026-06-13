/**
 * INVERTITE — Servicio de Progreso
 * Encapsula la lógica compartida para estadísticas, racha, badges y recomendaciones.
 */
const ProgressModel = require('../models/progressModel');
const BadgeModel = require('../models/badgeModel');
const UserModel = require('../models/userModel');
const { queryAll } = require('../config/database');
const { calculateStreak } = require('../utils/helpers');

const ProgressService = {
  // Obtener estadísticas globales del usuario
  async getUserProgress(userId) {
    const stats = await ProgressModel.getStats(userId);
    const activityDates = await ProgressModel.getActivityDates(userId);
    const currentStreak = calculateStreak(activityDates);

    return {
      ...stats,
      currentStreak
    };
  },

  // Calcular racha de días consecutivos
  async calculateStreak(userId) {
    const activityDates = await ProgressModel.getActivityDates(userId);
    return calculateStreak(activityDates);
  },

  // Obtener próxima lección recomendada
  async getNextLesson(userId) {
    return UserModel.getDashboardStats(userId).then(stats => stats.nextLesson);
  },

  // Evaluar y otorgar logros (badges)
  async checkAndAwardBadges(userId, trigger) {
    // 1. Obtener los badges que el usuario ya tiene
    const earnedBadges = await BadgeModel.findUserBadges(userId);
    const earnedIds = new Set(earnedBadges.map(b => b.id));

    // 2. Obtener todos los badges del sistema
    const allBadges = await queryAll(
      `SELECT id, name, description, icon, trigger_type, trigger_value FROM badges`
    );

    // 3. Filtrar los que aún no tiene
    const unearnedBadges = allBadges.filter(b => !earnedIds.has(b.id));

    const awarded = [];

    // Caché local para evitar queries repetidas dentro del mismo check
    let stats = null;
    const getStatsCached = async () => {
      if (!stats) stats = await ProgressModel.getStats(userId);
      return stats;
    };

    let streak = null;
    const getStreakCached = async () => {
      if (streak === null) {
        streak = await this.calculateStreak(userId);
      }
      return streak;
    };

    for (const badge of unearnedBadges) {
      let qualifies = false;
      const triggerValue = badge.trigger_value || {};

      switch (badge.trigger_type) {
        case 'lesson_completed':
          if (trigger.type === 'lesson_completed') {
            const userStats = await getStatsCached();
            if (userStats.lessonsCompleted >= 1) {
              qualifies = true;
            }
          }
          break;

        case 'lessons_count':
          const userStats = await getStatsCached();
          if (userStats.lessonsCompleted >= (triggerValue.count || 0)) {
            qualifies = true;
          }
          break;

        case 'module_completed':
          if (trigger.type === 'module_completed' && trigger.moduleOrder === triggerValue.module_order) {
            qualifies = true;
          }
          break;

        case 'modules_all':
          const statsModules = await getStatsCached();
          if (statsModules.modulesCompleted === statsModules.modulesTotal && statsModules.modulesTotal > 0) {
            qualifies = true;
          }
          break;

        case 'streak_days':
          const userStreak = await getStreakCached();
          if (userStreak >= (triggerValue.days || 0)) {
            qualifies = true;
          }
          break;

        case 'quiz_perfect':
          if (trigger.type === 'quiz_completed' && trigger.score === 100) {
            qualifies = true;
          }
          break;

        case 'quiz_count':
          const passedQuizzes = await ProgressModel.getPassedQuizzesCount(userId);
          if (passedQuizzes >= (triggerValue.count || 0)) {
            qualifies = true;
          }
          break;

        case 'subscription':
          const userWithSub = await UserModel.findByIdWithSubscription(userId);
          if (userWithSub?.sub_status === 'active' && triggerValue.plans?.includes(userWithSub.plan_slug)) {
            qualifies = true;
          }
          break;

        default:
          break;
      }

      if (qualifies) {
        await BadgeModel.award(userId, badge.id);
        awarded.push({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon
        });
      }
    }

    return awarded;
  }
};

module.exports = ProgressService;
