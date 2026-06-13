/**
 * INVERTITE — Controlador de Quizzes
 */
const QuizModel = require('../models/quizModel');
const ProgressService = require('../services/progressService');
const { successResponse, errorResponse } = require('../utils/helpers');
const redis = require('../config/redis');

// GET /api/v1/quizzes/:quizId
const getQuiz = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      return res.status(404).json(errorResponse('Quiz no encontrado.'));
    }

    const questions = await QuizModel.getQuestionsPublic(quizId);
    const attempts = await QuizModel.getUserAttempts(userId, quizId);

    return res.json(successResponse({
      quiz: {
        id: quiz.id,
        lessonId: quiz.lesson_id,
        moduleId: quiz.module_id,
        quizType: quiz.quiz_type,
        passScore: quiz.pass_score
      },
      questions,
      attempts: attempts.map(att => ({
        id: att.id,
        score: att.score,
        passed: att.passed,
        attemptNumber: att.attempt_number,
        completedAt: att.completed_at
      }))
    }, 'Información del quiz obtenida.'));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/quizzes/:quizId/attempt
const submitAttempt = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;
    const { answers } = req.body; // Array de enteros: índices de respuestas del usuario

    if (!Array.isArray(answers)) {
      return res.status(400).json(errorResponse('Las respuestas deben ser proporcionadas como un arreglo.'));
    }

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      return res.status(404).json(errorResponse('Quiz no encontrado.'));
    }

    const questions = await QuizModel.getQuestionsFull(quizId);
    if (questions.length === 0) {
      return res.status(400).json(errorResponse('Este quiz no tiene preguntas configuradas.'));
    }

    // Evaluar respuestas
    let correctCount = 0;
    const results = questions.map((q, idx) => {
      const selectedOption = answers[idx] !== undefined ? answers[idx] : null;
      const isCorrect = selectedOption === q.correct_option;

      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: q.id,
        questionText: q.question_text,
        options: q.options,
        selectedOption,
        correctOption: q.correct_option,
        explanation: q.explanation,
        isCorrect
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.pass_score;

    // Obtener número de intento actual
    const attemptNumber = await QuizModel.getNextAttemptNumber(userId, quizId);

    // Guardar en la DB
    await QuizModel.saveAttempt({
      userId,
      quizId,
      score,
      passed,
      answers,
      attemptNumber
    });

    // Invalidar caché de dashboard y módulos de Redis ya que hubo actividad
    await redis.del(redis.KEYS.cache(`dashboard:${userId}`));
    await redis.del(redis.KEYS.cache(`modules:list:${userId}`));

    // Evaluar y otorgar logros
    const badgesEarned = [];

    // Trigger: quiz_completed (para perfecto al 100%)
    const perfectBadge = await ProgressService.checkAndAwardBadges(userId, {
      type: 'quiz_completed',
      score
    });
    badgesEarned.push(...perfectBadge);

    // Trigger: quiz_count (para Quiz Master con 20 aprobados)
    const countBadge = await ProgressService.checkAndAwardBadges(userId, { type: 'quiz_count' });
    badgesEarned.push(...countBadge);

    // Si es quiz de módulo y aprobó, evaluar logro de módulo completo
    if (passed && quiz.quiz_type === 'module') {
      const moduleBadge = await ProgressService.checkAndAwardBadges(userId, {
        type: 'module_completed',
        moduleOrder: quiz.module_order
      });
      badgesEarned.push(...moduleBadge);
    }

    return res.json(successResponse({
      score,
      passed,
      passScore: quiz.pass_score,
      results,
      badgesEarned
    }, 'Intento de quiz procesado con éxito.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuiz,
  submitAttempt
};
