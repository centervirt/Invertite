import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import WeeklySummary from '../components/WeeklySummary'
import userService from '../services/userService'
import tutorService from '../services/tutorService'
import api from '../services/api'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [tickerData, setTickerData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [portfolio, setPortfolio] = useState(null)

  // Tutor IA widget state
  const [tutorMessages, setTutorMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  // 1. Cargar datos del dashboard, ticker y simulador
  const loadPortfolio = async () => {
    try {
      const { data } = await api.get('/simulator/portfolio')
      setPortfolio(data.data.portfolio)
    } catch (err) {
      console.error('Error al cargar portfolio del simulador en dashboard:', err)
    }
  }

  const loadDashboardData = async () => {
    try {
      const data = await userService.getDashboard()
      setDashboardData(data)
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err)
    }
  }

  const loadTickerData = async () => {
    try {
      const { data } = await api.get('/market/dolar')
      const dollars = data.data
      const formattedTickers = [
        { name: 'Dólar Oficial', value: dollars.oficial?.price || 0, change: 0 },
        { name: 'Dólar Blue', value: dollars.blue?.price || 0, change: 0 },
        { name: 'Dólar MEP', value: dollars.mep?.price || 0, change: 0 },
        { name: 'Dólar CCL', value: dollars.ccl?.price || 0, change: 0 },
      ]
      setTickerData(formattedTickers)
    } catch (err) {
      console.error('Error al cargar cotizaciones:', err)
    }
  }

  const loadTutorHistory = async () => {
    try {
      const data = await tutorService.getConversation('general')
      // Quedarnos con los últimos 2 mensajes para el widget
      setTutorMessages(data.messages.slice(-2))
    } catch (err) {
      // Si falla porque no existe, se mantiene vacío
      setTutorMessages([])
    }
  }

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await Promise.all([loadDashboardData(), loadTickerData(), loadTutorHistory(), loadPortfolio()])
      setIsLoading(false)
    }
    init()

    // Configurar polling cada 60s para cotizaciones
    const tickerInterval = setInterval(() => {
      loadTickerData()
    }, 60000)

    return () => clearInterval(tickerInterval)
  }, [])

  // Enviar mensaje al tutor
  const handleSendTutorMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    setIsSending(true)
    const userMsg = { role: 'user', content: inputMessage }
    
    // Optimistic update
    setTutorMessages(prev => [...prev.slice(-1), userMsg])
    const prompt = inputMessage
    setInputMessage('')

    try {
      const res = await tutorService.sendMessage(prompt)
      const assistantMsg = { role: 'assistant', content: res.reply }
      setTutorMessages([userMsg, assistantMsg])
      toast.success('Respuesta del tutor recibida.')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo enviar el mensaje.')
    } finally {
      setIsSending(false)
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

  const progress = dashboardData?.progress || { lessonsCompleted: 0, lessonsTotal: 1, progressPct: 0, modulesCompleted: 0, modulesTotal: 10 }
  const streak = dashboardData?.streak?.current || 0
  const activeModule = dashboardData?.modules?.find(m => m.pct < 100) || dashboardData?.modules?.[0]

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        
        {/* Ticker de cotizaciones en tiempo real */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 overflow-x-auto scrollbar-thin">
          <div className="flex space-x-8 min-w-max">
            {tickerData.map((cot, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs font-semibold">
                <span className="text-slate-500">{cot.name}</span>
                <span className="text-white">${parseFloat(cot.value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                <span className={cot.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {cot.change >= 0 ? '+' : ''}{cot.change}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Saludo */}
        <div>
          <h1 className="text-3xl font-black text-white">¡Hola, {user?.fullName || 'Inversor'}! 👋</h1>
          <p className="text-xs text-slate-400 mt-1 font-light">Seguí sumando conocimientos financieros hoy.</p>
        </div>

        {/* Tarjetas de Progreso */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-invertite-card border border-slate-900 p-6 rounded-2xl space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Progreso Total</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white">{progress.progressPct}%</span>
              <span className="text-xs text-slate-500 font-medium">({progress.lessonsCompleted}/{progress.lessonsTotal} lecciones)</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-accent-teal rounded-full transition-all duration-500" style={{ width: `${progress.progressPct}%` }}></div>
            </div>
          </div>

          <div className="bg-invertite-card border border-slate-900 p-6 rounded-2xl space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Módulos Completados</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white">{progress.modulesCompleted}</span>
              <span className="text-xs text-slate-500 font-medium">de {progress.modulesTotal}</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-accent-blue rounded-full transition-all duration-500" style={{ width: `${(progress.modulesCompleted / progress.modulesTotal) * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-invertite-card border border-slate-900 p-6 rounded-2xl space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Racha de Estudio</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white">{streak} 🔥</span>
              <span className="text-xs text-slate-500 font-medium">{streak === 1 ? 'día consecutivo' : 'días consecutivos'}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-light leading-none">Mantené la constancia para desbloquear logros.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          
          {/* Módulo Actual */}
          <div className="md:col-span-2 bg-invertite-card border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-900">
              <div>
                <span className="text-[10px] font-bold text-accent-teal uppercase tracking-widest">Módulo en Curso</span>
                <h3 className="text-xl font-bold text-white mt-1">{activeModule?.title || 'Fundamentos'}</h3>
              </div>
              <Link to={`/modulos/${activeModule?.slug}`} className="text-xs font-bold text-accent-teal hover:underline">
                Ver Módulo →
              </Link>
            </div>

            {dashboardData?.nextLesson ? (
              <div className="bg-slate-950/40 border border-slate-900/60 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Próxima Lección recomendada</span>
                  <h4 className="text-sm font-bold text-white">{dashboardData.nextLesson.title}</h4>
                  <span className="text-[10px] text-slate-400 block font-light">Estimado: {dashboardData.nextLesson.estimated_minutes} minutos</span>
                </div>
                <Link 
                  to={`/modulos/${dashboardData.nextLesson.module_slug}/lecciones/${dashboardData.nextLesson.slug}`}
                  className="px-5 py-2.5 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
                >
                  Estudiar Ahora
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-500">¡Felicitaciones! Completaste todas las lecciones publicadas.</p>
            )}
          </div>

          {/* Tarjeta Resumen del Simulador */}
          <div className="md:col-span-2 bg-invertite-card border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-900">
              <div>
                <span className="bg-accent-teal/10 text-accent-teal text-[9px] px-2 py-0.5 rounded-full border border-accent-teal/20 font-bold uppercase tracking-wider">
                  Mercado Virtual
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Mi Cartera Simulada</h3>
              </div>
              <Link to="/simulador" className="text-xs font-bold text-accent-teal hover:underline">
                Operar ahora →
              </Link>
            </div>

            {portfolio ? (
              <div className="grid grid-cols-3 gap-4 py-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Valor Total</span>
                  <span className="text-base font-black text-white block mt-0.5">
                    ${parseFloat(portfolio.totalValue).toLocaleString('es-AR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Efectivo</span>
                  <span className="text-base font-black text-slate-350 block mt-0.5">
                    ${parseFloat(portfolio.cashBalance).toLocaleString('es-AR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Retorno</span>
                  <span className={`text-base font-black block mt-0.5 ${parseFloat(portfolio.totalReturnArs) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {parseFloat(portfolio.totalReturnArs) >= 0 ? '+' : ''}{portfolio.totalReturnPct}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-light">Todavía no tenés una cartera simulada creada.</span>
                <Link to="/simulador" className="px-4 py-2 bg-accent-teal text-slate-950 font-bold rounded-xl text-xs hover:bg-accent-teal/90">
                  Empezar Simulación
                </Link>
              </div>
            )}
          </div>

          {/* Widget del Tutor IA */}
          <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 flex flex-col justify-between h-96">
            <div>
              <div className="flex items-center space-x-2 pb-4 border-b border-slate-900">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Tutor Rápido</h3>
                  <span className="text-[9px] text-slate-500 mt-1 block font-light">Hacé preguntas sobre tu aprendizaje</span>
                </div>
              </div>

              {/* Mensajes */}
              <div className="space-y-3 py-4 overflow-y-auto h-48 text-[11px] pr-1">
                {tutorMessages.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 font-light">Preguntame lo que quieras sobre finanzas argentinas.</p>
                ) : (
                  tutorMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-xl ${
                        msg.role === 'user' 
                          ? 'bg-slate-900 text-slate-300 ml-4' 
                          : 'bg-slate-800 text-slate-300 mr-4'
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSendTutorMessage} className="flex gap-2 border-t border-slate-900 pt-3">
              <input 
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="¿Qué es el dólar MEP?"
                disabled={isSending}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-accent-teal rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
              <button 
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark px-3 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSending ? '...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>

        {/* Resumen Semanal IA */}
        <WeeklySummary />

      </div>
    </DashboardLayout>

  )
}

export default Dashboard
