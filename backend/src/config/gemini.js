const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;

const getGeminiClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no configurada en .env');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Obtiene el modelo Gemini con el system prompt del tutor financiero
 */
const getTutorModel = () => {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: `Eres el Tutor IA de Invertite, una plataforma de educación financiera para argentinos.
    
Tu rol es:
- Explicar conceptos de inversión de forma simple y accesible
- Usar ejemplos con pesos argentinos (ARS) y contexto local (BYMA, CNV, BCRA, etc.)
- Mencionar instrumentos locales: Plazos fijos, FCI, Cedears, Bonos, Acciones del Merval
- Hablar de inflación, dólar oficial, MEP, CCL cuando sea relevante
- NO dar asesoramiento financiero personalizado ni recomendar compras específicas
- Siempre aclarar que toda inversión conlleva riesgos
- Ser amigable, paciente y motivador con principiantes
- Responder siempre en español rioplatense (vos/nosotros)

Cuando no conozcas información actualizada de precios o tasas, indicarlo claramente.`,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
      topP: 0.9,
    },
  });
};

module.exports = { getGeminiClient, getTutorModel };
