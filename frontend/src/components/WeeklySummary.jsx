import React, { useState, useEffect } from 'react'
import api from '../services/api'

const WeeklySummary = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data: res } = await api.get('/content/weekly-summary')
        setData(res.data)
      } catch (err) {
        console.error('Error al cargar resumen semanal:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 text-center text-xs text-slate-500 animate-pulse select-none">
        Cargando resumen semanal de mercado...
      </div>
    )
  }

  if (!data || !data.summary) return null

  const { headline, intro, sections = [], tip_of_week, market_data_snapshot } = data.summary
  const dateFormatted = new Date(data.week_start).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const sentimentEmoji = {
    positive: '📈',
    neutral: '⚖️',
    negative: '📉'
  }

  const sentimentColor = {
    positive: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10',
    neutral: 'text-slate-400 bg-slate-500/5 border-slate-500/10',
    negative: 'text-rose-400 bg-rose-500/5 border-rose-500/10'
  }

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden select-none">
      
      {/* Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-teal/5 blur-3xl rounded-full"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-900 pb-4">
        <div>
          <span className="bg-accent-teal/10 text-accent-teal text-[9px] px-2.5 py-0.5 rounded-full border border-accent-teal/20 font-bold uppercase tracking-widest">
            Resumen Semanal IA
          </span>
          <span className="text-[10px] text-slate-500 font-semibold block sm:inline sm:ml-3 mt-1 sm:mt-0">
            Semana del {dateFormatted}
          </span>
        </div>
      </div>

      {/* Headline & Intro */}
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
          {headline}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed font-light">
          {intro}
        </p>
      </div>

      {/* Market Snapshot */}
      {market_data_snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/30 p-4 rounded-2xl border border-slate-900 font-mono">
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Dólar MEP</span>
            <span className="text-sm font-bold text-white block mt-0.5">
              ${parseFloat(market_data_snapshot.mep || 1250).toLocaleString('es-AR')}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Dólar CCL</span>
            <span className="text-sm font-bold text-white block mt-0.5">
              ${parseFloat(market_data_snapshot.ccl || 1290).toLocaleString('es-AR')}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Merval</span>
            <span className="text-sm font-bold text-white block mt-0.5">
              {parseFloat(market_data_snapshot.merval || 1500000).toLocaleString('es-AR')} pts
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Caución TNA</span>
            <span className="text-sm font-bold text-accent-teal block mt-0.5">
              {market_data_snapshot.caucion_tna || '38.5'}%
            </span>
          </div>
        </div>
      )}

      {/* Sections Accordion */}
      <div className="space-y-2">
        {sections.map((sect, index) => {
          const isExpanded = expandedSection === index
          return (
            <div 
              key={index} 
              className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-900/10 hover:border-slate-800 transition-all"
            >
              <button
                onClick={() => setExpandedSection(isExpanded ? null : index)}
                className="w-full p-4 text-left flex justify-between items-center text-xs font-bold text-white"
              >
                <div className="flex items-center space-x-3">
                  <span>{sentimentEmoji[sect.sentiment] || '⚖️'}</span>
                  <span>{sect.title}</span>
                </div>
                <span className="text-slate-500 font-light">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 border-t border-slate-900/50 space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    {sect.body}
                  </p>
                  
                  {/* Tags */}
                  {sect.instruments && sect.instruments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {sect.instruments.map(tag => (
                        <span 
                          key={tag} 
                          className="bg-slate-900 text-slate-400 border border-slate-850 px-2 py-0.5 rounded-lg text-[9px] uppercase font-mono tracking-wider font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tip of the week */}
      {tip_of_week && (
        <div className="bg-[#0B0F1A] border-l-4 border-accent-teal p-5 rounded-2xl">
          <span className="text-[10px] text-accent-teal font-extrabold uppercase tracking-wider block mb-1">
            💡 Consejo del Editor IA
          </span>
          <p className="text-xs text-slate-300 font-light leading-relaxed">
            {tip_of_week}
          </p>
        </div>
      )}

    </div>
  )
}

export default WeeklySummary
