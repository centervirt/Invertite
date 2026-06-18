import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const AlertBell = () => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const fetchAlerts = async (isInitial = false) => {
    try {
      const { data } = await api.get('/alerts')
      const newCount = data.data.unread_count
      const newNotifs = data.data.notifications

      // Si hay más alertas no leídas que antes, mostrar un toast con la más nueva
      if (!isInitial && newCount > unreadCount && newNotifs.length > 0) {
        const newest = newNotifs.find(n => !n.is_read)
        if (newest) {
          toast(`🔔 Nueva Alerta: ${newest.title}`, {
            duration: 6000,
            icon: '🔔',
            style: {
              background: '#0f172a',
              color: '#fff',
              border: '1px solid #00C9A7'
            }
          })
        }
      }

      setUnreadCount(newCount)
      setNotifications(newNotifs)
    } catch (err) {
      console.error('Error al cargar alertas:', err.message)
    }
  }

  useEffect(() => {
    fetchAlerts(true)
    
    // Polling cada 2 minutos (120000 ms)
    const interval = setInterval(() => fetchAlerts(false), 120000)

    // Detectar clicks fuera para cerrar dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(interval)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [unreadCount])

  const markAllRead = async () => {
    try {
      await api.post('/alerts/mark-read', { all: true })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('Todas las alertas marcadas como leídas.')
    } catch (err) {
      console.error(err)
      toast.error('Error al marcar alertas.')
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.post('/alerts/mark-read', { notification_ids: [notif.id] })
        setUnreadCount(prev => Math.max(0, prev - 1))
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      } catch (err) {
        console.error(err)
      }
    }
    setIsOpen(false)
    navigate('/alertas')
  }

  return (
    <div className="relative select-none" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[9px] font-black rounded-full px-1 border-2 border-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-900 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs">
          <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950">
            <span className="font-extrabold text-white">Alertas recientes</span>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-[10px] text-accent-teal hover:underline font-bold"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-900">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-light">
                No tenés notificaciones.
              </div>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 hover:bg-slate-900/40 cursor-pointer transition-colors ${!notif.is_read ? 'bg-slate-900/10' : ''}`}
                >
                  <div className="flex items-center space-x-2">
                    {!notif.is_read && <div className="w-1.5 h-1.5 bg-accent-teal rounded-full"></div>}
                    <span className="font-bold text-white uppercase tracking-tight text-[11px]">{notif.title}</span>
                  </div>
                  <p className="text-slate-400 font-light mt-1 text-[11px] leading-relaxed">
                    {notif.body}
                  </p>
                  <span className="text-[9px] text-slate-650 font-medium block mt-1.5">
                    {new Date(notif.triggered_at).toLocaleDateString('es-AR')} {new Date(notif.triggered_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-950 border-t border-slate-900 text-center">
            <Link 
              to="/alertas" 
              onClick={() => setIsOpen(false)}
              className="text-xs text-accent-teal hover:underline font-bold"
            >
              Ver todas las alertas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertBell
