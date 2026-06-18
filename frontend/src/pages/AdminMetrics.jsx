import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'

const AdminMetrics = () => {
  const [metrics, setMetrics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await adminService.getMetrics()
        setMetrics(data)
      } catch (err) {
        console.error(err)
        toast.error('Error al cargar métricas de administración.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-blue"></div>
        </div>
      </AdminLayout>
    )
  }

  const formatARS = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value)
  }

  return (
    <AdminLayout>
      <div className="space-y-8 select-none">
        
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Dashboard de Métricas</span>
          </h1>
          <p className="text-xs text-slate-400 font-light mt-1">
            Información operativa, ingresos recurrentes y tasa de aprobación de cuestionarios en tiempo real.
          </p>
        </div>

        {/* Tarjetas Principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Usuarios Registrados</span>
            <span className="text-2xl font-black text-white block mt-1">{metrics.totalUsers}</span>
            <span className="text-[10px] text-slate-450 block mt-1 font-light">Total de cuentas en la base</span>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Suscripciones Activas</span>
            <span className="text-2xl font-black text-accent-blue block mt-1">{metrics.activeSubscriptions}</span>
            <span className="text-[10px] text-slate-450 block mt-1 font-light">Suscripciones premium activas</span>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">MRR Estimado</span>
            <span className="text-2xl font-black text-green-400 block mt-1">{formatARS(metrics.mrrArs)}</span>
            <span className="text-[10px] text-slate-450 block mt-1 font-light">Ingreso recurrente mensual</span>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Churn Rate (30d)</span>
            <span className="text-2xl font-black text-red-400 block mt-1">{metrics.churnRate}%</span>
            <span className="text-[10px] text-slate-450 block mt-1 font-light">Tasa de bajas del período</span>
          </div>

        </div>

        {/* Segunda línea de widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Top Lecciones Completadas */}
          <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lecciones Más Completadas</h3>
              <p className="text-[10px] text-slate-500 font-light">Top lecciones con mayor interacción de alumnos.</p>
            </div>
            
            <div className="space-y-3">
              {metrics.mostVisitedLessons.length > 0 ? (
                metrics.mostVisitedLessons.map((l, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-950/30 border border-slate-900 p-3.5 rounded-xl">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-[9px] font-semibold text-accent-blue block uppercase">{l.moduleTitle}</span>
                      <span className="text-xs font-bold text-slate-200">{l.title}</span>
                    </div>
                    <span className="text-xs font-black text-white px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                      {l.completionsCount} 🏆
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-650 text-center py-6">No hay registros de lecciones completadas hoy.</p>
              )}
            </div>
          </div>

          {/* Desempeño de Quizzes */}
          <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aprobación de Cuestionarios</h3>
              <p className="text-[10px] text-slate-500 font-light">Tasa de aprobación promedio agrupado por lección.</p>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {metrics.quizPassRateByLesson.length > 0 ? (
                metrics.quizPassRateByLesson.map((q, idx) => {
                  let rateColor = 'text-green-400'
                  let bgRate = 'bg-green-500/10 border-green-500/10'
                  if (q.passRate < 50) {
                    rateColor = 'text-red-400'
                    bgRate = 'bg-red-500/10 border-red-500/10'
                  } else if (q.passRate < 75) {
                    rateColor = 'text-amber-400'
                    bgRate = 'bg-amber-500/10 border-amber-500/10'
                  }

                  return (
                    <div key={idx} className="flex justify-between items-center bg-slate-950/30 border border-slate-900 p-3.5 rounded-xl">
                      <div className="space-y-0.5 pr-2">
                        <span className="text-xs font-bold text-slate-200">{q.title}</span>
                        <span className="text-[9px] text-slate-500 block font-light">Intentos: {q.totalAttempts} (Aprobados: {q.passedAttempts})</span>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 border rounded-lg ${rateColor} ${bgRate}`}>
                        {q.passRate}%
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-650 text-center py-6">No hay intentos de cuestionarios registrados.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  )
}

export default AdminMetrics
