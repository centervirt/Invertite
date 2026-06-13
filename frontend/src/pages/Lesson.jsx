import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import moduleService from '../services/moduleService'
import DynamicChart from '../components/DynamicChart'
import QuizComponent from '../components/QuizComponent'
import toast from 'react-hot-toast'

const Lesson = () => {
  const { moduleSlug, lessonSlug } = useParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  
  // Timer para medir tiempo de estudio
  const startTimeRef = useRef(Date.now())

  // Reset del timer y recarga de lección al cambiar de slug
  useEffect(() => {
    const fetchLesson = async () => {
      setIsLoading(true)
      try {
        const res = await moduleService.getLesson(moduleSlug, lessonSlug)
        setData(res)
        startTimeRef.current = Date.now() // Reiniciar contador
      } catch (err) {
        console.error('Error al cargar lección:', err)
        toast.error('No se pudo cargar la lección.')
        navigate('/modulos')
      } finally {
        setIsLoading(false)
      }
    }
    fetchLesson()
  }, [moduleSlug, lessonSlug])

  const handleComplete = async () => {
    setCompleting(true)
    const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

    try {
      const res = await moduleService.completeLesson(moduleSlug, lessonSlug, elapsedSeconds)
      toast.success('¡Lección completada!')
      
      // Mostrar modal o toast de badges obtenidos
      if (res.badgesEarned && res.badgesEarned.length > 0) {
        res.badgesEarned.forEach(b => {
          toast(`🏆 ¡Logro Desbloqueado: ${b.name}!`, { icon: b.icon })
        })
      }

      // Redirigir al siguiente o volver al módulo
      if (data.lesson.navigation.next) {
        const next = data.lesson.navigation.next
        navigate(`/modulos/${next.moduleSlug}/lecciones/${next.slug}`)
      } else {
        navigate(`/modulos/${moduleSlug}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al marcar lección como completada.')
    } finally {
      setCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-teal"></div>
        </div>
      </DashboardLayout>
    )
  }

  const { lesson, progress } = data
  const content = Array.isArray(lesson.contentJson) ? lesson.contentJson : []

  // Renderizar bloques de contenido dinámico
  const renderBlock = (block, idx) => {
    switch (block.type) {
      case 'intro':
        return (
          <div key={idx} className="bg-slate-900/30 border-l-2 border-accent-teal p-4 rounded-r-xl text-xs text-slate-300 font-light italic leading-relaxed">
            {block.text}
          </div>
        )

      case 'heading':
        return (
          <h2 key={idx} className="text-lg font-bold text-white pt-6 tracking-tight">
            {block.text}
          </h2>
        )

      case 'paragraph':
        return (
          <p key={idx} className="text-xs text-slate-300 font-light leading-relaxed">
            {block.text}
          </p>
        )

      case 'highlight':
        return (
          <div key={idx} className="bg-accent-teal/5 border border-accent-teal/15 p-4 rounded-xl text-xs text-accent-teal leading-relaxed font-semibold">
            💡 {block.text}
          </div>
        )

      case 'chart':
        return (
          <div key={idx} className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center">Gráfico Interactivo</span>
            <DynamicChart dataKey={block.dataKey} chartType={block.chartType || 'line'} />
          </div>
        )

      case 'example':
        return (
          <div key={idx} className="bg-slate-950/40 border border-slate-900 p-5 rounded-2xl space-y-2 text-xs">
            <span className="text-[10px] font-bold text-accent-blue uppercase tracking-widest block">💼 {block.title || 'Ejemplo Práctico'}</span>
            <p className="text-slate-300 leading-relaxed font-light">{block.text}</p>
          </div>
        )

      case 'tutor_cta':
        return (
          <div key={idx} className="bg-slate-950/20 border border-slate-900/60 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-xs text-slate-300 font-light leading-relaxed">{block.prompt}</p>
            <Link 
              to="/tutor" 
              state={{ initialMessage: block.prompt, lessonId: lesson.id }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold rounded-xl transition-all"
            >
              Preguntar al Tutor IA
            </Link>
          </div>
        )

      case 'quiz_inline':
        return (
          <div key={idx} className="py-4">
            <QuizComponent quizId={block.quizId} />
          </div>
        )

      case 'summary':
        return (
          <div key={idx} className="bg-slate-900/10 border border-slate-900 p-5 rounded-2xl space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">📝 Resumen</span>
            <ul className="space-y-2 text-xs text-slate-300 font-light">
              {block.items.map((item, sIdx) => (
                <li key={sIdx} className="flex items-start space-x-2">
                  <span className="text-accent-teal mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )

      default:
        return null
    }
  }

  const hasNext = !!lesson.navigation.next
  const hasPrev = !!lesson.navigation.prev

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 pb-16">
        
        {/* Navegación Módulo */}
        <Link to={`/modulos/${moduleSlug}`} className="text-xs font-bold text-slate-500 hover:text-accent-teal transition-all">
          ← Volver al Módulo
        </Link>

        {/* Info Cabeza */}
        <div className="space-y-3 border-b border-slate-900 pb-6">
          <span className="text-[9px] font-bold text-accent-teal uppercase tracking-widest">Lección {lesson.orderIndex}</span>
          <h1 className="text-3xl font-black text-white">{lesson.title}</h1>
        </div>

        {/* Contenido Renderizado */}
        <article className="space-y-6">
          {content.length === 0 ? (
            <p className="text-slate-500 text-xs font-light">Esta lección se encuentra sin contenido estructurado.</p>
          ) : (
            content.map((block, idx) => renderBlock(block, idx))
          )}
        </article>

        {/* Navegación y Finalización */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex space-x-4 w-full sm:w-auto">
            {hasPrev ? (
              <Link 
                to={`/modulos/${lesson.navigation.prev.moduleSlug}/lecciones/${lesson.navigation.prev.slug}`}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-900 text-center transition-all"
              >
                ← Anterior
              </Link>
            ) : (
              <div className="flex-1 sm:flex-none"></div>
            )}

            {hasNext && (
              <Link 
                to={`/modulos/${lesson.navigation.next.moduleSlug}/lecciones/${lesson.navigation.next.slug}`}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-900 text-center transition-all"
              >
                Siguiente →
              </Link>
            )}
          </div>

          <button 
            onClick={handleComplete}
            disabled={completing}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-accent-teal text-invertite-dark hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {completing ? 'Completando...' : (progress.status === 'completed' ? 'Marcar Completado de nuevo' : 'Completar Lección')}
          </button>
        </div>

      </div>
    </DashboardLayout>
  )
}

export default Lesson
