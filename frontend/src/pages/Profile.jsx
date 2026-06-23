import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import userService from '../services/userService'
import paymentService from '../services/paymentService'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'

const AVATAR_PRESETS = [
  '🚀', '📈', '🦁', '🦉', '🦊', '🐼', '💎', '💡', '💰', '🧠'
]

const Profile = () => {
  const navigate = useNavigate()
  const [userProfile, setUserProfile] = useState(null)
  const [dashboardStats, setDashboardStats] = useState(null)
  const [allBadges, setAllBadges] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Edit fields
  const [fullName, setFullName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [isCustomAvatar, setIsCustomAvatar] = useState(false)
  const [customAvatarUrl, setCustomAvatarUrl] = useState('')

  const loadProfileData = async () => {
    try {
      const profileData = await userService.getProfile()
      setUserProfile(profileData.user)
      setFullName(profileData.user.fullName || '')
      
      const avatarVal = profileData.user.avatarUrl || '🚀'
      if (AVATAR_PRESETS.includes(avatarVal)) {
        setSelectedAvatar(avatarVal)
        setIsCustomAvatar(false)
      } else {
        setSelectedAvatar('custom')
        setIsCustomAvatar(true)
        setCustomAvatarUrl(avatarVal)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar datos del perfil.')
    }
  }

  const loadDashboardAndBadges = async () => {
    try {
      const stats = await userService.getDashboard()
      setDashboardStats(stats)
      const badges = await userService.getBadges()
      setAllBadges(badges)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadProfileData()
    loadDashboardAndBadges()
  }, [])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const finalAvatar = isCustomAvatar ? customAvatarUrl : selectedAvatar
      await userService.updateProfile({
        fullName,
        avatarUrl: finalAvatar
      })
      toast.success('Perfil actualizado correctamente.')
      loadProfileData()
    } catch (err) {
      console.error(err)
      toast.error('No se pudo actualizar el perfil.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!userProfile?.subscription?.id) return
    setIsSubmitting(true)
    try {
      await paymentService.cancelSubscription(userProfile.subscription.id)
      toast.success('Suscripción cancelada con éxito.')
      setShowCancelModal(false)
      loadProfileData()
    } catch (err) {
      console.error(err)
      toast.error('Error al cancelar la suscripción.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('es-AR', options)
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12 select-none">
        
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Mi Perfil</h1>
          <p className="text-sm font-light text-slate-400 mt-1">
            Gestioná tu cuenta, tu suscripción y visualizá tus insignias y logros financieros.
          </p>
        </div>

        {/* Contenido Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Información de Perfil */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-teal to-accent-blue"></div>
              
              <h2 className="text-lg font-bold text-white mb-6">Datos Personales</h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                {/* Visualizador de Avatar */}
                <div className="flex flex-col items-center justify-center space-y-3 pb-2">
                  <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-accent-teal flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                    {isCustomAvatar ? (
                      customAvatarUrl ? (
                        <img 
                          src={customAvatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + fullName
                          }}
                        />
                      ) : (
                        '👤'
                      )
                    ) : (
                      selectedAvatar || '🚀'
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tu Avatar Activo</span>
                </div>

                {/* Selección de Presets */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Elegí un avatar rápido</label>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(preset)
                          setIsCustomAvatar(false)
                        }}
                        className={`h-10 text-xl rounded-xl border flex items-center justify-center transition-all ${
                          !isCustomAvatar && selectedAvatar === preset
                            ? 'border-accent-teal bg-accent-teal/10 scale-105'
                            : 'border-slate-850 bg-slate-950 hover:bg-slate-900'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opción Personalizada */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">O usá una imagen personalizada</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomAvatar(!isCustomAvatar)
                        if (!isCustomAvatar) setSelectedAvatar('custom')
                        else setSelectedAvatar('🚀')
                      }}
                      className="text-[10px] font-bold text-accent-teal hover:underline"
                    >
                      {isCustomAvatar ? 'Volver a Emojis' : 'Usar URL'}
                    </button>
                  </div>
                  {isCustomAvatar && (
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/mi-foto.png"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-accent-teal rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 outline-none"
                    />
                  )}
                </div>

                {/* Email (Solo Lectura) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Correo Electrónico</label>
                  <input
                    type="email"
                    disabled
                    value={userProfile?.email || ''}
                    className="w-full bg-slate-950/50 border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-slate-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-600 block">El email no puede modificarse.</span>
                </div>

                {/* Nombre Completo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-accent-teal rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-accent-teal hover:bg-accent-teal/95 text-invertite-dark text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>

              </form>

              {/* Reset progress option for Admins */}
              {userProfile?.role === 'admin' && (
                <div className="mt-6 pt-6 border-t border-slate-900 space-y-4">
                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Zona de Desarrollo</h3>
                  <p className="text-[10px] text-slate-500 font-light leading-relaxed">
                    Como administrador, podés reiniciar tu propio progreso para probar el curso, quizes y tutor desde cero.
                  </p>
                  <button
                    onClick={async () => {
                      if (window.confirm('¿Estás seguro de que querés reiniciar TU progreso en el curso? Se borrarán todas tus clases completadas, calificaciones de cuestionarios, medallas y conversaciones con el tutor.')) {
                        setIsSubmitting(true)
                        try {
                          await adminService.resetUserProgress(userProfile.id)
                          toast.success('Tu progreso se ha reiniciado correctamente.')
                          // Refresh page data
                          window.location.reload()
                        } catch (err) {
                          console.error(err)
                          toast.error('No se pudo reiniciar tu progreso.')
                        } finally {
                          setIsSubmitting(false)
                        }
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition-all"
                  >
                    Reiniciar Mi Progreso 🔄
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Suscripción, Stats e Insignias */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Widget de Suscripción */}
            <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-blue to-accent-teal"></div>
              
              <h2 className="text-lg font-bold text-white mb-4">Estado de la Suscripción</h2>

              {userProfile?.subscription ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/30 p-4 border border-slate-900 rounded-2xl">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-accent-teal/15 text-accent-teal uppercase tracking-wider">
                          {userProfile.subscription.planName || userProfile.subscription.plan || 'Plan Premium'}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
                          {userProfile.subscription.status === 'active' ? 'ACTIVA' : 'CANCELADA'}
                        </span>
                      </div>
                      <p className="text-[11px] font-light text-slate-400 mt-2">
                        Próxima renovación/vencimiento: <strong className="text-slate-200">{formatDate(userProfile.subscription.expiresAt)}</strong>
                      </p>
                    </div>

                    {userProfile.subscription.status === 'active' && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30 text-red-400 text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
                      >
                        Cancelar Suscripción
                      </button>
                    )}
                  </div>
                  
                  {userProfile.subscription.status === 'cancelled' && (
                    <p className="text-xs text-amber-400/90 font-light bg-amber-500/15 border border-amber-500/20 p-3.5 rounded-xl">
                      ⚠️ Cancelaste la renovación automática de tu suscripción. Seguirás teniendo acceso completo hasta el vencimiento el {formatDate(userProfile.subscription.expiresAt)}.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-6 bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl space-y-4">
                  <div className="text-3xl">🛡️</div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">No tenés una suscripción activa</h3>
                    <p className="text-[11px] font-light text-slate-400 max-w-sm">
                      Para acceder a todo el material educativo, tutorías con RAG en tiempo real, cuestionarios e insignias avanzadas, debés suscribirte a un plan.
                    </p>
                  </div>
                  <Link
                    to="/pagar/mensual"
                    className="py-2.5 px-6 bg-accent-teal hover:bg-accent-teal/95 text-invertite-dark text-xs font-bold rounded-xl transition-all"
                  >
                    Ver Planes Disponibles
                  </Link>
                </div>
              )}
            </div>

            {/* Repasar Tour */}
            <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">¿Querés repasar cómo funciona Invertite?</h3>
                <p className="text-xs text-slate-400 mt-1">Volvé a ver el tour guiado por la plataforma.</p>
              </div>
              <Link
                to="/dashboard?startTour=true"
                className="py-2.5 px-6 bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/30 text-accent-teal text-xs font-bold rounded-xl transition-all whitespace-nowrap ml-4"
              >
                Ver tour guiado de nuevo →
              </Link>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-invertite-card border border-slate-900 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Racha Actual</span>
                <span className="text-2xl font-black text-accent-teal block">
                  {dashboardStats?.streak?.current || 0} 🔥
                </span>
                <span className="text-[10px] font-light text-slate-400 block">Días seguidos activo</span>
              </div>

              <div className="bg-invertite-card border border-slate-900 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Progreso General</span>
                <span className="text-2xl font-black text-accent-blue block">
                  {dashboardStats?.progress?.progressPct || 0}%
                </span>
                <span className="text-[10px] font-light text-slate-400 block">Lecciones completadas</span>
              </div>


              <div className="bg-invertite-card border border-slate-900 rounded-2xl p-4 text-center col-span-2 md:col-span-1 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Logros Obtenidos</span>
                <span className="text-2xl font-black text-accent-gold block">
                  {dashboardStats?.badges?.count || 0} 🏆
                </span>
                <span className="text-[10px] font-light text-slate-400 block">Insignias ganadas</span>
              </div>
            </div>

            {/* Listado de Logros / Insignias */}
            <div className="bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-blue to-accent-teal"></div>
              
              <h2 className="text-lg font-bold text-white mb-2">Mis Logros y Medallas</h2>
              <p className="text-xs font-light text-slate-400 mb-6">
                Completa cuestionarios, módulos y actividades para desbloquear medallas exclusivas de aprendizaje.
              </p>

              {allBadges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allBadges.map(badge => (
                    <div 
                      key={badge.id}
                      className={`flex items-start space-x-3.5 p-3.5 border rounded-2xl transition-all ${
                        badge.earned 
                          ? 'border-slate-850 bg-slate-950/20' 
                          : 'border-slate-900 bg-slate-950/5 opacity-50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${
                        badge.earned 
                          ? 'bg-slate-950 border border-accent-teal/20 text-opacity-100' 
                          : 'bg-slate-950/40 border border-slate-900 text-opacity-30'
                      }`}>
                        {badge.earned ? badge.icon : '🔒'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-bold text-white">{badge.name}</h4>
                          {badge.earned && (
                            <span className="text-[8px] bg-accent-teal/10 text-accent-teal font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Ganada
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-light text-slate-400 leading-normal">{badge.description}</p>
                        {badge.earned && badge.earnedAt && (
                          <span className="text-[8px] font-bold text-slate-500 block pt-1">
                            Desbloqueada el {formatDate(badge.earnedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">Cargando insignias de la plataforma...</p>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Modal de Cancelación de Suscripción */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white">¿Estás seguro de que querés cancelar?</h3>
            <p className="text-xs font-light text-slate-400 leading-relaxed">
              Al confirmar, se cancelará la renovación automática de tu plan. Vas a seguir gozando del acceso completo hasta la fecha de vencimiento actual. No perderás tus medallas ni progreso guardado.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                Volver Atrás
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={isSubmitting}
                className="py-2 px-4 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all"
              >
                {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default Profile
