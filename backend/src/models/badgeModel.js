/**
 * INVERTITE — Modelo de Badges (Logros)
 */
const { query, queryOne, queryAll } = require('../config/database');

const BadgeModel = {
  // Obtener todos los badges con el estado de obtención para el usuario
  async findAllWithUserStatus(userId) {
    const rows = await queryAll(
      `SELECT b.id, b.name, b.description, b.icon, b.trigger_type, b.trigger_value,
              ub.earned_at
       FROM badges b
       LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
       ORDER BY b.name ASC`,
      [userId]
    );

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      icon: r.icon,
      triggerType: r.trigger_type,
      triggerValue: r.trigger_value,
      earned: !!r.earned_at,
      earnedAt: r.earned_at || null
    }));
  },

  // Obtener todos los badges por trigger_type
  async findByTriggerType(triggerType) {
    return queryAll(
      `SELECT id, name, description, icon, trigger_type, trigger_value
       FROM badges
       WHERE trigger_type = $1`,
      [triggerType]
    );
  },

  // Otorgar un badge a un usuario
  async award(userId, badgeId) {
    return queryOne(
      `INSERT INTO user_badges (user_id, badge_id, earned_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, badge_id) DO NOTHING
       RETURNING id, user_id, badge_id, earned_at`,
      [userId, badgeId]
    );
  },

  // Obtener badges de un usuario específico
  async findUserBadges(userId) {
    return queryAll(
      `SELECT b.id, b.name, b.description, b.icon
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [userId]
    );
  }
};

module.exports = BadgeModel;
