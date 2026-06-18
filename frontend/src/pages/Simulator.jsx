import React, { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import toast from 'react-hot-toast'
import PriceBadge from '../components/PriceBadge'
import TradeModal from '../components/TradeModal'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const popularTickers = {
  cedear: [
    { ticker: 'SPY', name: 'S&P 500 ETF' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'MSFT', name: 'Microsoft Corp.' },
    { ticker: 'TSLA', name: 'Tesla Inc.' },
    { ticker: 'NVDA', name: 'NVIDIA Corp.' },
    { ticker: 'MELI', name: 'MercadoLibre' }
  ],
  accion: [
    { ticker: 'GGAL', name: 'Grupo Financiero Galicia' },
    { ticker: 'YPFD', name: 'YPF S.A.' },
    { ticker: 'PAMP', name: 'Pampa Energía' },
    { ticker: 'ALUA', name: 'Aluar Aluminio Argentino' }
  ],
  crypto: [
    { ticker: 'BTC', name: 'Bitcoin' },
    { ticker: 'ETH', name: 'Ethereum' },
    { ticker: 'USDT', name: 'Tether' }
  ]
}

const Simulator = () => {
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [rankingData, setRankingData] = useState({ ranking: [], currentUserPosition: null, periodLabel: '' })
  const [historyData, setHistoryData] = useState([])
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('portfolio') // 'portfolio' | 'ranking' | 'history' | 'transactions'
  const [rankingPeriod, setRankingPeriod] = useState('monthly') // 'monthly' | 'weekly' | 'alltime'
  
  // Buy / Sell states
  const [tradeType, setTradeType] = useState('buy') // 'buy' | 'sell'
  const [instrumentType, setInstrumentType] = useState('cedear')
  const [selectedTicker, setSelectedTicker] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [livePrice, setLivePrice] = useState(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)

  // Trade Modal states
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false)
  const [modalTradeParams, setModalTradeParams] = useState({ action: 'buy', ticker: '', type: 'cedear', name: '' })

  const quantityInputRef = useRef(null)
  const tabsSectionRef = useRef(null)

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadPortfolio(),
        loadTransactions(),
        loadRanking(rankingPeriod),
        loadHistory()
      ])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar datos del simulador.')
    } finally {
      setLoading(false)
    }
  }

  const loadPortfolio = async () => {
    const { data } = await api.get('/simulator/portfolio')
    setPortfolio(data.data.portfolio)
  }

  const loadTransactions = async () => {
    const { data } = await api.get('/simulator/transactions')
    setTransactions(data.data.transactions || [])
  }

  const loadRanking = async (period) => {
    const { data } = await api.get(`/simulator/ranking?period=${period}`)
    setRankingData(data.data)
  }

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/simulator/history')
      setHistoryData(data.data.snapshots || [])
    } catch (err) {
      console.error('Error loading history snapshots:', err)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    loadRanking(rankingPeriod)
  }, [rankingPeriod])

  // Fetch price when ticker changes
  useEffect(() => {
    if (!selectedTicker) {
      setLivePrice(null)
      return
    }

    const fetchLivePrice = async () => {
      setFetchingPrice(true)
      try {
        const cleanTicker = selectedTicker.toUpperCase().trim()
        const { data } = await api.get(`/market/price/${instrumentType}/${cleanTicker}`)
        if (data && data.data && data.data.price) {
          setLivePrice(parseFloat(data.data.price))
        } else {
          setLivePrice(null)
        }
      } catch (err) {
        console.error(err)
        setLivePrice(null)
      } finally {
        setFetchingPrice(false)
      }
    }

    fetchLivePrice()
  }, [selectedTicker, instrumentType])

  const handleSelectPopular = (item) => {
    setSelectedTicker(item.ticker)
    setSelectedName(item.name)
  }

  const handleExecuteTrade = async (e) => {
    e.preventDefault()
    if (!selectedTicker || !quantity || parseFloat(quantity) <= 0) {
      toast.error('Completá los campos correctamente.')
      return
    }

    const qty = parseFloat(quantity)
    
    try {
      if (tradeType === 'buy') {
        const payload = {
          ticker: selectedTicker.toUpperCase().trim(),
          type: instrumentType,
          name: selectedName || selectedTicker.toUpperCase(),
          quantity: qty
        }
        await api.post('/simulator/buy', payload)
        toast.success('Compra ficticia realizada con éxito.')
      } else {
        const payload = {
          ticker: selectedTicker.toUpperCase().trim(),
          quantity: qty
        }
        await api.post('/simulator/sell', payload)
        toast.success('Venta ficticia realizada con éxito.')
      }
      
      // Reset trade form
      setQuantity('')
      setSelectedTicker('')
      setSelectedName('')
      setLivePrice(null)
      
      // Reload everything
      await loadPortfolio()
      await loadTransactions()
      await loadRanking(rankingPeriod)
      await loadHistory()
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al procesar la operación.'
      toast.error(msg)
    }
  }

  const handleActionComprarMas = (pos) => {
    setModalTradeParams({
      action: 'buy',
      ticker: pos.ticker,
      type: pos.type,
      name: pos.name
    })
    setIsTradeModalOpen(true)
  }

  const handleActionVender = (pos) => {
    setModalTradeParams({
      action: 'sell',
      ticker: pos.ticker,
      type: pos.type,
      name: pos.name
    })
    setIsTradeModalOpen(true)
  }

  const handleViewAllTransactions = () => {
    setActiveTab('transactions')
    setTimeout(() => {
      tabsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleResetPortfolio = async () => {
    const confirm = window.confirm('⚠ Vas a perder todas tus posiciones y tu posición en el ranking de este mes. ¿Estás seguro?')
    if (!confirm) return

    try {
      await api.post('/simulator/reset', { confirm: true })
      toast.success('Simulador reiniciado correctamente.')
      loadAllData()
    } catch (err) {
      toast.error('Error al reiniciar el simulador.')
    }
  }

  // Determine colors and charts parameters
  const isPerformancePositive = portfolio ? parseFloat(portfolio.totalReturnPct) >= 0 : true
  const mainLineColor = isPerformancePositive ? '#10b981' : '#ef4444'
  const mainFillColor = isPerformancePositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'

  const chartData = {
    labels: historyData.map(s => new Date(s.date).toLocaleDateString('es-AR')),
    datasets: [
      {
        label: 'Valor Total (ARS)',
        data: historyData.map(s => parseFloat(s.totalValue)),
        borderColor: mainLineColor,
        backgroundColor: mainFillColor,
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: mainLineColor
      },
      {
        label: 'Capital Inicial ($1M)',
        data: historyData.map(() => 1000000),
        borderColor: '#64748b',
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      }
    }
  }

  if (loading && !portfolio) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-teal"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none max-w-7xl mx-auto">
        
        {/* Banner de Bienvenida y Disclaimer */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-900 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-teal/5 blur-3xl rounded-full"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="bg-accent-teal/10 text-accent-teal text-[10px] px-3 py-1 rounded-full border border-accent-teal/20 font-bold uppercase tracking-wider">
                Simulación Financiera
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
                Simulador de Cartera Virtual
              </h1>
              <p className="text-slate-400 text-xs mt-1 max-w-2xl font-light">
                Comprá y vendé activos financieros con dinero virtual. Practicá estrategias de inversión con cotizaciones en tiempo real sin arriesgar tu capital.
              </p>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3 max-w-sm">
              <span className="text-2xl">⚠️</span>
              <div className="text-left">
                <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wide block">DISCLAIMER IMPORTANTE</span>
                <span className="text-[11px] text-slate-300 font-medium">
                  El capital utilizado es **100% ficticio**. Los precios y cotizaciones son **100% reales** del mercado.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Totales y Balances */}
        {portfolio && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Capital Virtual Inicial</span>
              <span className="text-2xl font-black text-white block mt-1">
                ${parseFloat(portfolio.initialCapital).toLocaleString('es-AR')}
              </span>
            </div>
            
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valor Total de Cartera</span>
              <span className="text-2xl font-black text-white block mt-1">
                ${parseFloat(portfolio.totalValue).toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Efectivo Disponible</span>
              <span className="text-2xl font-black text-accent-teal block mt-1">
                ${parseFloat(portfolio.cashBalance).toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Rendimiento Histórico</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-2xl font-black ${isPerformancePositive ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {isPerformancePositive ? '+' : ''}{portfolio.totalReturnPct}%
                </span>
                <span className={`text-xs ${isPerformancePositive ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                  (${parseFloat(portfolio.totalReturnArs).toLocaleString('es-AR')})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Operaciones e Instrumentos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="space-y-6">
            {/* Formulario de Compra/Venta */}
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-900 pb-3 flex justify-between items-center">
                <span>Operar en el Mercado</span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {portfolio?.displayName}</span>
              </h2>

              {/* Selector Comprar/Vender */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-900">
                <button
                  type="button"
                  onClick={() => { setTradeType('buy'); setQuantity(''); setSelectedTicker(''); setSelectedName(''); }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeType === 'buy' ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  Comprar
                </button>
                <button
                  type="button"
                  onClick={() => { setTradeType('sell'); setQuantity(''); setSelectedTicker(''); setSelectedName(''); }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeType === 'sell' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Vender
                </button>
              </div>

              <form onSubmit={handleExecuteTrade} className="space-y-4">
                {tradeType === 'buy' && (
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Tipo de Activo</label>
                    <select
                      value={instrumentType}
                      onChange={(e) => { setInstrumentType(e.target.value); setSelectedTicker(''); setSelectedName(''); }}
                      className="w-full bg-[#090d16] border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-teal"
                    >
                      <option value="cedear">CEDEARs (Acciones Internacionales)</option>
                      <option value="accion">Acciones Argentinas</option>
                      <option value="crypto">Criptomonedas</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Ticker / Símbolo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: SPY, GGAL, BTC"
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
                    className="w-full bg-[#090d16] border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-teal font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Nombre descriptivo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Nombre del activo"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent-teal"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Cantidad</label>
                  <input
                    type="number"
                    ref={quantityInputRef}
                    required
                    step="any"
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-teal font-mono"
                  />
                </div>

                {/* Live Price Preview */}
                {livePrice !== null && (
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-light">Precio Estimado</span>
                    <span className="font-bold text-white font-mono">${livePrice.toLocaleString('es-AR')}</span>
                  </div>
                )}

                {fetchingPrice && (
                  <div className="text-[10px] text-accent-teal animate-pulse">Buscando cotización en tiempo real...</div>
                )}

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${tradeType === 'buy' ? 'bg-accent-teal text-slate-950 hover:bg-accent-teal/90' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                >
                  {tradeType === 'buy' ? 'Confirmar Compra Virtual' : 'Confirmar Venta Virtual'}
                </button>
              </form>

              {/* Sugerencias populares de activos */}
              {tradeType === 'buy' && (
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-2">Activos Sugeridos</span>
                  <div className="flex flex-wrap gap-1">
                    {popularTickers[instrumentType]?.map(item => (
                      <button
                        key={item.ticker}
                        type="button"
                        onClick={() => handleSelectPopular(item)}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-850 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-300 hover:text-white"
                      >
                        {item.ticker}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN TRANSACCIONES RECIENTES */}
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h2 className="text-sm font-bold text-white tracking-tight">Transacciones Recientes</h2>
                {transactions.length > 5 && (
                  <button
                    onClick={handleViewAllTransactions}
                    className="text-[10px] text-accent-teal hover:underline font-bold"
                  >
                    Ver todas →
                  </button>
                )}
              </div>

              {transactions.length === 0 ? (
                <p className="text-[11px] text-slate-500 font-light text-center py-4">No registrás transacciones aún.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-slate-900/10 p-2.5 rounded-xl border border-slate-900/40">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'}`}>
                          {tx.type === 'buy' ? 'COMPRA' : 'VENTA'}
                        </span>
                        <span className="font-mono font-bold text-white">{tx.ticker}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[11px] text-slate-300 block">
                          {tx.quantity} x ${parseFloat(tx.price).toLocaleString('es-AR')}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-light">
                          {new Date(tx.date).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Listado de Posiciones Abiertas */}
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-900 pb-3 flex justify-between items-center">
              <span>Posiciones Abiertas</span>
              <span className="text-xs text-slate-400 font-light">{portfolio?.positions?.length || 0} activos</span>
            </h2>

            {portfolio?.positions?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <span className="text-4xl mb-2">💼</span>
                <p className="text-xs font-light max-w-xs">No tenés activos virtuales en cartera. Seleccioná un instrumento de la lista y hacé tu primera compra simulada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      <th className="pb-3">Instrumento</th>
                      <th className="pb-3 text-right">Cant.</th>
                      <th className="pb-3 text-right">Compra Prom.</th>
                      <th className="pb-3 text-right">Precio Actual</th>
                      <th className="pb-3 text-right">Valor Actual</th>
                      <th className="pb-3 text-right">Ganancia/Pérdida $</th>
                      <th className="pb-3 text-right">Ganancia/Pérdida %</th>
                      <th className="pb-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/30 text-xs">
                    {portfolio?.positions.map(pos => (
                      <tr key={pos.id} className="hover:bg-slate-900/10">
                        <td className="py-3.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-white">{pos.ticker}</span>
                            <span className="bg-slate-900 text-[8px] px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 uppercase font-bold">{pos.type}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-light block truncate max-w-[150px]">{pos.name}</span>
                        </td>
                        <td className="py-3.5 text-right font-mono text-slate-300">{pos.quantity}</td>
                        <td className="py-3.5 text-right font-mono text-slate-300">${pos.avgBuyPrice.toLocaleString('es-AR')}</td>
                        <td className="py-3.5 text-right font-mono text-white">
                          <PriceBadge 
                            price={pos.currentPrice} 
                            currency={pos.currency}
                            isFresh={pos.isFresh}
                            isStale={pos.minutesOld >= 5 && pos.minutesOld < 60}
                            isVeryStale={pos.minutesOld >= 60}
                            minutesOld={pos.minutesOld}
                          />
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold text-white">${pos.currentValue.toLocaleString('es-AR')}</td>
                        <td className={`py-3.5 text-right font-mono font-bold ${pos.gainLossArs >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {pos.gainLossArs >= 0 ? '+' : ''}${parseFloat(pos.gainLossArs.toFixed(2)).toLocaleString('es-AR')}
                        </td>
                        <td className={`py-3.5 text-right font-mono font-bold ${pos.gainLossArs >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {pos.gainLossArs >= 0 ? '+' : ''}{pos.gainLossPct}%
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="flex justify-center space-x-1.5">
                            <button
                              onClick={() => handleActionComprarMas(pos)}
                              className="bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal text-[10px] font-bold px-2 py-1 rounded-lg transition-colors border border-accent-teal/20"
                            >
                              Comprar más
                            </button>
                            <button
                              onClick={() => handleActionVender(pos)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors border border-rose-500/20"
                            >
                              Vender
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Panel Inferior: Tabs de Ranking, Gráfico y Transacciones */}
        <div ref={tabsSectionRef} className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-6">
          
          {/* Navegación Tabs */}
          <div className="flex border-b border-slate-900 gap-6">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`pb-3 text-xs font-bold transition-all relative ${activeTab === 'portfolio' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Historial de Valor
              {activeTab === 'portfolio' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-teal"></div>}
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`pb-3 text-xs font-bold transition-all relative ${activeTab === 'ranking' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Ranking de Inversores
              {activeTab === 'ranking' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-teal"></div>}
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-3 text-xs font-bold transition-all relative ${activeTab === 'transactions' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Operaciones Ficticias
              {activeTab === 'transactions' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-teal"></div>}
            </button>
          </div>

          {/* Renderizado de Tab seleccionada */}

          {/* TAB 1: Historial de Valor (Gráfico) */}
          {activeTab === 'portfolio' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Evolución de Cartera Virtual</h3>
                  <p className="text-[10px] text-slate-500 font-light">Snapshots de tu saldo total acumulados diariamente.</p>
                </div>
              </div>

              {historyData.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 h-[220px] bg-slate-900/10 rounded-2xl border border-slate-900 border-dashed">
                  <span className="text-2xl mb-1">📈</span>
                  <p className="text-[11px] font-light max-w-xs">Esperá a la próxima corrida diaria (18:00 hs) para empezar a ver los puntos de evolución de tu cartera simulada.</p>
                </div>
              ) : (
                <div className="h-[250px] relative">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Ranking de Inversores */}
          {activeTab === 'ranking' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Ranking de Inversores (Top 20)</h3>
                  <p className="text-[10px] text-slate-500 font-light">
                    Competencia sana y 100% anónima con otros miembros de la comunidad ({rankingData.periodLabel}).
                  </p>
                </div>
                
                {/* Selector Período Ranking */}
                <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-900">
                  <button
                    onClick={() => setRankingPeriod('monthly')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${rankingPeriod === 'monthly' ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Este mes
                  </button>
                  <button
                    onClick={() => setRankingPeriod('weekly')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${rankingPeriod === 'weekly' ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Esta semana
                  </button>
                  <button
                    onClick={() => setRankingPeriod('alltime')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${rankingPeriod === 'alltime' ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Histórico
                  </button>
                </div>
              </div>

              {/* Posición del usuario actual */}
              {rankingData.currentUserPosition && (() => {
                const pos = rankingData.currentUserPosition.position;
                let icon = '💡';
                let msg = '';
                if (pos <= 3) {
                  icon = '🔥';
                  msg = 'Estás en el podio. Seguí así.';
                } else if (pos > 3 && pos <= 10) {
                  icon = '✨';
                  msg = `¡Buen trabajo! Estás en la posición #${pos} del Top 10. Seguí diversificando tu cartera para subir y alcanzar el podio.`;
                } else {
                  icon = '🚀';
                  msg = `Estás en el puesto ${pos}. Los que van mejor que vos tienen más posiciones diversificadas. ¿Querés ver qué instrumentos tienen los líderes?`;
                }

                return (
                  <div className="bg-accent-teal/5 border border-accent-teal/20 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                    <div className="flex items-start sm:items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-accent-teal/10 flex items-center justify-center text-xl border border-accent-teal/20 flex-shrink-0">
                        {icon}
                      </div>
                      <div>
                        <span className="text-[10px] text-accent-teal font-extrabold uppercase tracking-wide block">Tu Posición Actual</span>
                        <p className="text-[11px] text-slate-200 mt-0.5 font-light italic leading-relaxed">
                          "{msg}"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-900 pt-2.5 sm:pt-0 flex-shrink-0">
                      <div className="text-left">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Rendimiento</span>
                        <span className={`text-xs font-black block mt-0.5 ${rankingData.currentUserPosition.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {rankingData.currentUserPosition.totalReturnPct >= 0 ? '+' : ''}{rankingData.currentUserPosition.totalReturnPct}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Valor Cartera</span>
                        <span className="text-xs font-mono font-bold text-white block mt-0.5">
                          ${rankingData.currentUserPosition.totalValue.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {rankingData.ranking?.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No hay datos de ranking disponibles para este período.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        <th className="pb-3 w-16">Puesto</th>
                        <th className="pb-3">Nombre</th>
                        <th className="pb-3 text-right">Rend.</th>
                        <th className="pb-3 text-right font-mono">Val. Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/30 text-xs">
                      {rankingData.ranking.map((rank) => (
                        <tr 
                          key={rank.position} 
                          className={`hover:bg-slate-900/10 ${rank.isCurrentUser ? 'bg-accent-teal/5 border border-accent-teal/50' : ''}`}
                        >
                          <td className="py-3 font-bold text-white">#{rank.position}</td>
                          <td className="py-3 flex items-center space-x-2">
                            <span className="text-slate-300 font-medium">{rank.displayName}</span>
                            {rank.isCurrentUser && (
                              <span className="bg-accent-teal/10 text-accent-teal text-[8px] font-bold px-1.5 py-0.2 rounded border border-accent-teal/20">Vos</span>
                            )}
                          </td>
                          <td className={`py-3 text-right font-bold font-mono ${rank.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {rank.totalReturnPct >= 0 ? '+' : ''}{rank.totalReturnPct}%
                          </td>
                          <td className="py-3 text-right font-mono text-slate-300">${rank.totalValue.toLocaleString('es-AR')}</td>
                        </tr>
                      ))}

                      {/* Display current user at the bottom if outside Top 20 */}
                      {rankingData.currentUserPosition && !rankingData.ranking.some(r => r.isCurrentUser) && (
                        <>
                          <tr className="border-t-2 border-dashed border-slate-800">
                            <td colSpan={4} className="py-2 text-center text-[10px] text-slate-500">Fuera del Top 20</td>
                          </tr>
                          <tr className="bg-accent-teal/5 border border-accent-teal/50 rounded-xl">
                            <td className="py-3 font-bold text-white">#{rankingData.currentUserPosition.position}</td>
                            <td className="py-3 flex items-center space-x-2">
                              <span className="text-slate-300 font-medium">{portfolio?.displayName || 'Vos'}</span>
                              <span className="bg-accent-teal/10 text-accent-teal text-[8px] font-bold px-1.5 py-0.2 rounded border border-accent-teal/20">Vos</span>
                            </td>
                            <td className={`py-3 text-right font-bold font-mono ${rankingData.currentUserPosition.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {rankingData.currentUserPosition.totalReturnPct >= 0 ? '+' : ''}{rankingData.currentUserPosition.totalReturnPct}%
                            </td>
                            <td className="py-3 text-right font-mono text-slate-300">${rankingData.currentUserPosition.totalValue.toLocaleString('es-AR')}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Historial de transacciones */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Historial de Operaciones Ficticias</h3>
                <p className="text-[10px] text-slate-500 font-light">Tus compras y ventas virtuales registradas.</p>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No has realizado ninguna transacción simulada.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        <th className="pb-3">Operación</th>
                        <th className="pb-3">Ticker</th>
                        <th className="pb-3 text-right">Cant.</th>
                        <th className="pb-3 text-right">Precio Ejec.</th>
                        <th className="pb-3 text-right">Monto</th>
                        <th className="pb-3 text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/30 text-xs">
                      {transactions.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10">
                          <td className="py-3">
                            <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full border ${tx.type === 'buy' ? 'bg-accent-teal/10 text-accent-teal border-accent-teal/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                              {tx.type === 'buy' ? 'Compra' : 'Venta'}
                            </span>
                          </td>
                          <td className="py-3 font-mono font-bold text-white">{tx.ticker}</td>
                          <td className="py-3 text-right font-mono text-slate-300">{tx.quantity}</td>
                          <td className="py-3 text-right font-mono text-slate-300">${parseFloat(tx.price).toLocaleString('es-AR')}</td>
                          <td className="py-3 text-right font-mono font-bold text-white">${parseFloat(tx.total).toLocaleString('es-AR')}</td>
                          <td className="py-3 text-right text-slate-500 font-light">
                            {new Date(tx.date).toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Zona de Peligro - Resetear Cartera */}
        <div className="bg-slate-950 border border-red-900/30 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Reiniciar Cuenta de Simulación</h3>
            <p className="text-[10px] text-slate-500 font-light mt-0.5">Se eliminarán todos tus activos ficticios y se restaurará el saldo a $1.000.000 ARS. Tu nombre anónimo no cambiará.</p>
          </div>
          <button
            onClick={handleResetPortfolio}
            className="bg-red-500/10 border border-red-500/20 hover:bg-red-650 hover:bg-red-500/20 text-red-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            Reiniciar Cartera Virtual
          </button>
        </div>

        {/* Sticky Disclaimer Footer (Siempre visible) */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-900 rounded-2xl p-4 text-center text-[10px] text-slate-500 select-none flex items-center justify-center space-x-2">
          <span>⚠️</span>
          <span>
            <strong>INFORMACIÓN DEL SIMULADOR:</strong> El saldo y los activos operados en esta pantalla son de carácter puramente educativo e ilustrativo. **No constituyen dinero real**. Las cotizaciones son provistas en tiempo real mediante integraciones de mercado oficiales.
          </span>
        </div>

        {/* Trade Modal */}
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          portfolio={portfolio}
          initialAction={modalTradeParams.action}
          initialTicker={modalTradeParams.ticker}
          initialType={modalTradeParams.type}
          initialName={modalTradeParams.name}
          onTradeExecuted={loadAllData}
        />

      </div>
    </DashboardLayout>
  )
}

export default Simulator
