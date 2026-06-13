import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import moduleService from '../services/moduleService'
import toast from 'react-hot-toast'

const Modules = () => {
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await moduleService.getModules()
        setModules(data)
      } catch (err) {
        console.error('Error al cargar módulos:', err)
        toast.error('No se pudieron cargar los módulos.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchModules()
  }, [])

  const handleModuleClick = (mod) => {
    if (mod.status === 'locked') {
      toast.error('Este módulo se encuentra bloqueado. Debés completar el anterior al 100%.')
      return
    }
    navigate(`/modulos/${mod.slug}`)
  }

  // Clases CSS de colores para las tarjetas de módulos según el color_accent
  const accentColorMap = {
    emerald: 'border-emerald-500/20 text-emerald-400',
    teal: 'border-teal-500/20 text-teal-400',
    cyan: 'border-cyan-500/20 text-cyan-400',
    blue: 'border-blue-500/20 text-blue-400',
    indigo: 'border-indigo-500/20 text-indigo-400',
    violet: 'border-violet-500/20 text-violet-400',
    purple: 'border-purple-500/20 text-purple-400',
    fuchsia: 'border-fuchsia-500/20 text-fuchsia-400',
    rose: 'border-rose-500/20 text-rose-400',
    amber: 'border-amber-500/20 text-amber-400',
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

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-black text-white">Módulos Educativos</h1>
          <p className="text-xs text-slate-400 mt-1 font-light">
            Seguí la ruta de aprendizaje en orden secuencial para completar tu formación.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => {
            const isLocked = mod.status === 'locked'
            const isCompleted = mod.status === 'completed'
            const colorClass = accentColorMap[mod.colorAccent] || 'border-slate-800 text-slate-400'

            return (
              <div 
                key={mod.id}
                onClick={() => handleModuleClick(mod)}
                className={`bg-invertite-card border ${colorClass} p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.02] hover:-translate-y-0.5 transition-all relative cursor-pointer select-none group overflow-hidden`}
              >
                
                {/* Overlay de Candado si está bloqueado */}
                {isLocked && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] flex flex-col items-center justify-center space-y-2 text-slate-400 z-10">
                    <span className="text-2xl">🔒</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Módulo Bloqueado</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Módulo {mod.orderIndex}</span>
                    {isCompleted ? (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">Completado</span>
                    ) : (
                      !isLocked && (
                        <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800 font-bold">En curso</span>
                      )
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white group-hover:text-white transition-colors">
                    {mod.title}
                  </h3>
                  
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    {mod.description}
                  </p>
                </div>

                {/* Progress bar de este módulo */}
                <div className="pt-6 border-t border-slate-900/60 mt-6 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Avance</span>
                    <span>{mod.progressPct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full transition-all duration-500" style={{ width: `${mod.progressPct}%` }}></div>
                  </div>
                  <span className="text-[10px] text-slate-600 block text-right font-light font-semibold">
                    {mod.completedLessons} de {mod.totalLessons} lecciones
                  </span>
                </div>

              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Modules
