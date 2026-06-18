import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'

const DEFAULT_LESSON_CONTENT = [
  { type: 'intro', text: 'Bienvenido a la lección...' },
  { type: 'heading', text: 'Concepto clave' },
  { type: 'paragraph', text: 'Desarrollo del contenido...' },
  { type: 'highlight', text: 'Recuerda que...' },
  { type: 'example', title: 'Ejemplo Práctico', text: 'Detalle del caso...' },
  { type: 'tutor_cta', prompt: '¿Qué dudas tienes sobre esto?' },
  { type: 'summary', items: ['Punto 1', 'Punto 2'] }
]

const AdminContent = () => {
  const [modules, setModules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedModuleId, setExpandedModuleId] = useState(null)

  // Module Modal State
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false)
  const [editingModule, setEditingModule] = useState(null) // null for create
  const [modOrderIndex, setModOrderIndex] = useState(1)
  const [modTitle, setModTitle] = useState('')
  const [modSlug, setModSlug] = useState('')
  const [modDesc, setModDesc] = useState('')
  const [modColor, setModColor] = useState('teal')
  const [modHours, setModHours] = useState(3.0)
  const [modPublished, setModPublished] = useState(false)
  const [isSavingModule, setIsSavingModule] = useState(false)

  // Lesson Modal State
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null) // null for create
  const [lessonModuleId, setLessonModuleId] = useState('')
  const [lesOrderIndex, setLesOrderIndex] = useState(1)
  const [lesTitle, setLesTitle] = useState('')
  const [lesSlug, setLesSlug] = useState('')
  const [lesMinutes, setLesMinutes] = useState(20)
  const [lesContentJsonRaw, setLesContentJsonRaw] = useState('[]')
  const [lesPublished, setLesPublished] = useState(false)
  const [isSavingLesson, setIsSavingLesson] = useState(false)

  const fetchContent = async () => {
    try {
      const data = await adminService.getModules()
      setModules(data)
      if (data.length > 0 && !expandedModuleId) {
        setExpandedModuleId(data[0].id)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar módulos y lecciones.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [])

  // Modulos actions
  const handleOpenModuleModal = (moduleObj = null) => {
    setEditingModule(moduleObj)
    if (moduleObj) {
      setModOrderIndex(moduleObj.orderIndex)
      setModTitle(moduleObj.title)
      setModSlug(moduleObj.slug)
      setModDesc(moduleObj.description || '')
      setModColor(moduleObj.colorAccent || 'teal')
      setModHours(moduleObj.estimatedHours || 0)
      setModPublished(!!moduleObj.isPublished)
    } else {
      setModOrderIndex(modules.length + 1)
      setModTitle('')
      setModSlug('')
      setModDesc('')
      setModColor('teal')
      setModHours(3.0)
      setModPublished(false)
    }
    setIsModuleModalOpen(true)
  }

  const handleSaveModule = async (e) => {
    e.preventDefault()
    setIsSavingModule(true)
    const payload = {
      orderIndex: parseInt(modOrderIndex),
      title: modTitle,
      slug: modSlug,
      description: modDesc,
      colorAccent: modColor,
      estimatedHours: parseFloat(modHours),
      isPublished: modPublished
    }
    try {
      if (editingModule) {
        await adminService.updateModule(editingModule.id, payload)
        toast.success('Módulo actualizado con éxito.')
      } else {
        await adminService.createModule(payload)
        toast.success('Módulo creado con éxito.')
      }
      setIsModuleModalOpen(false)
      fetchContent()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar módulo.')
    } finally {
      setIsSavingModule(false)
    }
  }

  // Lecciones actions
  const handleOpenLessonModal = (moduleId, lessonObj = null) => {
    setLessonModuleId(moduleId)
    setEditingLesson(lessonObj)
    if (lessonObj) {
      setLesOrderIndex(lessonObj.orderIndex)
      setLesTitle(lessonObj.title)
      setLesSlug(lessonObj.slug)
      setLesMinutes(lessonObj.estimatedMinutes || 20)
      setLesPublished(!!lessonObj.isPublished)
      
      // Intentar formatear JSON del content
      try {
        const formatted = JSON.stringify(lessonObj.contentJson || [], null, 2)
        setLesContentJsonRaw(formatted)
      } catch (e) {
        setLesContentJsonRaw('[]')
      }
    } else {
      const moduleItem = modules.find(m => m.id === moduleId)
      setLesOrderIndex((moduleItem?.lessons?.length || 0) + 1)
      setLesTitle('')
      setLesSlug('')
      setLesMinutes(20)
      setLesPublished(false)
      setLesContentJsonRaw(JSON.stringify(DEFAULT_LESSON_CONTENT, null, 2))
    }
    setIsLessonModalOpen(true)
  }

  const handleSaveLesson = async (e) => {
    e.preventDefault()
    
    let parsedContent = []
    try {
      parsedContent = JSON.parse(lesContentJsonRaw)
      if (!Array.isArray(parsedContent)) {
        toast.error('El contenido JSON debe ser una lista de bloques (Array).')
        return
      }
    } catch (err) {
      toast.error('El formato del contenido JSON no es válido.')
      return
    }

    setIsSavingLesson(true)
    const payload = {
      moduleId: lessonModuleId,
      orderIndex: parseInt(lesOrderIndex),
      title: lesTitle,
      slug: lesSlug,
      contentJson: parsedContent,
      estimatedMinutes: parseInt(lesMinutes),
      isPublished: lesPublished
    }

    try {
      if (editingLesson) {
        await adminService.updateLesson(editingLesson.id, payload)
        toast.success('Lección actualizada con éxito.')
      } else {
        await adminService.createLesson(payload)
        toast.success('Lección creada con éxito.')
      }
      setIsLessonModalOpen(false)
      fetchContent()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar la lección.')
    } finally {
      setIsSavingLesson(false)
    }
  }

  const handleTogglePublishLesson = async (lessonId, currentStatus) => {
    try {
      await adminService.togglePublishLesson(lessonId, !currentStatus)
      toast.success(`Lección ${!currentStatus ? 'publicada' : 'despublicada'} correctamente.`)
      fetchContent()
    } catch (err) {
      console.error(err)
      toast.error('Error al modificar estado de publicación.')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 select-none">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Estructura de Contenido</h1>
            <p className="text-xs text-slate-400 font-light mt-1">
              Crea o edita los módulos, lecciones y sus respectivos bloques de contenido interactivo.
            </p>
          </div>
          <button
            onClick={() => handleOpenModuleModal(null)}
            className="w-full sm:w-auto px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/95 text-white text-xs font-bold rounded-xl transition-all"
          >
            Nuevo Módulo ➕
          </button>
        </div>

        {/* Listado de Módulos */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod) => {
              const isExpanded = expandedModuleId === mod.id
              return (
                <div key={mod.id} className="bg-invertite-card border border-slate-900 rounded-3xl overflow-hidden shadow-lg">
                  
                  {/* Fila del Módulo */}
                  <div 
                    onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-950/20 cursor-pointer transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Módulo {mod.orderIndex}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          mod.isPublished 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/10' 
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {mod.isPublished ? 'PUBLICADO' : 'BORRADOR'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{mod.title}</h3>
                      <p className="text-[10px] text-slate-450 font-light leading-relaxed max-w-xl">{mod.description}</p>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenModuleModal(mod)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-350 rounded-lg hover:text-white transition-all"
                      >
                        Editar Módulo ⚙️
                      </button>
                      <button
                        onClick={() => handleOpenLessonModal(mod.id, null)}
                        className="px-3 py-1.5 bg-accent-blue/15 hover:bg-accent-blue/20 border border-accent-blue/20 text-[10px] font-black text-accent-blue rounded-lg transition-all"
                      >
                        Nueva Lección ➕
                      </button>
                      <span className="text-slate-650 px-2 hidden sm:inline">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Fila de Lecciones (Desplegable) */}
                  {isExpanded && (
                    <div className="bg-slate-950/30 border-t border-slate-900 divide-y divide-slate-900/60 p-4">
                      {mod.lessons && mod.lessons.length > 0 ? (
                        mod.lessons.map((les) => (
                          <div key={les.id} className="py-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-light text-xs text-slate-450">
                            <div>
                              <span className="text-[8px] font-bold text-slate-500 uppercase block">Clase {les.orderIndex}</span>
                              <h4 className="font-bold text-slate-200">{les.title}</h4>
                              <span className="text-[9px] text-slate-500 font-mono">slug: {les.slug} | {les.estimatedMinutes} min</span>
                            </div>

                            <div className="flex items-center space-x-2 self-end sm:self-auto">
                              <button
                                onClick={() => handleTogglePublishLesson(les.id, les.isPublished)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                  les.isPublished 
                                    ? 'border-green-500/20 bg-green-500/5 text-green-400 hover:bg-green-500/10' 
                                    : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-white'
                                }`}
                              >
                                {les.isPublished ? 'Publicada ✅' : 'Borrador ⏳'}
                              </button>
                              
                              <button
                                onClick={async () => {
                                  try {
                                    // Cargar la lección completa (con content_json) para editar
                                    const lessonDetail = await adminService.getModules().then(list => {
                                      // Buscar lección en la lista cargada
                                      const foundMod = list.find(m => m.id === mod.id)
                                      return foundMod?.lessons?.find(l => l.id === les.id)
                                    })
                                    
                                    // Obtenemos los detalles llamando a un fetch directo si hiciera falta.
                                    // Dado que getModules() devuelve toda la lista con contentJson ya disponible, 
                                    // lo extraemos del modulo correspondiente:
                                    const rawLes = mod.lessons.find(l => l.id === les.id)
                                    // Nota: para estar seguros de tener content_json, en adminCtrl.listModules 
                                    // ¿pusimos content_json en la query?
                                    // Volvamos a validar adminController.js: listModules.
                                    // Ah, en listModules, pusimos: SELECT id, order_index, title, slug, estimated_minutes, is_published FROM lessons.
                                    // No seleccionamos content_json en la lista global para optimizar tamaño.
                                    // Pero no te preocupes, podemos crear un endpoint o podemos buscar los detalles 
                                    // haciendo una consulta al endpoint público de lecciones que sí trae content_json completo!
                                    // Sí, `moduleService.getLesson(moduleSlug, lessonSlug)` devuelve la lección con content_json!
                                    // ¡Eso es brillante y reutiliza código perfectamente!
                                    const moduleService = (await import('../services/moduleService')).default
                                    const fullLes = await moduleService.getLesson(mod.slug, les.slug)
                                    
                                    handleOpenLessonModal(mod.id, {
                                      id: les.id,
                                      orderIndex: les.orderIndex,
                                      title: les.title,
                                      slug: les.slug,
                                      estimatedMinutes: les.estimatedMinutes,
                                      isPublished: les.isPublished,
                                      contentJson: fullLes.lesson.contentJson
                                    })
                                  } catch (e) {
                                    console.error(e)
                                    toast.error('Error al cargar detalles de la lección.')
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold rounded-lg hover:text-white transition-all"
                              >
                                Editar ✏️
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-650 text-center py-4">Este módulo no posee lecciones creadas.</p>
                      )}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}

        {/* Modal de Módulo (Crear/Editar) */}
        {isModuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <form onSubmit={handleSaveModule} className="w-full max-w-md bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">{editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase block">Orden</label>
                  <input
                    type="number"
                    required
                    value={modOrderIndex}
                    onChange={(e) => setModOrderIndex(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-slate-450 uppercase block">Acento de Color</label>
                  <select
                    value={modColor}
                    onChange={(e) => setModColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="teal">Teal (Predeterminado)</option>
                    <option value="blue">Blue</option>
                    <option value="emerald">Emerald</option>
                    <option value="cyan">Cyan</option>
                    <option value="violet">Violet</option>
                    <option value="rose">Rose</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 uppercase block">Título</label>
                <input
                  type="text"
                  required
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 uppercase block">Slug</label>
                <input
                  type="text"
                  required
                  value={modSlug}
                  onChange={(e) => setModSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 uppercase block">Descripción corta</label>
                <textarea
                  value={modDesc}
                  rows="2"
                  onChange={(e) => setModDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase block">Horas Estimadas</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={modHours}
                    onChange={(e) => setModHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-5">
                  <input
                    type="checkbox"
                    id="modPublished"
                    checked={modPublished}
                    onChange={(e) => setModPublished(e.target.checked)}
                    className="rounded text-accent-blue focus:ring-accent-blue bg-slate-950 border-slate-850"
                  />
                  <label htmlFor="modPublished" className="text-xs text-slate-350">Publicado</label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModuleModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingModule}
                  className="py-2.5 px-5 bg-accent-blue hover:bg-accent-blue/95 text-white text-xs font-bold rounded-xl transition-all"
                >
                  {isSavingModule ? 'Guardando...' : 'Guardar Módulo'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Lección (Crear/Editar) */}
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <form onSubmit={handleSaveLesson} className="w-full max-w-2xl bg-invertite-card border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[90vh]">
              <h3 className="text-base font-bold text-white">{editingLesson ? 'Editar Lección' : 'Nueva Lección'}</h3>
              
              <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450 uppercase block">Orden</label>
                    <input
                      type="number"
                      required
                      value={lesOrderIndex}
                      onChange={(e) => setLesOrderIndex(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450 uppercase block">Duración (min)</label>
                    <input
                      type="number"
                      required
                      value={lesMinutes}
                      onChange={(e) => setLesMinutes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      type="checkbox"
                      id="lesPublished"
                      checked={lesPublished}
                      onChange={(e) => setLesPublished(e.target.checked)}
                      className="rounded text-accent-blue focus:ring-accent-blue bg-slate-950 border-slate-850"
                    />
                    <label htmlFor="lesPublished" className="text-xs text-slate-350">Publicada</label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase block">Título</label>
                  <input
                    type="text"
                    required
                    value={lesTitle}
                    onChange={(e) => setLesTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase block">Slug</label>
                  <input
                    type="text"
                    required
                    value={lesSlug}
                    onChange={(e) => setLesSlug(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Editor JSON */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-bold text-slate-450 uppercase block">Contenido Educativo (JSON Blocks)</label>
                    <span className="text-[8px] text-slate-500 font-mono">Format: Array of {`{type, text/title/items/prompt}`}</span>
                  </div>
                  <textarea
                    required
                    rows="10"
                    value={lesContentJsonRaw}
                    onChange={(e) => setLesContentJsonRaw(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-300 font-mono outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingLesson}
                  className="py-2.5 px-5 bg-accent-blue hover:bg-accent-blue/95 text-white text-xs font-bold rounded-xl transition-all"
                >
                  {isSavingLesson ? 'Guardando...' : 'Guardar Lección'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}

export default AdminContent
