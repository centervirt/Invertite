import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import tutorService from '../services/tutorService'
import toast from 'react-hot-toast'

// Efecto máquina de escribir (Typewriter) por palabras
const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('')
  
  useEffect(() => {
    const words = text.split(' ')
    let idx = 0
    setDisplayedText('')
    
    const interval = setInterval(() => {
      if (idx < words.length) {
        setDisplayedText(prev => prev + (prev ? ' ' : '') + words[idx])
        idx++
      } else {
        clearInterval(interval)
      }
    }, 35) // Ajustado para un efecto fluido y ágil
    
    return () => clearInterval(interval)
  }, [text])

  return <span>{displayedText}</span>
}

const TutorChat = () => {
  const location = useLocation()
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [activeSources, setActiveSources] = useState([])
  
  const messagesEndRef = useRef(null)

  // Auto-scroll al fondo
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Cargar listado de chats al montar
  const loadConversations = async () => {
    try {
      const data = await tutorService.getConversations()
      setConversations(data)
      return data
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const init = async () => {
      const list = await loadConversations()
      
      // Si el usuario viene de un botón del Tutor en una lección, inicia con ese prompt
      if (location.state?.initialMessage) {
        setInput(location.state.initialMessage)
        const lessonId = location.state.lessonId || null
        
        // Ver si ya existe conversación para esta lección
        const matchingConv = list.find(c => c.lessonId === lessonId)
        if (matchingConv) {
          await handleSelectConversation(matchingConv.id)
        } else {
          // Crear un chat en blanco y cargar el input
          setActiveConvId(null)
          setMessages([])
        }
      } else if (list.length > 0) {
        // Cargar por defecto la última conversación activa
        await handleSelectConversation(list[0].id)
      }
    }
    init()
  }, [location.state])

  // Seleccionar conversación
  const handleSelectConversation = async (id) => {
    setIsTyping(true)
    try {
      const data = await tutorService.getConversation(id)
      setActiveConvId(data.id)
      setMessages(data.messages)
      setActiveSources([])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la conversación.')
    } finally {
      setIsTyping(false)
    }
  }

  // Iniciar nueva conversación en limpio (+)
  const handleNewConversation = () => {
    setActiveConvId(null)
    setMessages([])
    setActiveSources([])
    setInput('')
  }

  // Eliminar conversación activa
  const handleDeleteConversation = async () => {
    if (!window.confirm('¿Estás seguro de que querés borrar el historial de esta conversación?')) {
      return
    }
    
    try {
      const targetId = activeConvId || 'general'
      await tutorService.deleteConversation(targetId)
      toast.success('Conversación eliminada.')
      
      setMessages([])
      setActiveSources([])
      setInput('')
      
      if (activeConvId && activeConvId !== 'general') {
        setActiveConvId(null)
      }
      
      await loadConversations()
    } catch (err) {
      console.error(err)
      toast.error('Error al borrar la conversación.')
    }
  }

  // Enviar mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMsg = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    const prompt = input
    setInput('')
    setIsTyping(true)
    setActiveSources([])

    try {
      const lessonId = location.state?.lessonId || null
      const res = await tutorService.sendMessage(prompt, activeConvId, lessonId)
      
      const assistantMsg = {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        isNew: true // Indicador para aplicar typewriter
      }

      setMessages(prev => [...prev, assistantMsg])
      setActiveConvId(res.conversationId)
      setActiveSources(res.sources || [])
      
      // Recargar la lista lateral
      await loadConversations()
    } catch (err) {
      console.error(err)
      toast.error('Error al obtener respuesta del Tutor.')
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto flex bg-invertite-card border border-slate-900 rounded-3xl overflow-hidden h-[calc(100vh-140px)] select-none">
        
        {/* ── SIDEBAR DE CHATS ── */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-950/80 border-r border-slate-900 p-4 justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tus Consultas</h3>
              <button 
                onClick={handleNewConversation}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-accent-teal transition-all text-xs font-bold border border-slate-800"
                title="Nueva Consulta"
              >
                ➕
              </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
              <button
                onClick={() => handleSelectConversation('general')}
                className={`w-full text-left p-3 rounded-xl transition-all border text-xs ${
                  activeConvId === null || activeConvId === 'general'
                    ? 'bg-slate-900/80 border-accent-teal/30 text-white font-medium shadow-sm'
                    : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">💬 Consulta General</span>
                </div>
              </button>

              {conversations.filter(c => c.lessonId !== null).map((conv) => {
                const isSelected = activeConvId === conv.id
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border text-xs ${
                      isSelected
                        ? 'bg-slate-900/80 border-accent-teal/30 text-white font-medium shadow-sm'
                        : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col space-y-1">
                      <span className="font-bold truncate text-[10px] text-accent-teal/80">Clase Relacionada</span>
                      <span className="truncate text-slate-300">{conv.lastMessagePreview || 'Mensaje nuevo'}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="text-[9px] text-slate-600 font-light border-t border-slate-900 pt-3">
            El historial se almacena de forma privada en tu cuenta.
          </div>
        </aside>

        {/* ── VENTANA PRINCIPAL DE CHAT ── */}
        <div className="flex-1 flex flex-col justify-between bg-slate-950/20">
          
          {/* Header */}
          <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h2 className="text-sm font-bold text-white leading-none">Tutor Inteligente RAG</h2>
                <span className="text-[9px] text-emerald-400 font-semibold block mt-1">Conectado a Vector Store</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {messages.length > 0 && (
                <button
                  onClick={handleDeleteConversation}
                  className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-900/60 text-[10px] font-bold text-red-400 transition-all flex items-center gap-1"
                  title="Borrar historial"
                >
                  <span>🗑️</span>
                  <span className="hidden sm:inline">Limpiar chat</span>
                </button>
              )}
              
              {/* Botón Nueva Consulta para móvil */}
              <button 
                onClick={handleNewConversation}
                className="md:hidden px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-accent-teal"
              >
                Nuevo Chat
              </button>
            </div>
          </div>

          {/* Burbujas de Chat */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="min-h-[40vh] flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                <span className="text-4xl animate-bounce">👋</span>
                <h3 className="text-base font-bold text-white">¿En qué puedo ayudarte hoy?</h3>
                <p className="text-xs text-slate-500 font-light leading-relaxed">
                  Preguntame sobre bonos, CEDEARs, dólar MEP, plazos fijos o cualquier concepto de las lecciones.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user'
                return (
                  <div 
                    key={idx} 
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed font-light ${
                        isUser 
                          ? 'bg-slate-900 text-slate-300 rounded-tr-none' 
                          : 'bg-slate-800/80 text-slate-300 rounded-tl-none border border-slate-800/60'
                      }`}
                    >
                      {/* Aplicar efecto typewriter solo al último mensaje del asistente cuando llega recién */}
                      {!isUser && msg.isNew ? (
                        <TypewriterText text={msg.content} />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Indicador de Escritura */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800/50 text-slate-500 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-800/40 text-xs font-semibold animate-pulse flex items-center space-x-1.5">
                  <span>🤖</span>
                  <span className="text-[10px] font-light">Tutor escribiendo</span>
                  <span className="flex space-x-0.5">
                    <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
              </div>
            )}

            {/* Chips de Fuentes Citadas */}
            {activeSources.length > 0 && !isTyping && (
              <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl max-w-xl space-y-2.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Fuentes del Tutor</span>
                <div className="flex flex-wrap gap-2">
                  {activeSources.map((source, sIdx) => (
                    <a 
                      key={sIdx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-bold transition-all"
                    >
                      📖 {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-950/40 border-t border-slate-900 flex gap-3">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hacé tu pregunta sobre inversiones..."
              disabled={isTyping}
              className="flex-1 bg-slate-950 border border-slate-850 focus:border-accent-teal rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark px-6 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Consultar
            </button>
          </form>

        </div>

      </div>
    </DashboardLayout>
  )
}

export default TutorChat
