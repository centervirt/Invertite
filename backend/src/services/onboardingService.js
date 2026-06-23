/**
 * INVERTITE - Onboarding Service
 */

/**
 * Calcula la recomendación de perfil y módulo basado en las respuestas del usuario
 * @param {Object} answers 
 * @param {string} answers.experienceLevel - 'ninguna' | 'basica' | 'intermedia'
 * @param {string} answers.primaryGoal - 'proteger_inflacion' | 'ahorrar_dolares' | 'hacer_crecer_capital' | 'entender_general'
 * @param {string} answers.riskTolerance - 'conservador' | 'moderado' | 'arriesgado'
 * @param {string} answers.timeHorizon - 'corto' | 'mediano' | 'largo'
 */
function calculateRecommendation(answers) {
  const { experienceLevel, primaryGoal, riskTolerance } = answers;
  
  // Lógica de recomendación de módulo inicial
  let recommendedModuleSlug = 'fundamentos-sistema-financiero'; 
  
  let profileLabel = '';
  
  if (experienceLevel === 'ninguna') {
    recommendedModuleSlug = 'fundamentos-sistema-financiero';
    profileLabel = primaryGoal === 'proteger_inflacion' 
      ? 'Protector de ahorros' 
      : 'Principiante curioso';
  } else if (experienceLevel === 'basica' && primaryGoal === 'ahorrar_dolares') {
    recommendedModuleSlug = 'dolar-financiero-cobertura';
    profileLabel = 'Dolarizador estratégico';
  } else if (experienceLevel === 'basica' && primaryGoal === 'hacer_crecer_capital') {
    recommendedModuleSlug = 'cedears-mercado-global';
    profileLabel = 'Constructor de cartera';
  } else if (riskTolerance === 'conservador') {
    recommendedModuleSlug = 'fondos-comunes-inversion';
    profileLabel = 'Conservador prudente';
  } else {
    recommendedModuleSlug = 'fundamentos-sistema-financiero';
    profileLabel = 'Inversor en formación';
  }
  
  return { recommendedModuleSlug, profileLabel };
}

module.exports = { calculateRecommendation };
