import React, { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import toast from 'react-hot-toast'

const Ranking = () => {
  const [loading, setLoading] = useState(true)
  const [rankingPeriod, setRankingPeriod] = useState('monthly') // 'weekly' | 'monthly' | 'alltime'
  const [rankingData, setRankingData] = useState({ ranking: [], currentUserPosition: null, periodLabel: '' })
  const [portfolio, setPortfolio] = useState(null)

  const loadAllData = async (period) => {
    try {
      setLoading(true)
      const [rankRes, portRes] = await Promise.all([
        api.get(`/simulator/ranking?period=${period}`),
        api.get('/simulator/portfolio')
      ])
      setRankingData(rankRes.data.data)
      setPortfolio(portRes.data.data.portfolio)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la clasificación.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData(rankingPeriod)
  }, [rankingPeriod])

  // Split winners (podium) from the rest of the list
  const podium = rankingData.ranking?.slice(0, 3) || []
  const restOfLeaderboard = rankingData.ranking?.slice(3) || []

  // Check if current user is in the ranking list
  const isUserInTop20 = rankingData.ranking?.some(r => r.isCurrentUser)

  // Podium order helper to render 2nd - 1st - 3rd
  const getPodiumOrder = (items) => {
    if (items.length === 0) return []
    if (items.length === 1) return [items[0]]
    if (items.length === 2) return [items[1], items[0]]
    return [items[1], items[0], items[2]] // 2nd, 1st, 3rd
  }

  const podiumSorted = getPodiumOrder(podium)

  const getPodiumStyles = (position) => {
    switch (position) {
      case 1:
        return {
          bg: 'from-amber-500/20 via-yellow-500/5 to-transparent',
          border: 'border-yellow-500/40',
          text: 'text-yellow-400',
          shadow: 'shadow-yellow-500/5',
          height: 'h-48 sm:h-56',
          badgeBg: 'bg-yellow-500 text-slate-950',
          crown: '👑'
        }
      case 2:
        return {
          bg: 'from-slate-400/20 via-slate-500/5 to-transparent',
          border: 'border-slate-400/30',
          text: 'text-slate-300',
          shadow: 'shadow-slate-400/5',
          height: 'h-40 sm:h-48',
          badgeBg: 'bg-slate-400 text-slate-950',
          crown: '🥈'
        }
      case 3:
        return {
          bg: 'from-amber-700/20 via-amber-800/5 to-transparent',
          border: 'border-amber-700/30',
          text: 'text-amber-600',
          shadow: 'shadow-amber-700/5',
          height: 'h-36 sm:h-40',
          badgeBg: 'bg-amber-700 text-slate-100',
          crown: '🥉'
        }
      default:
        return {}
    }
  }

  // Motivational widget message builder
  const renderMotivationalWidget = () => {
    if (!rankingData.currentUserPosition) return null
    const position = rankingData.currentUserPosition.position

    let icon = '💡'
    let message = ''

    if (position <= 3) {
      icon = '🔥'
      message = 'Estás en el podio. Seguí así.'
    } else if (position > 3 && position <= 10) {
      icon = '✨'
      message = `¡Buen trabajo! Estás en la posición #${position} del Top 10. Seguí diversificando tu cartera para subir y alcanzar el podio.`
    } else {
      icon = '🚀'
      message = `Estás en el puesto ${position}. Los que van mejor que vos tienen más posiciones diversificadas. ¿Querés ver qué instrumentos tienen los líderes?`
    }

    return (
      <div className="bg-accent-teal/5 border border-accent-teal/20 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-accent-teal/10 flex items-center justify-center text-2xl border border-accent-teal/20 flex-shrink-0">
            {icon}
          </div>
          <div>
            <span className="text-[10px] text-accent-teal font-extrabold uppercase tracking-widest block">Tu Rendimiento Simulador</span>
            <p className="text-xs text-slate-200 mt-1 font-light italic leading-relaxed">
              "{message}"
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-6 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-900 pt-3 sm:pt-0 flex-shrink-0">
          <div className="text-left">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Rendimiento</span>
            <span className={`text-base font-black block mt-0.5 ${rankingData.currentUserPosition.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {rankingData.currentUserPosition.totalReturnPct >= 0 ? '+' : ''}{rankingData.currentUserPosition.totalReturnPct}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Valor Cartera</span>
            <span className="text-base font-mono font-bold text-white block mt-0.5">
              ${rankingData.currentUserPosition.totalValue.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-900 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 blur-3xl rounded-full"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="bg-accent-blue/10 text-accent-blue text-[10px] px-3 py-1 rounded-full border border-accent-blue/20 font-bold uppercase tracking-wider">
                Comunidad Invertite
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
                Ranking de Inversores
              </h1>
              <p className="text-slate-400 text-xs mt-1 max-w-2xl font-light">
                Tabla de clasificación mensual, semanal e histórica. Demostrá tus habilidades de inversión virtual de manera 100% anónima.
              </p>
            </div>
            
            {/* Period Selector */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-900 self-stretch md:self-auto justify-center">
              <button
                onClick={() => setRankingPeriod('monthly')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${rankingPeriod === 'monthly' ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Este mes
              </button>
              <button
                onClick={() => setRankingPeriod('weekly')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${rankingPeriod === 'weekly' ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Esta semana
              </button>
              <button
                onClick={() => setRankingPeriod('alltime')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${rankingPeriod === 'alltime' ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Histórico
              </button>
            </div>
          </div>
        </div>

        {/* Motivational Widget Card */}
        {renderMotivationalWidget()}

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-teal"></div>
          </div>
        ) : rankingData.ranking?.length === 0 ? (
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-12 text-center text-slate-500">
            <span className="text-4xl block mb-2">📊</span>
            <p className="text-xs font-light">Aún no hay suficientes portfolios para generar la tabla de posiciones. ¡Sé el primero en operar en el simulador!</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* PODIUM SHOWCASE */}
            {podiumSorted.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end pt-8 max-w-4xl mx-auto">
                {podiumSorted.map((winner) => {
                  const style = getPodiumStyles(winner.position)
                  return (
                    <div
                      key={winner.position}
                      className={`bg-gradient-to-b ${style.bg} border ${style.border} rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-2xl relative transition-transform hover:scale-[1.02] ${style.height} ${winner.isCurrentUser ? 'ring-2 ring-accent-teal' : ''}`}
                    >
                      {/* Position Badge */}
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono shadow-md ${style.badgeBg}`}>
                        {winner.position}
                      </span>

                      <div className="mt-2 space-y-1">
                        <span className="text-3xl block mb-1">{style.crown}</span>
                        <span className="text-sm font-black text-white block">
                          {winner.displayName}
                        </span>
                        {winner.isCurrentUser && (
                          <span className="bg-accent-teal/10 text-accent-teal text-[8px] font-bold px-1.5 py-0.2 rounded border border-accent-teal/20 uppercase tracking-widest inline-block">Tu Cartera</span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <span className={`text-xl font-black block ${winner.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {winner.totalReturnPct >= 0 ? '+' : ''}{winner.totalReturnPct}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          ${winner.totalValue.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* LEADERBOARD TABLE */}
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white tracking-tight border-b border-slate-900 pb-3 mb-4">
                Tabla Completa (Top 20) — {rankingData.periodLabel}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      <th className="pb-3 w-20 text-center">Posición</th>
                      <th className="pb-3">Inversor</th>
                      <th className="pb-3 text-right">Rendimiento</th>
                      <th className="pb-3 text-right">Valor de Cartera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/30 text-xs">
                    {/* Top list excluding podium winners */}
                    {restOfLeaderboard.map((rank) => (
                      <tr 
                        key={rank.position}
                        className={`hover:bg-slate-900/10 ${rank.isCurrentUser ? 'bg-accent-teal/5 border border-accent-teal/50' : ''}`}
                      >
                        <td className="py-3.5 text-center font-bold text-white">#{rank.position}</td>
                        <td className="py-3.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-200 font-medium">{rank.displayName}</span>
                            {rank.isCurrentUser && (
                              <span className="bg-accent-teal/10 text-accent-teal text-[8px] font-bold px-1.5 py-0.2 rounded border border-accent-teal/20">Vos</span>
                            )}
                          </div>
                        </td>
                        <td className={`py-3.5 text-right font-bold font-mono ${rank.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {rank.totalReturnPct >= 0 ? '+' : ''}{rank.totalReturnPct}%
                        </td>
                        <td className="py-3.5 text-right font-mono text-slate-300">
                          ${rank.totalValue.toLocaleString('es-AR')}
                        </td>
                      </tr>
                    ))}

                    {/* Bottom placement for current user if outside Top 20 */}
                    {!isUserInTop20 && rankingData.currentUserPosition && (
                      <>
                        <tr className="border-t-2 border-dashed border-slate-800">
                          <td colSpan={4} className="py-2 text-center text-[10px] text-slate-500">Fuera del Top 20</td>
                        </tr>
                        <tr className="bg-accent-teal/5 border border-accent-teal/50 rounded-xl">
                          <td className="py-3.5 text-center font-bold text-white">#{rankingData.currentUserPosition.position}</td>
                          <td className="py-3.5">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-200 font-medium">{portfolio?.displayName || 'Vos'}</span>
                              <span className="bg-accent-teal/10 text-accent-teal text-[8px] font-bold px-1.5 py-0.2 rounded border border-accent-teal/20">Vos</span>
                            </div>
                          </td>
                          <td className={`py-3.5 text-right font-bold font-mono ${rankingData.currentUserPosition.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {rankingData.currentUserPosition.totalReturnPct >= 0 ? '+' : ''}{rankingData.currentUserPosition.totalReturnPct}%
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-300">
                            ${rankingData.currentUserPosition.totalValue.toLocaleString('es-AR')}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Disclaimer footer */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-900 rounded-2xl p-4 text-center text-[10px] text-slate-500 select-none flex items-center justify-center space-x-2 shadow-inner">
          <span>⚠️</span>
          <span>
            <strong>INFORMACIÓN DEL SIMULADOR:</strong> El ranking refleja carteras simuladas con dinero virtual y cotizaciones reales del mercado. **No representa dinero real**.
          </span>
        </div>

      </div>
    </DashboardLayout>
  )
}

export default Ranking
