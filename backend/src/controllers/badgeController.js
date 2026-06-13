/**
 * INVERTITE — Controlador de Badges (Logros)
 */
const BadgeModel = require('../models/badgeModel');
const { successResponse } = require('../utils/helpers');

// GET /api/v1/users/badges
const getUserBadges = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const badges = await BadgeModel.findAllWithUserStatus(userId);
    return res.json(successResponse(badges, 'Listado de logros del usuario obtenido.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUserBadges
};
