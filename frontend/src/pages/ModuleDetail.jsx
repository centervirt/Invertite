import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import moduleService from '../services/moduleService'
import toast from 'react-hot-toast'

const ModuleDetail = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [moduleData, setModuleData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const data = await moduleService.getModule(slug)
        setModuleData(data)
      } catch (err) {
        console.error('Error al cargar detalle del módulo:', err)
        toast.error('Módulo no encontrado.')
        navigate('/modulos')
      } finally {
        setIsLoading(false)
      }
    }
    fetchModule()
  }, [slug])

  // Redirige al alumno a la primera lección no completada en orden
  const handleContinue = () => {
    if (!moduleData || !moduleData.lessons) return
    const nextLesson = moduleData.lessons.find(l => l.status !== 'completed') || moduleData.lessons[0]
    navigate(`/modulos/${moduleData.slug}/lecciones/${nextLesson.slug}`)
  }

  // Mapa de logros (badges) asociados a la finalización de cada módulo
  const badgesMap = {
    1: { name: 'Experto en Fundamentos', icon: '💰', desc: 'Completaste el Módulo 1: Fundamentos del Dinero.' },
    2: { name: 'Conocedor del Sistema', icon: '🏦', desc: 'Completaste el Módulo 2: Sistema Financiero Argentino.' },
    3: { name: 'Maestro del Plazo Fijo', icon: '📆', desc: 'Completaste el Módulo 3: Plazo Fijo y Depósitos.' },
    4: { name: 'Gurú de los FCI', icon: '📊', desc: 'Completaste el Módulo 4: Fondos Comunes de Inversión.' },
    5: { name: 'Lector de Bonos', icon: '📜', desc: 'Completaste el Módulo 5: Bonos y Renta Fija.' },
    6: { name: 'Accionista del Merval', icon: '📈', desc: 'Completaste el Módulo 6: Acciones del Merval.' },
    7: { name: 'Operador de CEDEARs', icon: '🌎', desc: 'Completaste el Módulo 7: CEDEARs y Mercado Global.' },
    8: { name: 'Experto Cambiario', icon: '💵', desc: 'Completaste el Módulo 8: Dólar Financiero y Cobertura.' },
    9: { name: 'Arquitecto de Portafolios', icon: '🏗️', desc: 'Completaste el Módulo 9: Construcción de Portafolio.' },
    10: { name: 'Experto Fiscal', icon: '📋', desc: 'Completaste el Módulo 10: Impuestos y Aspecto Legal.' },
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

  const badgeEarned = badgesMap[moduleData.orderIndex]
  const isModuleCompleted = moduleData.progressPct === 100

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        
        {/* Navegación posterior */}
        <Link to="/modulos" className="text-xs font-bold text-slate-500 hover:text-accent-teal transition-all">
          ← Volver a Módulos
        </Link>

        {/* Header del Módulo */}
        <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="space-y-3 flex-1">
            <span className="text-[10px] font-bold text-accent-teal uppercase tracking-widest">Módulo {moduleData.orderIndex}</span>
            <h1 className="text-3xl font-black text-white">{moduleData.title}</h1>
            <p className="text-xs text-slate-400 font-light leading-relaxed max-w-2xl">{moduleData.description}</p>
            <span className="text-[10px] text-slate-500 block font-semibold">Duración Estimada: {moduleData.estimatedHours} horas</span>
          </div>

          <div className="w-full md:w-auto flex flex-col items-stretch sm:items-center gap-3">
            <button 
              onClick={handleContinue}
              className="px-6 py-3 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark text-sm font-bold rounded-xl active:scale-[0.98] transition-all"
            >
              {isModuleCompleted ? 'Repasar Lecciones' : 'Continuar Módulo'}
            </button>
          </div>
        </div>

        {/* Bloque Logro si el módulo está 100% completo */}
        {isModuleCompleted && badgeEarned && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-6 max-w-lg">
            <span className="text-5xl">{badgeEarned.icon}</span>
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Logro Obtenido</span>
              <h3 className="text-base font-bold text-white">{badgeEarned.name}</h3>
              <p className="text-[10px] text-slate-400 font-light leading-relaxed">{badgeEarned.desc}</p>
              
              {/* Quiz final stats si existen */}
              {moduleData.quizProgress && (
                <span className="text-[10px] text-emerald-400 font-semibold block pt-1">
                  Nota Quiz Final: {moduleData.quizProgress.score}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Lista de Lecciones */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Estructura del Contenido</h2>
          
          <div className="space-y-3">
            {moduleData.lessons.map((lesson) => {
              const isCompleted = lesson.status === 'completed'
              const isInProgress = lesson.status === 'in_progress'
              
              let statusText = 'Pendiente'
              let statusStyle = 'border-slate-900 bg-slate-950/20 text-slate-500'
              if (isCompleted) {
                statusText = 'Completado'
                statusStyle = 'border-emerald-500/15 bg-emerald-500/5 text-emerald-400'
              } else if (isInProgress) {
                statusText = 'En curso'
                statusStyle = 'border-accent-teal/20 bg-accent-teal/5 text-accent-teal'
              }

              return (
                <Link 
                  key={lesson.id}
                  to={`/modulos/${moduleData.slug}/lecciones/${lesson.slug}`}
                  className={`border p-5 rounded-2xl flex justify-between items-center hover:bg-slate-900/40 hover:-translate-y-0.5 transition-all select-none ${statusStyle}`}
                >
                  <div className="space-y-1 flex-1 pr-4">
                    <span className="text-[9px] font-semibold opacity-60">Clase {lesson.orderIndex}</span>
                    <h3 className="text-sm font-bold text-white">{lesson.title}</h3>
                    <span className="text-[10px] text-slate-500 block font-light">Estimado: {lesson.estimatedMinutes} minutos</span>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-widest">{statusText}</span>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}

export default ModuleDetail
