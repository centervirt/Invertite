import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modals/details state
  const [selectedUserDetail, setSelectedUserDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Edit Subscription state
  const [editingSubUser, setEditingSubUser] = useState(null) // user object
  const [subStatus, setSubStatus] = useState('active') // 'active' | 'expired'
  const [subPlanSlug, setSubPlanSlug] = useState('monthly') // 'monthly' | 'yearly' | 'lifetime'
  const [isSubmittingSub, setIsSubmittingSub] = useState(false)

  const fetchUsers = async () => {
    try {
      const data = await adminService.getUsers()
      setUsers(data)
      setFilteredUsers(data)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la lista de usuarios.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Buscar usuarios
  useEffect(() => {
    const term = search.toLowerCase().trim()
    if (!term) {
      setFilteredUsers(users)
    } else {
      setFilteredUsers(
        users.filter(
          (u) =>
            u.fullName?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term)
        )
      )
    }
  }, [search, users])

  const handleOpenDetail = async (userId) => {
    setIsLoadingDetail(true)
    setIsDetailModalOpen(true)
    try {
      const detail = await adminService.getUserDetail(userId)
      setSelectedUserDetail(detail)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo cargar el detalle del usuario.')
      setIsDetailModalOpen(false)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleOpenEditSub = (user) => {
    setEditingSubUser(user)
    setSubStatus(user.subStatus === 'active' ? 'active' : 'expired')
    setSubPlanSlug(
      user.planName?.toLowerCase().includes('anual')
        ? 'yearly'
        : user.planName?.toLowerCase().includes('vitalicio')
        ? 'lifetime'
        : 'monthly'
    )
  }

  const handleSaveSub = async (e) => {
    e.preventDefault()
    if (!editingSubUser) return
    setIsSubmittingSub(true)
    try {
      await adminService.updateUserSubscription(editingSubUser.id, subStatus, subPlanSlug)
      toast.success('Suscripción del usuario actualizada correctamente.')
      setEditingSubUser(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar suscripción.')
    } finally {
      setIsSubmittingSub(false)
    }
  }

  const handleResetProgress = async (userId, fullName) => {
    if (!window.confirm(`¿Estás seguro de que querés reiniciar el progreso de ${fullName}? Se borrarán todas las clases completadas, calificaciones de cuestionarios, medallas y conversaciones con el tutor.`)) {
      return
    }
    try {
      await adminService.resetUserProgress(userId)
      toast.success(`Progreso de ${fullName} reiniciado con éxito.`)
      fetchUsers()
    } catch (err) {
      console.error(err)
      toast.error('No se pudo reiniciar el progreso del alumno.')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6 select-none">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Gestión de Alumnos</h1>
            <p className="text-xs text-slate-400 font-light mt-1">
              Monitoreá el progreso de los estudiantes y modificá manualmente sus suscripciones.
            </p>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-slate-950 border border-slate-900 focus:border-accent-blue rounded-xl px-4 py-2 text-xs text-white placeholder-slate-700 outline-none transition-all"
          />
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : (
          <div className="bg-invertite-card border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Registro</th>
                    <th className="p-4">Suscripción</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4 text-center">Clases</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-light text-slate-300">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                      const isActiveSub = u.subStatus === 'active'
                      return (
                        <tr key={u.id} className="hover:bg-slate-950/20 transition-all">
                          <td className="p-4 font-bold text-white">{u.fullName}</td>
                          <td className="p-4 font-mono">{u.email}</td>
                          <td className="p-4">{formatDate(u.createdAt)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              isActiveSub 
                                ? 'bg-green-500/15 text-green-400 border border-green-500/10' 
                                : 'bg-slate-800 text-slate-500 border border-slate-750'
                            }`}>
                              {isActiveSub ? 'ACTIVA' : 'INACTIVA'}
                            </span>
                          </td>
                          <td className="p-4">{u.planName || '-'}</td>
                          <td className="p-4 text-center font-bold text-slate-200">{u.lessonsCompleted}</td>
                          <td className="p-4 text-center space-x-2">
                            <button
                              onClick={() => handleOpenDetail(u.id)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
                            >
                              Detalle 🔍
                            </button>
                            <button
                              onClick={() => handleOpenEditSub(u)}
                              className="px-2.5 py-1.5 bg-accent-blue/10 hover:bg-accent-blue/15 border border-accent-blue/20 hover:border-accent-blue/30 rounded-lg text-accent-blue font-bold transition-all"
                            >
                              Suscripción 💳
                            </button>
                            <button
                              onClick={() => handleResetProgress(u.id, u.fullName)}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-lg text-rose-400 font-bold transition-all"
                            >
                              Reiniciar 🔄
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-650">No se encontraron usuarios matching.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Detalle */}
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-2xl relative space-y-6 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-start">
                <h3 className="text-base font-bold text-white">Detalle de Actividad del Alumno</h3>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    setSelectedUserDetail(null)
                  }}
                  className="text-slate-500 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {isLoadingDetail ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-blue"></div>
                </div>
              ) : selectedUserDetail ? (
                <div className="space-y-6 overflow-y-auto flex-1 pr-1 text-xs font-light">
                  {/* Info Perfil */}
                  <div className="flex justify-between items-center bg-slate-950/20 border border-slate-900 p-4 rounded-2xl">
                    <div className="flex items-center space-x-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-accent-blue to-accent-teal flex items-center justify-center text-xl font-bold text-invertite-dark">
                        {selectedUserDetail.user.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedUserDetail.user.fullName}</h4>
                        <p className="text-slate-500 font-mono mt-0.5">{selectedUserDetail.user.email}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Registrado el: {formatDate(selectedUserDetail.user.createdAt)}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm(`¿Estás seguro de que querés reiniciar el progreso de ${selectedUserDetail.user.fullName}? Se borrarán todas las clases completadas, calificaciones de cuestionarios, medallas y conversaciones con el tutor.`)) {
                          try {
                            await adminService.resetUserProgress(selectedUserDetail.user.id)
                            toast.success(`Progreso de ${selectedUserDetail.user.fullName} reiniciado con éxito.`)
                            setIsDetailModalOpen(false)
                            setSelectedUserDetail(null)
                            fetchUsers()
                          } catch (err) {
                            console.error(err)
                            toast.error('No se pudo reiniciar el progreso del alumno.')
                          }
                        }
                      }}
                      className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-rose-400 font-bold transition-all text-[10px] uppercase tracking-wider"
                    >
                      Reiniciar Progreso 🔄
                    </button>
                  </div>

                  {/* Medallas */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Medallas Obtenidas</h5>
                    {selectedUserDetail.badges.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedUserDetail.badges.map((b, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center space-x-2">
                            <span className="text-lg">{b.icon}</span>
                            <div className="text-left leading-none">
                              <span className="font-bold block text-slate-200">{b.name}</span>
                              <span className="text-[7px] text-slate-500 mt-1 block">{formatDate(b.earnedAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-650 italic text-[10px]">Aún no ha obtenido ninguna medalla.</p>
                    )}
                  </div>

                  {/* Historial de Lecciones */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Historial de Lecciones</h5>
                    {selectedUserDetail.progress.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUserDetail.progress.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-950/30 border border-slate-900 p-3 rounded-xl font-light text-slate-400">
                            <div>
                              <span className="text-[8px] font-bold text-slate-600 uppercase block">{p.moduleTitle}</span>
                              <span className="font-bold text-slate-200">{p.title}</span>
                              <span className="text-[8px] text-slate-500 block mt-0.5">
                                Tiempo estudiado: {Math.round(p.timeSpentSeconds / 60)} min
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              p.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                            }`}>
                              {p.status === 'completed' ? 'Completado' : 'En Curso'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-650 italic text-[10px]">No registra avance en lecciones.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Modal de Editar Suscripción */}
        {editingSubUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <form onSubmit={handleSaveSub} className="w-full max-w-sm bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-2xl relative space-y-4">
              <h3 className="text-base font-bold text-white">Editar Suscripción</h3>
              <p className="text-xs font-light text-slate-400">
                Estás editando el estado de suscripción para: <strong>{editingSubUser.fullName}</strong>
              </p>

              {/* Selector de Estado */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block">Estado</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="active">Activo (Habilitar Acceso)</option>
                  <option value="expired">Expirado / Inactivo (Cortar Acceso)</option>
                </select>
              </div>

              {/* Selector de Plan (Si está activo) */}
              {subStatus === 'active' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block">Plan</label>
                  <select
                    value={subPlanSlug}
                    onChange={(e) => setSubPlanSlug(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                    <option value="lifetime">Vitalicio</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubUser(null)}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSub}
                  className="py-2.5 px-5 bg-accent-blue hover:bg-accent-blue/95 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
                >
                  {isSubmittingSub ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}

export default AdminUsers
