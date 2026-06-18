/**
 * INVERTITE — Controlador del Tutor IA
 * Maneja el envío de preguntas del usuario, listados de conversaciones y recuperaciones de historial.
 */

const N8nRagService = require('../services/n8nRagService');
const GeminiService = require('../services/geminiService');
const { query, queryOne, queryAll } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// POST /api/v1/tutor/chat
const chat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message, conversationId, lessonId } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json(errorResponse('El mensaje no puede estar vacío.'));
    }

    // 1. Obtener detalles de la lección si se provee
    let lessonDetails = null;
    const effectiveLessonId = lessonId || null;
    if (effectiveLessonId) {
      lessonDetails = await queryOne(
        `SELECT l.id, l.title, m.title AS module_title, m.description
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         WHERE l.id = $1`,
        [effectiveLessonId]
      );
    }

    // 2. Buscar o crear la conversación
    let conversation = null;
    if (conversationId) {
      conversation = await queryOne(
        `SELECT id, messages FROM tutor_conversations WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
    } else {
      conversation = await queryOne(
        `SELECT id, messages FROM tutor_conversations 
         WHERE user_id = $1 AND lesson_id IS NOT DISTINCT FROM $2`,
        [userId, effectiveLessonId]
      );
    }

    if (!conversation) {
      conversation = await queryOne(
        `INSERT INTO tutor_conversations (user_id, lesson_id, messages, created_at, updated_at)
         VALUES ($1, $2, '[]'::jsonb, NOW(), NOW())
         RETURNING id, messages`,
        [userId, effectiveLessonId]
      );
    }

    // 3. Obtener contexto de RAG vía N8N
    const ragResult = await N8nRagService.getContext(message, lessonDetails);

    // 4. Preparar historial
    const dbMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
    
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    // Agregar el mensaje actual
    const chatHistory = [...dbMessages, userMessage];

    // 4.5. Construir contexto de portafolio del usuario
    let portfolioContext = '';
    try {
      const portfolio = await queryOne('SELECT id FROM portfolios WHERE user_id = $1', [userId]);
      if (portfolio) {
        const positions = await queryAll('SELECT ticker, quantity FROM portfolio_positions WHERE portfolio_id = $1', [portfolio.id]);
        if (positions.length > 0) {
          const totalQty = positions.reduce((sum, p) => sum + parseFloat(p.quantity), 0);
          const items = positions.map(p => {
            const pct = totalQty > 0 ? ((parseFloat(p.quantity) / totalQty) * 100).toFixed(0) : 0;
            return `${p.ticker.toUpperCase()} (${pct}%)`;
          });
          portfolioContext = `Cartera del usuario: ${items.join(', ')}`;
        }
      }
    } catch (portErr) {
      console.error('Error al generar contexto de portafolio para Tutor IA:', portErr.message);
    }

    // 5. Consultar a Gemini (si no viene ya respondido por N8N)
    let assistantReply = ragResult.reply || null;
    if (!assistantReply) {
      assistantReply = await GeminiService.chat(chatHistory, ragResult.context, lessonDetails, portfolioContext);
    }

    const assistantMessage = {
      role: 'assistant',
      content: assistantReply,
      timestamp: new Date().toISOString()
    };

    const fullHistory = [...chatHistory, assistantMessage];

    // 6. Limitar historial a los últimos 10 mensajes (ventana de contexto)
    const slicedHistory = fullHistory.slice(-10);

    // Guardar en DB
    await query(
      `UPDATE tutor_conversations 
       SET messages = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(slicedHistory), conversation.id]
    );

    return res.json(successResponse({
      reply: assistantReply,
      conversationId: conversation.id,
      sources: ragResult.sources || []
    }, 'Respuesta del Tutor IA generada.'));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/tutor/conversations
const getConversationsList = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const conversations = await queryAll(
      `SELECT 
         id, 
         lesson_id AS "lessonId", 
         created_at AS "createdAt", 
         updated_at AS "updatedAt",
         messages->-1->>'content' AS "lastMessagePreview"
       FROM tutor_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    return res.json(successResponse(conversations, 'Listado de conversaciones obtenido.'));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/tutor/conversations/:id
const getConversationById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (id !== 'general' && !uuidRegex.test(id)) {
      return res.status(400).json(errorResponse('ID de conversación inválido.'));
    }

    let conversation;
    if (id === 'general') {
      conversation = await queryOne(
        `SELECT id, lesson_id AS "lessonId", messages, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM tutor_conversations
         WHERE user_id = $1 AND lesson_id IS NULL`,
        [userId]
      );
      if (!conversation) {
        return res.json(successResponse({
          id: 'general',
          lessonId: null,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, 'Conversación general vacía.'));
      }
    } else {
      conversation = await queryOne(
        `SELECT id, lesson_id AS "lessonId", messages, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM tutor_conversations
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    }

    if (!conversation) {
      return res.status(404).json(errorResponse('Conversación no encontrada.'));
    }

    return res.json(successResponse({
      id: conversation.id,
      lessonId: conversation.lessonId,
      messages: conversation.messages || [],
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    }, 'Detalle de conversación obtenido.'));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/tutor/conversations/:id
const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (id !== 'general' && !uuidRegex.test(id)) {
      return res.status(400).json(errorResponse('ID de conversación inválido.'));
    }

    if (id === 'general') {
      await query(
        `DELETE FROM tutor_conversations WHERE user_id = $1 AND lesson_id IS NULL`,
        [userId]
      );
    } else {
      await query(
        `DELETE FROM tutor_conversations WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    }

    return res.json(successResponse(null, 'Conversación eliminada correctamente.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  chat,
  getConversationsList,
  getConversationById,
  deleteConversation
};
