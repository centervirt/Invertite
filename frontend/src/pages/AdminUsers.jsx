import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Detail Modal States
  const [selectedUserDetail, setSelectedUserDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('progreso') // 'progreso' | 'suscripcion' | 'actividad'

  // Edit Subscription state
  const [editingSubUser, setEditingSubUser] = useState(null)
  const [subStatus, setSubStatus] = useState('active')
  const [subPlanSlug, setSubPlanSlug] = useState('monthly')
  const [isSubmittingSub, setIsSubmittingSub] = useState(false)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      // Usamos el servicio pasándole queries de paginación y filtros
      const res = await adminService.getUsersWithParams({
        page,
        limit: 10,
        search,
        planSlug: planFilter,
        isActive: statusFilter,
      })
      setUsers(res.data)
      setPagination(res.pagination)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la lista de usuarios.')
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar usuarios cuando cambian página, filtros o búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers()
    }, 300) // Debounce para búsqueda rápida
    return () => clearTimeout(handler)
  }, [page, search, planFilter, statusFilter])

  const handleOpenDetail = async (userId) => {
    setIsLoadingDetail(true)
    setIsDetailModalOpen(true)
    setActiveTab('progreso')
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

  const handleToggleUserStatus = async (userId, fullName, currentActive) => {
    const actionText = currentActive ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Estás seguro de que querés ${actionText} la cuenta de ${fullName}?`)) {
      return
    }
    try {
      await adminService.updateUserStatus(userId, !currentActive)
      toast.success(`Usuario ${fullName} ${currentActive ? 'desactivado' : 'activado'} con éxito.`)
      fetchUsers()
      if (selectedUserDetail && selectedUserDetail.user.id === userId) {
        // refrescar detalle
        const detail = await adminService.getUserDetail(userId)
        setSelectedUserDetail(detail)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar estado del usuario.')
    }
  }

  const handleSoftDelete = async (userId, fullName) => {
    if (!window.confirm(`¿Estás seguro de que querés aplicar soft delete al usuario ${fullName}? Esto suspenderá su cuenta de forma lógica.`)) {
      return
    }
    try {
      await adminService.deleteUser(userId)
      toast.success(`Usuario ${fullName} eliminado lógicamente.`)
      fetchUsers()
      if (isDetailModalOpen) {
        setIsDetailModalOpen(false)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar lógicamente al usuario.')
    }
  }

  const exportCSV = () => {
    if (users.length === 0) {
      toast.error('No hay usuarios para exportar.')
      return
    }
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Nombre,Email,Registro,Estado,Plan,Lecciones Completadas\n'

    users.forEach((u) => {
      const row = [
        `"${u.fullName}"`,
        `"${u.email}"`,
        `"${formatDate(u.createdAt)}"`,
        `"${u.isActive ? 'Activo' : 'Inactivo'}"`,
        `"${u.planName || 'Ninguno'}"`,
        u.lessonsCompleted,
      ].join(',')
      csvContent += row + '\n'
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `alumnos_invertite_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV exportado correctamente.')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6 select-none">
        
        {/* Encabezado */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Gestión de Alumnos</h1>
            <p className="text-xs text-slate-400 font-light mt-1">
              Monitoreá el progreso, administrá accesos, cambiá planes y auditá las acciones del sistema.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/30 hover:border-accent-teal/40 rounded-xl text-accent-teal font-bold text-xs transition-all"
            >
              Exportar CSV 📄
            </button>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 border border-slate-900 p-4 rounded-2xl">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-slate-950 border border-slate-900 focus:border-accent-blue rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-700 outline-none transition-all"
          />

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value)
              setPage(1)
            }}
            className="w-full bg-slate-950 border border-slate-900 focus:border-accent-blue rounded-xl px-4 py-2.5 text-xs text-slate-300 outline-none transition-all"
          >
            <option value="">Todos los Planes</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
            <option value="lifetime">Vitalicio</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="w-full bg-slate-950 border border-slate-900 focus:border-accent-blue rounded-xl px-4 py-2.5 text-xs text-slate-300 outline-none transition-all"
          >
            <option value="">Todos los Estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : (
          <div className="bg-invertite-card border border-slate-900 rounded-3xl overflow-hidden shadow-2xl space-y-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Registro</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Suscripción</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4 text-center">Clases</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-light text-slate-300">
                  {users.length > 0 ? (
                    users.map((u) => {
                      const isActiveSub = u.subStatus === 'active'
                      return (
                        <tr key={u.id} className={`hover:bg-slate-950/20 transition-all ${!u.isActive ? 'opacity-50' : ''}`}>
                          <td className="p-4 font-bold text-white flex items-center space-x-2">
                            <span>{u.fullName}</span>
                            {u.role === 'admin' && (
                              <span className="text-[8px] bg-accent-blue/20 text-accent-blue font-black px-1.5 py-0.5 rounded uppercase">Admin</span>
                            )}
                          </td>
                          <td className="p-4 font-mono">{u.email}</td>
                          <td className="p-4">{formatDate(u.createdAt)}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.fullName, u.isActive)}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                                u.isActive
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/25'
                                  : 'bg-rose-500/15 text-rose-450 border-rose-500/10 hover:bg-rose-500/25'
                              }`}
                            >
                              {u.isActive ? 'ACTIVO' : 'INACTIVO'}
                            </button>
                          </td>
                          <td className="p-4 text-center">
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
                          <td className="p-4 text-center space-x-1.5 space-y-1">
                            <button
                              onClick={() => handleOpenDetail(u.id)}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
                            >
                              Detalle 🔍
                            </button>
                            <button
                              onClick={() => handleOpenEditSub(u)}
                              className="px-2 py-1 bg-accent-blue/10 hover:bg-accent-blue/15 border border-accent-blue/20 hover:border-accent-blue/30 rounded-lg text-accent-blue font-bold transition-all"
                            >
                              Plan 💳
                            </button>
                            <button
                              onClick={() => handleResetProgress(u.id, u.fullName)}
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 rounded-lg text-amber-400 font-bold transition-all"
                            >
                              Reiniciar 🔄
                            </button>
                            <button
                              onClick={() => handleSoftDelete(u.id, u.fullName)}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-lg text-rose-450 font-bold transition-all"
                            >
                              Eliminar 🗑️
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-650">No se encontraron usuarios matching.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center px-6 pt-4 border-t border-slate-900 select-none">
                <span className="text-slate-500 text-[10px]">
                  Mostrando {users.length} de {pagination.total} usuarios
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    Anterior
                  </button>
                  <span className="text-slate-300 font-bold px-2 text-xs">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
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
                <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs font-light">
                  {/* Info Perfil */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/20 border border-slate-900 p-4 rounded-2xl">
                    <div className="flex items-center space-x-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-accent-blue to-accent-teal flex items-center justify-center text-xl font-bold text-invertite-dark">
                        {selectedUserDetail.user.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                          <span>{selectedUserDetail.user.fullName}</span>
                          <span className={`text-[8.5px] px-2 py-0.5 rounded font-black uppercase ${
                            selectedUserDetail.user.isActive 
                              ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/15'
                              : 'bg-rose-500/10 text-rose-450 border border-rose-500/15'
                          }`}>
                            {selectedUserDetail.user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </h4>
                        <p className="text-slate-500 font-mono mt-0.5">{selectedUserDetail.user.email}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Registrado el: {formatDate(selectedUserDetail.user.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleToggleUserStatus(selectedUserDetail.user.id, selectedUserDetail.user.fullName, selectedUserDetail.user.isActive)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl font-bold border transition-all text-[10px] uppercase tracking-wider ${
                          selectedUserDetail.user.isActive
                            ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {selectedUserDetail.user.isActive ? 'Desactivar 🔒' : 'Activar🔓'}
                      </button>
                      <button
                        onClick={() => handleSoftDelete(selectedUserDetail.user.id, selectedUserDetail.user.fullName)}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-rose-400 font-bold transition-all text-[10px] uppercase tracking-wider"
                      >
                        Eliminar 🗑️
                      </button>
                    </div>
                  </div>

                  {/* Tabs de Detalle */}
                  <div className="flex border-b border-slate-900">
                    <button
                      onClick={() => setActiveTab('progreso')}
                      className={`flex-1 py-2.5 font-bold uppercase tracking-wider text-[10px] text-center border-b-2 transition-all ${
                        activeTab === 'progreso'
                          ? 'border-accent-blue text-accent-blue bg-accent-blue/5'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Progreso del Curso
                    </button>
                    <button
                      onClick={() => setActiveTab('suscripcion')}
                      className={`flex-1 py-2.5 font-bold uppercase tracking-wider text-[10px] text-center border-b-2 transition-all ${
                        activeTab === 'suscripcion'
                          ? 'border-accent-blue text-accent-blue bg-accent-blue/5'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Suscripción
                    </button>
                    <button
                      onClick={() => setActiveTab('actividad')}
                      className={`flex-1 py-2.5 font-bold uppercase tracking-wider text-[10px] text-center border-b-2 transition-all ${
                        activeTab === 'actividad'
                          ? 'border-accent-blue text-accent-blue bg-accent-blue/5'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Historial de Auditoría
                    </button>
                  </div>

                  {/* Contenido de Tabs */}
                  <div className="pt-2 min-h-[250px]">
                    {activeTab === 'progreso' && (
                      <div className="space-y-4">
                        {/* Medallas */}
                        <div className="space-y-2">
                          <h5 className="font-bold text-white uppercase tracking-wider text-[9px]">Medallas Obtenidas</h5>
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

                        {/* Lecciones */}
                        <div className="space-y-2">
                          <h5 className="font-bold text-white uppercase tracking-wider text-[9px]">Historial de Lecciones</h5>
                          {selectedUserDetail.progress.length > 0 ? (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
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
                                      ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/10'
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
                    )}

                    {activeTab === 'suscripcion' && (
                      <div className="bg-slate-950/30 border border-slate-900 p-5 rounded-2xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Estado de Suscripción</span>
                            <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold ${
                              selectedUserDetail.user.subStatus === 'active'
                                ? 'bg-green-500/15 text-green-400 border border-green-500/10'
                                : 'bg-slate-800 text-slate-500 border border-slate-750'
                            }`}>
                              {selectedUserDetail.user.subStatus === 'active' ? 'SUSCRIPCIÓN ACTIVA' : 'SIN SUSCRIPCIÓN'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Plan Actual</span>
                            <span className="text-white font-bold block mt-2.5 text-xs">{selectedUserDetail.user.planName || 'Ninguno'}</span>
                          </div>
                        </div>

                        {selectedUserDetail.user.subStatus === 'active' && (
                          <div className="pt-2 border-t border-slate-900">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Vencimiento del período</span>
                            <span className="text-white block mt-1.5 font-bold">{formatDate(selectedUserDetail.user.subExpiresAt)}</span>
                          </div>
                        )}

                        <div className="pt-4 flex justify-end">
                          <button
                            onClick={() => {
                              handleOpenEditSub(selectedUserDetail.user)
                            }}
                            className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded-xl transition-all"
                          >
                            Modificar Suscripción / Plan 💳
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'actividad' && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-white uppercase tracking-wider text-[9px]">Acciones Administrativas Auditadas</h5>
                        {selectedUserDetail.actionsLog && selectedUserDetail.actionsLog.length > 0 ? (
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {selectedUserDetail.actionsLog.map((log) => (
                              <div key={log.id} className="bg-slate-950/30 border border-slate-900 p-3 rounded-xl flex flex-col space-y-1.5 text-slate-400 font-light">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-bold text-slate-200 uppercase tracking-wider">
                                    ⚙️ {log.action}
                                  </span>
                                  <span className="text-slate-500 font-mono">
                                    {new Date(log.createdAt).toLocaleString('es-AR')}
                                  </span>
                                </div>
                                <div className="text-[9.5px]">
                                  Realizado por: <strong>{log.adminName || 'Sistema'}</strong> ({log.adminEmail || 'Automático'})
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <pre className="bg-slate-950 border border-slate-900 text-[8px] p-2 rounded font-mono text-accent-teal overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-650 italic text-[10px]">No hay acciones registradas en el historial para este usuario.</p>
                        )}
                      </div>
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
