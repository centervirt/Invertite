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

    // 5. Consultar a Gemini (enviando la ventana del historial completo)
    const assistantReply = await GeminiService.chat(chatHistory, ragResult.context, lessonDetails);

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

    const conversation = await queryOne(
      `SELECT id, lesson_id AS "lessonId", messages, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM tutor_conversations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

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

module.exports = {
  chat,
  getConversationsList,
  getConversationById
};
