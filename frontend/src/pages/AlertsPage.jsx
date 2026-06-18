import React, { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

const AlertsPage = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('notifications') // 'notifications' | 'rules'
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [rules, setRules] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Form states for creating a rule
  const [formData, setFormData] = useState({
    instrument: '',
    condition: 'above',
    threshold: '',
    currency: 'ARS'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch notifications and rules
  const fetchData = async () => {
    setLoading(true)
    try {
      const [notifRes, rulesRes] = await Promise.all([
        api.get('/alerts'),
        api.get('/alerts/rules')
      ])
      setNotifications(notifRes.data.data.notifications || [])
      setUnreadCount(notifRes.data.data.unread_count || 0)
      setRules(rulesRes.data.data.rules || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la información de alertas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await api.post('/alerts/mark-read', { all: true })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('Todas las alertas marcadas como leídas.')
    } catch (err) {
      console.error(err)
      toast.error('Error al marcar alertas.')
    }
  }

  // Mark a single notification as read
  const handleMarkSingleRead = async (id) => {
    try {
      await api.post('/alerts/mark-read', { notification_ids: [id] })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error(err)
    }
  }

  // Create alert rule
  const handleCreateRule = async (e) => {
    e.preventDefault()
    if (!formData.instrument.trim() || formData.threshold === '') {
      toast.error('Completá todos los campos requeridos.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        instrument: formData.instrument.toUpperCase().trim(),
        condition: formData.condition,
        threshold: parseFloat(formData.threshold),
        currency: formData.currency
      }

      const { data } = await api.post('/alerts/rules', payload)
      setRules(prev => [data.data.rule, ...prev])
      setFormData({
        instrument: '',
        condition: 'above',
        threshold: '',
        currency: 'ARS'
      })
      toast.success('Regla de alerta creada correctamente.')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al crear la regla.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete alert rule
  const handleDeleteRule = async (id) => {
    if (!window.confirm('¿Querés eliminar esta regla de alerta?')) return
    try {
      await api.delete(`/alerts/rules/${id}`)
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success('Regla de alerta eliminada.')
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar la regla.')
    }
  }

  const getConditionLabel = (condition) => {
    switch (condition) {
      case 'above': return 'Cruza por Encima de'
      case 'below': return 'Cruza por Debajo de'
      case 'change_pct': return 'Variación Pct. de'
      default: return condition
    }
  }

  const planSlug = user?.subscription?.planSlug || 'free'
  const isMonthly = planSlug === 'monthly'
  const ruleLimitText = isMonthly 
    ? `Límite del plan Mensual: ${rules.length} / 10 alertas`
    : 'Límite: Alertas ilimitadas (Plan Anual / Vitalicio)'

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none max-w-5xl mx-auto">
        
        {/* Banner Informativo */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3 text-xs text-slate-400 font-light">
          <span className="text-lg">🔔</span>
          <p>
            <strong>Sistema de Alertas:</strong> Configurá reglas personalizadas sobre cotizaciones del mercado argentino y CEDEARs para recibir avisos inmediatos en tu panel. Las alertas se procesan periódicamente.
          </p>
        </div>

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Alertas de Mercado</h1>
            <p className="text-slate-400 text-xs mt-1">Monitoreá cotizaciones y administrá tus reglas automáticas.</p>
          </div>
          
          <div className="text-right sm:text-left">
            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider">
              {ruleLimitText}
            </span>
          </div>
        </div>

        {/* Tabs de Navegación */}
        <div className="flex border-b border-slate-900">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 font-bold text-xs transition-all border-b-2 -mb-[2px] ${
              activeTab === 'notifications'
                ? 'border-accent-teal text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Notificaciones Recibidas {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full">{unreadCount}</span>}
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-3 font-bold text-xs transition-all border-b-2 -mb-[2px] ${
              activeTab === 'rules'
                ? 'border-accent-teal text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Configurar Reglas ({rules.length})
          </button>
        </div>

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-teal"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            
            {/* VISTA 1: HISTORIAL DE NOTIFICACIONES */}
            {activeTab === 'notifications' && (
              <div className="bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-950">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Historial de Notificaciones</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-accent-teal hover:underline font-bold"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 text-xs font-light">
                    No tenés notificaciones de alerta recientes.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-900/60">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.is_read && handleMarkSingleRead(notif.id)}
                        className={`p-5 flex justify-between items-start gap-4 transition-colors ${
                          !notif.is_read ? 'bg-slate-900/20 cursor-pointer' : 'hover:bg-slate-900/10'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {!notif.is_read && <div className="w-1.5 h-1.5 bg-accent-teal rounded-full animate-pulse"></div>}
                            <span className="font-bold text-white uppercase tracking-tight text-xs">{notif.title}</span>
                          </div>
                          <p className="text-slate-400 font-light text-xs leading-relaxed max-w-3xl">
                            {notif.body}
                          </p>
                          <span className="text-[9px] text-slate-650 block mt-2 font-medium">
                            {new Date(notif.triggered_at).toLocaleDateString('es-AR')} {new Date(notif.triggered_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {!notif.is_read && (
                          <span className="text-[10px] text-accent-teal bg-accent-teal/5 border border-accent-teal/10 px-2 py-0.5 rounded-full font-bold">
                            Nueva
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2: CONFIGURACIÓN DE REGLAS DE ALERTA */}
            {activeTab === 'rules' && (
              <div className="grid md:grid-cols-3 gap-6 items-start">
                
                {/* Formulario para Crear Regla */}
                <div className="md:col-span-1 bg-slate-950 border border-slate-900 rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white">Crear Nueva Alerta</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Configurá los disparadores de precio.</p>
                  </div>

                  <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Ticker / Activo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: AAPL, AL30, GGAL"
                        value={formData.instrument}
                        onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white uppercase placeholder-slate-650"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Condición</label>
                        <select
                          value={formData.condition}
                          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium"
                        >
                          <option value="above">Cruza arriba</option>
                          <option value="below">Cruza abajo</option>
                          <option value="change_pct">Var. %</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Moneda</label>
                        <select
                          value={formData.currency}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium"
                        >
                          <option value="ARS">ARS ($)</option>
                          <option value="USD">USD (USDT)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        {formData.condition === 'change_pct' ? 'Variación Porcentual (%)' : 'Precio Umbral / Target'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder={formData.condition === 'change_pct' ? 'Ej: 5 (para 5%)' : '0.00'}
                        value={formData.threshold}
                        onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-650"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creando...' : 'Crear Alerta'}
                    </button>
                  </form>
                </div>

                {/* Lista de Reglas Existentes */}
                <div className="md:col-span-2 bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden">
                  <div className="p-6 border-b border-slate-900 bg-slate-950">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reglas Activas</span>
                  </div>

                  {rules.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 text-xs font-light">
                      No tenés reglas de alerta creadas. Configura una a la izquierda.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-900">
                      {rules.map((rule) => (
                        <div key={rule.id} className="p-5 flex justify-between items-center text-xs">
                          <div className="space-y-1">
                            <span className="font-extrabold text-white uppercase text-sm tracking-tight">{rule.instrument}</span>
                            <div className="flex items-center space-x-2 text-slate-400 font-light mt-0.5">
                              <span>{getConditionLabel(rule.condition)}</span>
                              <span className="font-bold text-white">
                                {rule.condition === 'change_pct' 
                                  ? `${rule.threshold}%` 
                                  : `${rule.currency === 'USD' ? 'USDT' : '$'} ${parseFloat(rule.threshold).toLocaleString('es-AR')}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold text-[9px] uppercase tracking-wide">
                              Activa
                            </span>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-rose-400 hover:text-rose-350 font-bold px-3 py-1.5 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

export default AlertsPage
