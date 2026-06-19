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
  async chat(messages, ragContext = '', lessonContext = null, portfolioContext = '') {
    const client = getGeminiClient();
    
    // Modo Mock para testing o si no hay API key válida
    if (!client || process.env.NODE_ENV === 'test') {
      return '¡Hola! Soy tu Tutor IA de Invertite. En este momento estoy funcionando en modo de simulación, pero cuando estemos conectados podré responderte con inteligencia en tiempo real sobre el mercado argentino.';
    }

    const systemInstruction = `Sos el tutor financiero de Invertite, una plataforma de educación financiera para argentinos que están dando sus primeros pasos en el mundo de las inversiones.

TU ROL:
- Explicás conceptos financieros en lenguaje simple, sin jerga innecesaria
- Usás ejemplos siempre en pesos argentinos y con referencias al mercado local
- Sos paciente, alentador y nunca hacés sentir al usuario ignorante
- Hablás en voseo argentino (vos, tenés, podés, etc.)

RESTRICCIONES IMPORTANTES:
- NUNCA das recomendaciones de inversión específicas ("comprá tal acción")
- SIEMPRE aclarás que el contenido es educativo, no asesoramiento financiero
- Si te preguntan por datos de mercado, usá SOLO los datos del contexto provisto
- No inventes precios, tasas ni rendimientos. Si no tenés el dato, decilo.
- No hablés de temas fuera de educación financiera e inversiones

CONTEXTO DE MERCADO ACTUAL:
${ragContext || 'No hay datos del contexto actual de mercado disponibles.'}

LECCIÓN ACTUAL DEL USUARIO:
${lessonContext ? `Título: ${lessonContext.title}\nDescripción: ${lessonContext.description || ''}\nMódulo: ${lessonContext.moduleTitle || ''}` : 'No hay lección actual seleccionada.'}

CONTEXTO ADICIONAL DEL USUARIO (PORTAFOLIO):
${portfolioContext || 'El usuario no tiene una cartera cargada aún.'}

Respondé de forma clara y concisa. Máximo 3 párrafos por respuesta.
Si el usuario hace una pregunta muy amplia, enfocate en lo más relevante para su lección actual y ofrecé profundizar después.`;

    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
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
        maxOutputTokens: 8192,
        temperature: 0.3
      }
    });

    return response.response.text();
  }
};

module.exports = GeminiService;
