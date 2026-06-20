/**
 * INVERTITE — Servicio N8N RAG
 * Consume el webhook de N8N para recuperar contexto del Vector Store y datos financieros.
 */

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const N8nRagService = {
  async getContext(question, lessonContext = null) {
    if (!N8N_WEBHOOK_URL) {
      console.warn('[N8nRagService] N8N_WEBHOOK_URL no configurado. Fallback a contexto vacío.');
      return { context: '', sources: [], market_data: {} };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

    try {
      const body = {
        question,
        lesson_module: lessonContext?.moduleTitle || lessonContext?.moduleSlug || null,
        user_level: 'beginner',
        gemini_api_key: process.env.GEMINI_API_KEY
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.N8N_API_KEY && { 'X-N8N-API-KEY': process.env.N8N_API_KEY })
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`n8n webhook returned status ${response.status}`);
      }

      const data = await response.json();
      return {
        reply: data.reply || null,
        context: data.context || '',
        sources: Array.isArray(data.sources) ? data.sources : [],
        market_data: data.market_data || {}
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[N8nRagService] Error al conectar con N8N RAG. Usando fallback graceful:', error.message);
      // Fallback graceful
      return {
        context: '',
        sources: [],
        market_data: {}
      };
    }
  }
};

module.exports = N8nRagService;
