/**
 * INVERTITE — Controlador del Tutor IA
 * Maneja el envío de preguntas del usuario y la recuperación del historial.
 */

const N8nRagService = require('../services/n8nRagService');
const GeminiService = require('../services/geminiService');
const { query, queryOne } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// POST /api/v1/tutor/chat
const chat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message, lessonId } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json(errorResponse('El mensaje no puede estar vacío.'));
    }

    // 1. Obtener detalles de la lección si se provee
    let lessonDetails = null;
    if (lessonId) {
      lessonDetails = await queryOne(
        `SELECT l.id, l.title, m.title AS module_title, m.description
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         WHERE l.id = $1`,
        [lessonId]
      );
    }

    // 2. Obtener o crear conversación en base de datos
    // Usamos IS NOT DISTINCT FROM para manejar de forma segura tanto UUIDs como NULL
    let conversation = await queryOne(
      `SELECT id, messages FROM tutor_conversations 
       WHERE user_id = $1 AND lesson_id IS NOT DISTINCT FROM $2`,
      [userId, lessonId || null]
    );

    if (!conversation) {
      conversation = await queryOne(
        `INSERT INTO tutor_conversations (user_id, lesson_id, messages, created_at, updated_at)
         VALUES ($1, $2, '[]'::jsonb, NOW(), NOW())
         RETURNING id, messages`,
        [userId, lessonId || null]
      );
    }

    // 3. Recuperar RAG context vía N8N
    const ragResult = await N8nRagService.getContext(message, lessonDetails);

    // 4. Preparar el historial de mensajes para Gemini
    // El formato en DB es array de { role, content, timestamp }
    const dbMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
    
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    // Agregar el mensaje actual del usuario al historial que se envía a Gemini
    const chatHistory = [...dbMessages, userMessage];

    // 5. Llamar a Gemini
    const assistantReply = await GeminiService.chat(chatHistory, ragResult.context, lessonDetails);

    const assistantMessage = {
      role: 'assistant',
      content: assistantReply,
      timestamp: new Date().toISOString()
    };

    // 6. Actualizar historial en la DB
    const updatedHistory = [...chatHistory, assistantMessage];
    await query(
      `UPDATE tutor_conversations 
       SET messages = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(updatedHistory), conversation.id]
    );

    return res.json(successResponse({
      response: assistantReply,
      sources: ragResult.sources,
      conversationId: conversation.id
    }, 'Respuesta del Tutor IA generada.'));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/tutor/conversations/:lessonId (opcional) o general
const getConversationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const lessonId = req.params.lessonId === 'general' ? null : req.params.lessonId;

    const conversation = await queryOne(
      `SELECT id, messages FROM tutor_conversations 
       WHERE user_id = $1 AND lesson_id IS NOT DISTINCT FROM $2`,
      [userId, lessonId]
    );

    return res.json(successResponse({
      messages: conversation ? conversation.messages : []
    }, 'Historial obtenido correctamente.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  chat,
  getConversationHistory
};
