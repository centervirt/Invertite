/**
 * INVERTITE - Onboarding Controller
 */
const { query, queryOne } = require('../config/database');
const { calculateRecommendation } = require('../services/onboardingService');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /api/v1/onboarding/status
const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await queryOne(
      'SELECT onboarding_completed FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json(errorResponse('Usuario no encontrado.'));
    }

    const profile = await queryOne(
      'SELECT recommended_profile_label FROM investor_profiles WHERE user_id = $1',
      [userId]
    );

    const tourSteps = await query(
      'SELECT step_key FROM onboarding_tour_progress WHERE user_id = $1',
      [userId]
    );

    return res.json(successResponse({
      onboardingCompleted: user.onboarding_completed || false,
      hasProfile: !!profile,
      profileLabel: profile ? profile.recommended_profile_label : null,
      tourStepsCompleted: tourSteps.rows.map(row => row.step_key)
    }));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/onboarding/profile
const saveProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { experienceLevel, primaryGoal, riskTolerance, timeHorizon, monthlyInvestmentRange } = req.body;

    if (!experienceLevel || !primaryGoal || !riskTolerance || !timeHorizon) {
      return res.status(400).json(errorResponse('Todos los campos son obligatorios excepto el monto.'));
    }

    const { recommendedModuleSlug, profileLabel } = calculateRecommendation({
      experienceLevel, primaryGoal, riskTolerance, timeHorizon
    });

    const moduleData = await queryOne(
      'SELECT title FROM modules WHERE slug = $1',
      [recommendedModuleSlug]
    );

    const profile = await queryOne(
      `INSERT INTO investor_profiles (
        user_id, experience_level, primary_goal, risk_tolerance, time_horizon, 
        monthly_investment_range, recommended_module_slug, recommended_profile_label
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        experience_level = EXCLUDED.experience_level,
        primary_goal = EXCLUDED.primary_goal,
        risk_tolerance = EXCLUDED.risk_tolerance,
        time_horizon = EXCLUDED.time_horizon,
        monthly_investment_range = EXCLUDED.monthly_investment_range,
        recommended_module_slug = EXCLUDED.recommended_module_slug,
        recommended_profile_label = EXCLUDED.recommended_profile_label
      RETURNING *`,
      [
        userId, experienceLevel, primaryGoal, riskTolerance, timeHorizon,
        monthlyInvestmentRange || 'prefiero_no_decir', recommendedModuleSlug, profileLabel
      ]
    );

    return res.json(successResponse({
      profile,
      recommendation: {
        moduleSlug: recommendedModuleSlug,
        moduleTitle: moduleData ? moduleData.title : 'Módulo Recomendado',
        profileLabel,
        reason: 'En base a tu experiencia y objetivos, te sugerimos comenzar por este módulo para construir una base sólida.'
      }
    }));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/onboarding/tour-step
const recordTourStep = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { stepKey } = req.body;

    if (!stepKey) {
      return res.status(400).json(errorResponse('Falta stepKey.'));
    }

    await query(
      `INSERT INTO onboarding_tour_progress (user_id, step_key) 
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, stepKey]
    );

    const tourSteps = await query(
      'SELECT step_key FROM onboarding_tour_progress WHERE user_id = $1',
      [userId]
    );

    return res.json(successResponse({ stepsCompleted: tourSteps.rows.map(row => row.step_key) }, 'Paso registrado.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/onboarding/complete
const completeOnboarding = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE users 
       SET onboarding_completed = true, onboarding_completed_at = NOW() 
       WHERE id = $1`,
      [userId]
    );

    return res.json(successResponse({ success: true }, 'Onboarding completado.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  saveProfile,
  recordTourStep,
  completeOnboarding
};
