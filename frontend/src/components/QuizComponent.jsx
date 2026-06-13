import React, { useState } from 'react'
import quizService from '../services/quizService'

const QuizComponent = ({ quizId, onQuizPassed = null }) => {
  const [quizData, setQuizData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStarted, setIsStarted] = useState(false)

  // Respuestas del usuario: { [questionIndex]: selectedOptionIndex }
  const [selectedAnswers, setSelectedAnswers] = useState({})
  
  // Estado del resultado
  const [result, setResult] = useState(null) // { score, passed, results: [...], badgesEarned: [...] }
  const [showExplanation, setShowExplanation] = useState(false)

  // Cargar quiz
  const handleStartQuiz = async () => {
    setIsLoading(true)
    try {
      const data = await quizService.getQuiz(quizId)
      setQuizData(data.quiz)
      setQuestions(data.questions)
      setSelectedAnswers({})
      setResult(null)
      setShowExplanation(false)
      setIsStarted(true)
    } catch (err) {
      console.error('Error al cargar quiz:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectOption = (questionIdx, optionIdx) => {
    if (result) return // Desactivar si ya se envió el intento
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIdx]: optionIdx
    }))
  }

  const handleSubmitQuiz = async () => {
    // Validar que se respondieron todas
    if (Object.keys(selectedAnswers).length < questions.length) {
      alert('Por favor, respondé todas las preguntas antes de enviar.')
      return
    }

    setIsLoading(true)
    try {
      // Ordenar las respuestas en un array según order_index de las preguntas
      const orderedAnswers = questions.map((_, idx) => selectedAnswers[idx])
      const res = await quizService.submitAttempt(quizId, orderedAnswers)
      setResult(res)
      
      if (res.passed && onQuizPassed) {
        onQuizPassed(res)
      }
    } catch (err) {
      console.error('Error al enviar intento de quiz:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isStarted) {
    return (
      <div className="bg-slate-950/40 border border-slate-900 p-8 rounded-3xl text-center max-w-lg mx-auto select-none space-y-6">
        <div className="text-4xl">📝</div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Quiz de Comprobación</h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Poné a prueba los conceptos aprendidos en esta lección. Aprobás con el **70%** o más de respuestas correctas.
          </p>
        </div>
        <button 
          onClick={handleStartQuiz}
          disabled={isLoading}
          className="px-6 py-3 rounded-xl bg-accent-teal text-invertite-dark font-bold hover:brightness-110 active:scale-[0.98] transition-all text-sm w-full"
        >
          {isLoading ? 'Cargando Quiz...' : 'Comenzar Cuestionario'}
        </button>
      </div>
    )
  }

  // ── PANTALLA DE RESULTADOS ──
  if (result) {
    return (
      <div className="bg-slate-950/40 border border-slate-900 p-8 rounded-3xl text-center max-w-xl mx-auto space-y-6 select-none relative overflow-hidden">
        {result.passed && (
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none animate-pulse"></div>
        )}
        
        <div className="text-5xl">{result.passed ? '🎉' : '❌'}</div>
        
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-white">
            {result.passed ? '¡Felicitaciones, Aprobaste!' : 'Seguí intentándolo'}
          </h3>
          <p className="text-xs text-slate-400">
            Obtuviste un <strong className="text-white text-base">{result.score}%</strong> (Mínimo requerido: {result.passScore}%)
          </p>
        </div>

        {/* Badges obtenidos */}
        {result.badgesEarned && result.badgesEarned.length > 0 && (
          <div className="bg-accent-teal/10 border border-accent-teal/20 p-4 rounded-2xl max-w-sm mx-auto space-y-3">
            <span className="text-[10px] font-bold text-accent-teal uppercase tracking-widest block">¡Logro Desbloqueado!</span>
            {result.badgesEarned.map((badge, idx) => (
              <div key={idx} className="flex items-center justify-center space-x-2">
                <span className="text-2xl">{badge.icon}</span>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">{badge.name}</h4>
                  <p className="text-[10px] text-slate-400 font-light">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 max-w-xs mx-auto">
          <button 
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition-all"
          >
            {showExplanation ? 'Ocultar Corrección' : 'Revisar Respuestas'}
          </button>
          
          {!result.passed && (
            <button 
              onClick={handleStartQuiz}
              className="w-full py-3 rounded-xl bg-accent-teal text-invertite-dark text-xs font-bold hover:brightness-110 transition-all"
            >
              Volver a intentar
            </button>
          )}
        </div>

        {/* Correcciones del Cuestionario */}
        {showExplanation && (
          <div className="text-left border-t border-slate-900 pt-6 mt-6 space-y-6 max-h-80 overflow-y-auto pr-1">
            {result.results.map((q, idx) => (
              <div key={idx} className="space-y-2 text-xs">
                <h4 className="font-bold text-white">{idx + 1}. {q.questionText}</h4>
                <div className="grid gap-2">
                  {q.options.map((opt, oIdx) => {
                    let style = 'bg-slate-950 border-slate-900 text-slate-500'
                    if (oIdx === q.correctOption) {
                      style = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    } else if (oIdx === q.selectedOption && oIdx !== q.correctOption) {
                      style = 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }
                    return (
                      <div key={oIdx} className={`border p-3 rounded-xl font-medium ${style}`}>
                        {opt}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-slate-400 font-light leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-900/60 mt-2">
                  💡 <strong>Explicación:</strong> {q.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── PANTALLA DE CUESTIONARIO ACTIVO ──
  return (
    <div className="bg-slate-950/20 border border-slate-900/60 p-6 sm:p-8 rounded-3xl max-w-xl mx-auto space-y-8">
      <div className="flex justify-between items-center pb-4 border-b border-slate-900">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Quiz de Lección</h3>
        <span className="text-[10px] font-bold text-slate-500">{questions.length} preguntas</span>
      </div>

      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div key={q.id} className="space-y-3">
            <h4 className="text-sm font-semibold text-white leading-relaxed">
              {qIdx + 1}. {q.questionText}
            </h4>
            
            <div className="grid gap-2 text-xs">
              {q.options.map((option, oIdx) => {
                const isSelected = selectedAnswers[qIdx] === oIdx
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(qIdx, oIdx)}
                    className={`text-left p-3 rounded-xl border font-medium transition-all ${
                      isSelected 
                        ? 'border-accent-teal bg-accent-teal/5 text-accent-teal shadow-md shadow-accent-teal/5' 
                        : 'border-slate-800/80 bg-slate-950 hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleSubmitQuiz}
        disabled={isLoading || Object.keys(selectedAnswers).length < questions.length}
        className="w-full py-4 rounded-xl text-sm font-bold bg-accent-teal text-invertite-dark hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed pt-4 mt-6"
      >
        {isLoading ? 'Evaluando...' : 'Enviar Respuestas'}
      </button>
    </div>
  )
}

export default QuizComponent
