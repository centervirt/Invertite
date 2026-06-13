/**
 * INVERTITE — Servicio de Gemini AI
 * Se comunica con la API de Google Gemini utilizando el modelo gemini-2.0-flash
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
const getGeminiClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('tu_')) {
      return null;
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

const GeminiService = {
  // Generar respuesta del tutor financiero
  async chat(messages, ragContext = '', lessonContext = null) {
    const client = getGeminiClient();
    
    // Modo Mock para testing o si no hay API key válida
    if (!client || process.env.NODE_ENV === 'test') {
      return '¡Hola! Soy tu Tutor IA de Invertite. En este momento estoy funcionando en modo de simulación, pero cuando estemos conectados podré responderte con inteligencia en tiempo real sobre el mercado argentino.';
    }

    const systemInstruction = `Eres el Tutor IA de Invertite, una plataforma de educación de finanzas personales e inversiones para argentinos.

Tu rol es:
1. Explicar conceptos de economía y finanzas de forma clara, didáctica y simple.
2. Usar analogías cotidianas y ejemplos prácticos en pesos argentinos (ARS) y activos del mercado local (BYMA, CNV, BCRA, brokers).
3. Contextualizar con la realidad económica argentina (inflación, dólar MEP, CCL, UVA, etc.).
4. Utilizar lenguaje rioplatense amigable y cercano (voseo: "vos", "tenés", "mirá").
5. Ser siempre paciente, motivador y claro.
6. IMPORTANTE: NO dar recomendaciones de inversión personalizadas (ej. comprar un bono o acción específica). Aclarar de manera natural que educas financieramente pero no asesoras de forma directa y que toda inversión conlleva riesgos.

Contexto recuperado por RAG (usalo si contiene información relevante para la pregunta):
"""
${ragContext}
"""

${lessonContext ? `Lección que el usuario está estudiando actualmente:
- Módulo: ${lessonContext.moduleTitle || 'Desconocido'}
- Lección: ${lessonContext.title || 'Desconocida'}
- Resumen: ${lessonContext.description || ''}` : ''}`;

    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction
    });

    // Formatear el historial para Gemini SDK.
    // El SDK espera contents en formato [{ role: 'user' | 'model', parts: [{ text: '...' }] }]
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await model.generateContent({
      contents: formattedContents,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.3
      }
    });

    return response.response.text();
  }
};

module.exports = GeminiService;
