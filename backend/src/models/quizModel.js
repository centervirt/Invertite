/**
 * INVERTITE — Modelo de Quizzes
 */
const { query, queryOne, queryAll } = require('../config/database');

const QuizModel = {
  // Obtener un quiz por ID
  async findById(quizId) {
    return queryOne(
      `SELECT q.id, q.lesson_id, q.module_id, q.quiz_type, q.pass_score,
              m.slug AS module_slug, l.slug AS lesson_slug
       FROM quizzes q
       LEFT JOIN modules m ON m.id = q.module_id
       LEFT JOIN lessons l ON l.id = q.lesson_id
       WHERE q.id = $1`,
      [quizId]
    );
  },

  // Obtener preguntas de un quiz SIN correct_option ni explanation
  async getQuestionsPublic(quizId) {
    return queryAll(
      `SELECT id, order_index, question_text, options
       FROM quiz_questions
       WHERE quiz_id = $1
       ORDER BY order_index ASC`,
      [quizId]
    );
  },

  // Obtener preguntas con respuestas correctas y explicaciones para evaluar
  async getQuestionsFull(quizId) {
    return queryAll(
      `SELECT id, order_index, question_text, options, correct_option, explanation
       FROM quiz_questions
       WHERE quiz_id = $1
       ORDER BY order_index ASC`,
      [quizId]
    );
  },

  // Obtener intentos previos del usuario
  async getUserAttempts(userId, quizId) {
    return queryAll(
      `SELECT id, score, passed, answers, attempt_number, completed_at
       FROM quiz_attempts
       WHERE user_id = $1 AND quiz_id = $2
       ORDER BY completed_at DESC`,
      [userId, quizId]
    );
  },

  // Obtener número del próximo intento
  async getNextAttemptNumber(userId, quizId) {
    const row = await queryOne(
      `SELECT MAX(attempt_number) AS max_attempt
       FROM quiz_attempts
       WHERE user_id = $1 AND quiz_id = $2`,
      [userId, quizId]
    );
    return (row?.max_attempt || 0) + 1;
  },

  // Guardar intento de quiz
  async saveAttempt({ userId, quizId, score, passed, answers, attemptNumber }) {
    return queryOne(
      `INSERT INTO quiz_attempts (user_id, quiz_id, score, passed, answers, attempt_number, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, score, passed, answers, attempt_number, completed_at`,
      [userId, quizId, score, passed, JSON.stringify(answers), attemptNumber]
    );
  }
};

module.exports = QuizModel;
