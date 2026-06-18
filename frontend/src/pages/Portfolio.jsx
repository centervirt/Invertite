import React, { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'
import toast from 'react-hot-toast'
import PriceBadge from '../components/PriceBadge'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const popularTickers = {
  cedear: [
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.' },
    { ticker: 'MSFT', name: 'Microsoft Corp.' },
    { ticker: 'TSLA', name: 'Tesla Inc.' },
    { ticker: 'NVDA', name: 'NVIDIA Corp.' },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
    { ticker: 'MELI', name: 'MercadoLibre Inc.' },
    { ticker: 'GOOGL', name: 'Alphabet Inc. Class A' },
    { ticker: 'BRKB', name: 'Berkshire Hathaway Inc.' }
  ],
  accion: [
    { ticker: 'GGAL', name: 'Grupo Financiero Galicia S.A.' },
    { ticker: 'YPFD', name: 'YPF S.A.' },
    { ticker: 'BMA', name: 'Banco Macro S.A.' },
    { ticker: 'PAMP', name: 'Pampa Energía S.A.' },
    { ticker: 'TXAR', name: 'Ternium Argentina S.A.' },
    { ticker: 'ALUA', name: 'Aluar Aluminio Argentino S.A.' }
  ],
  mep: [
    { ticker: 'MEP', name: 'Dólar MEP' }
  ],
  caucion: [
    { ticker: 'CAUCION', name: 'Caución Bursátil' }
  ],
  crypto: [
    { ticker: 'BTC', name: 'Bitcoin' },
    { ticker: 'ETH', name: 'Ethereum' },
    { ticker: 'USDT', name: 'Tether USDT' },
    { ticker: 'SOL', name: 'Solana' }
  ]
}

const Portfolio = () => {
  const [loading, setLoading] = useState(true)
  const [portfolioData, setPortfolioData] = useState({ 
    portfolio: { name: 'Mi Cartera', virtual_balance_ars: 1000000.00, virtual_balance_usd: 1000.00 },
    positions: [], 
    totals: { total_ars: 0, total_usd: 0, mep_rate: 1250 }, 
    monthly_return: 0 
  })
  const [history, setHistory] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    instrument_type: 'cedear',
    ticker: '',
    name: '',
    quantity: '',
    avg_buy_price: '',
    currency: 'ARS',
    notes: ''
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/portfolio')
      setPortfolioData(data.data)

      const historyRes = await api.get('/portfolio/history')
      setHistory(historyRes.data.data.snapshots || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar datos de la cartera.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('¿Estás seguro de que querés resetear tu simulación? Se eliminarán todos tus activos y se restaurará el saldo virtual inicial.')) return
    try {
      await api.post('/portfolio/reset')
      toast.success('Simulación reseteada con éxito.')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Error al resetear la simulación.')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      avg_buy_price: parseFloat(formData.avg_buy_price)
    }

    try {
      if (editingPosition) {
        await api.put(`/portfolio/positions/${editingPosition.id}`, {
          quantity: payload.quantity,
          avg_buy_price: payload.avg_buy_price,
          notes: payload.notes
        })
        toast.success('Posición actualizada correctamente.')
      } else {
        await api.post('/portfolio/positions', payload)
        toast.success('Posición agregada con éxito.')
      }
      setIsModalOpen(false)
      setEditingPosition(null)
      resetForm()
      loadData()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al procesar la operación.'
      toast.error(msg)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar esta posición?')) return
    try {
      await api.delete(`/portfolio/positions/${id}`)
      toast.success('Posición eliminada.')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar posición.')
    }
  }

  const openAddModal = () => {
    setEditingPosition(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (pos) => {
    setEditingPosition(pos)
    setFormData({
      instrument_type: pos.instrument_type,
      ticker: pos.ticker,
      name: pos.name,
      quantity: pos.quantity,
      avg_buy_price: pos.avg_buy_price,
      currency: pos.currency,
      notes: pos.notes || ''
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      instrument_type: 'cedear',
      ticker: '',
      name: '',
      quantity: '',
      avg_buy_price: '',
      currency: 'ARS',
      notes: ''
    })
  }

  const handleTickerChange = (val) => {
    const upperVal = val.toUpperCase();
    const suggestions = popularTickers[formData.instrument_type] || [];
    const matched = suggestions.find(s => s.ticker === upperVal);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        ticker: upperVal,
        name: matched.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        ticker: val
      }));
    }
  }

  // Gráfico de Línea - Evolución
  const lineChartData = {
    labels: history.length > 0 ? history.map(h => new Date(h.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })) : ['Sin Datos'],
    datasets: [
      {
        label: 'Valor de Cartera (ARS)',
        data: history.length > 0 ? history.map(h => h.total_ars) : [0],
        borderColor: '#00C9A7',
        backgroundColor: 'rgba(0, 201, 167, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
    },
    plugins: { legend: { display: false } }
  }

  // Gráfico de Dona - Distribución
  const instrumentBreakdown = portfolioData.positions.reduce((acc, pos) => {
    const typeUpper = pos.instrument_type.toUpperCase()
    acc[typeUpper] = (acc[typeUpper] || 0) + parseFloat(pos.value_ars)
    return acc
  }, {})

  const doughnutLabels = Object.keys(instrumentBreakdown)
  const doughnutValues = Object.values(instrumentBreakdown)

  const doughnutChartData = {
    labels: doughnutLabels.length > 0 ? doughnutLabels : ['Vacío'],
    datasets: [
      {
        data: doughnutValues.length > 0 ? doughnutValues : [1],
        backgroundColor: [
          '#00C9A7', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#64748B'
        ],
        borderWidth: 1,
        borderColor: '#0f172a'
      }
    ]
  }

  const cashArs = parseFloat(portfolioData.portfolio?.virtual_balance_ars || 0)
  const cashUsd = parseFloat(portfolioData.portfolio?.virtual_balance_usd || 0)
  const mepRate = portfolioData.totals.mep_rate || 1250
  const totalAssetsArs = portfolioData.totals.total_ars || 0
  const totalAssetsUsd = portfolioData.totals.total_usd || 0
  const grandTotalArs = totalAssetsArs + cashArs + (cashUsd * mepRate)
  const grandTotalUsd = totalAssetsUsd + cashUsd + (cashArs / mepRate)

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none">
        
        {/* Banner Descargo de Responsabilidad */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3 text-xs text-slate-400 font-light">
          <span className="text-lg">⚠️</span>
          <p>
            <strong>Aviso:</strong> Este simulador es exclusivamente educativo. Los precios son orientativos y pueden tener demoras o variaciones del mercado real. No constituye asesoramiento financiero ni sugerencias de inversión.
          </p>
        </div>

        {/* Encabezado y Botones */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Mi Cartera Simulada</h1>
            <p className="text-slate-400 text-xs mt-1">Simulá tus tenencias en vivo y analizá tu rendimiento.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-rose-400 rounded-xl text-xs font-bold active:scale-[0.98] transition-all"
            >
              Resetear Simulación
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark rounded-xl text-xs font-bold active:scale-[0.98] transition-all"
            >
              + Agregar Posición
            </button>
          </div>
        </div>

        {/* Resumen Total & Gráfico Evolución */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Cartera (Efectivo + Activos)</span>
                <h2 className="text-2xl font-black text-white mt-1">
                  $ {grandTotalArs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                  USDT {grandTotalUsd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="border-t border-slate-900/60 pt-3 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Activos Valuados</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    $ {totalAssetsArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Efectivo Disponible</span>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    $ {cashArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    USDT {cashUsd.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-600 border-t border-slate-900/60 pt-2 block">
                Valuación en base a dólar MEP a ${mepRate}
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Rendimiento Mensual</span>
              <span className={`text-sm font-bold ${portfolioData.monthly_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolioData.monthly_return >= 0 ? '▲' : '▼'} {Math.abs(portfolioData.monthly_return).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-950 border border-slate-900 rounded-3xl p-6">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-4">Evolución de Cartera (90 días)</span>
            <div className="h-44 relative">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>
        </div>

        {/* Tabla de Posiciones */}
        <div className="bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden">
          {(() => {
            const hasStalePrices = portfolioData.positions.some(pos => pos.isStale || pos.isVeryStale);
            const maxMinutesOld = portfolioData.positions.reduce((max, pos) => pos.minutesOld ? Math.max(max, pos.minutesOld) : max, 0);

            return (
              <div className="p-6 border-b border-slate-900 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Posiciones Actuales</span>
                  {hasStalePrices ? (
                    <span className="text-[9px] text-amber-400 font-bold block mt-1">⚠️ Algunos precios pueden estar diferidos</span>
                  ) : maxMinutesOld > 0 ? (
                    <span className="text-[9px] text-slate-500 block mt-1">Actualizado hace {maxMinutesOld} min</span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-bold block mt-1">● Precios actualizados en vivo</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{portfolioData.positions.length} activos</span>
              </div>
            );
          })()}


          {portfolioData.positions.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              Tu cartera está vacía. ¡Hacé click en "+ Agregar Posición" para empezar!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-400 uppercase tracking-widest text-[9px]">
                    <th className="p-4 pl-6">Instrumento</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-right">Cantidad</th>
                    <th className="p-4 text-right">Precio Compra</th>
                    <th className="p-4 text-right">Precio Actual</th>
                    <th className="p-4 text-right">Valuación</th>
                    <th className="p-4 text-right">Ganancia</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {portfolioData.positions.map((pos) => {
                    const priceDiff = (pos.price_current || 0) - (pos.avg_buy_price || 0)
                    const isPositive = priceDiff >= 0

                    return (
                      <tr key={pos.id} className="hover:bg-slate-900/20 text-slate-200">
                        <td className="p-4 pl-6 font-bold text-white uppercase">{pos.ticker}</td>
                        <td className="p-4 capitalize text-slate-400 text-[10px]">{pos.instrument_type}</td>
                        <td className="p-4 text-right">{parseFloat(pos.quantity || 0).toLocaleString('es-AR')}</td>
                        <td className="p-4 text-right">
                          {pos.currency === 'USD' ? 'USDT' : '$'} {parseFloat(pos.avg_buy_price || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end">
                            <PriceBadge
                              price={pos.price_current}
                              currency="ARS"
                              isFresh={pos.isFresh}
                              isStale={pos.isStale}
                              isVeryStale={pos.isVeryStale}
                              minutesOld={pos.minutesOld}
                              source={pos.source}
                            />
                          </div>
                        </td>

                        <td className="p-4 text-right font-bold text-white">
                          $ {parseFloat(pos.value_ars || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`p-4 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}
                          $ {(pos.profit_nominal || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          <span className="text-[10px] font-normal block">
                            ({isPositive ? '+' : ''}{(pos.profit_pct || 0).toFixed(2)}%)
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-2">
                          <button
                            onClick={() => openEditModal(pos)}
                            className="text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded-lg text-[10px]"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(pos.id)}
                            className="text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/5 rounded-lg text-[10px]"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Distribución de la Cartera */}
        {portfolioData.positions.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 flex flex-col items-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider self-start mb-6">Distribución por Activo</span>
              <div className="h-44 w-44">
                <Doughnut data={doughnutChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-950 border border-slate-900 rounded-3xl p-6">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-6">Detalle de Distribución</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {doughnutLabels.map((lbl, idx) => {
                  const val = doughnutValues[idx]
                  const pct = ((val / portfolioData.totals.total_ars) * 100).toFixed(1)
                  const color = doughnutChartData.datasets[0].backgroundColor[idx % doughnutChartData.datasets[0].backgroundColor.length]

                  return (
                    <div key={lbl} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-900 flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">{lbl}</span>
                        <span className="text-sm font-black text-white">{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Agregar / Editar Posición */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingPosition ? 'Editar Posición' : 'Agregar Posición'}
                </h3>
                <p className="text-slate-400 text-[11px] mt-1">
                  {editingPosition ? 'Modificá la cantidad o el precio de compra.' : 'Añadí un nuevo activo a tu portafolio simulado.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {!editingPosition && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Instrumento</label>
                        <select
                          value={formData.instrument_type}
                          onChange={(e) => setFormData({ ...formData, instrument_type: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
                        >
                          <option value="cedear">CEDEAR</option>
                          <option value="accion">Acción Merval</option>
                          <option value="on">Obligación Negociable</option>
                          <option value="fci">FCI</option>
                          <option value="caucion">Caución</option>
                          <option value="mep">Dólar MEP</option>
                          <option value="crypto">Criptomoneda</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Moneda Compra</label>
                        <select
                          value={formData.currency}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
                        >
                          <option value="ARS">ARS (Pesos)</option>
                          <option value="USD">USD (Dólar)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Ticker / Símbolo</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: AAPL, YPFD"
                          value={formData.ticker}
                          onChange={(e) => handleTickerChange(e.target.value)}
                          list="ticker-suggestions"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white uppercase placeholder-slate-650"
                        />
                        <datalist id="ticker-suggestions">
                          {(popularTickers[formData.instrument_type] || []).map(item => (
                            <option key={item.ticker} value={item.ticker}>{item.name}</option>
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Nombre Empresa</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Apple Inc."
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-650"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Cantidad</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="0.00"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-650"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Precio de Compra Promedio</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="0.00"
                      value={formData.avg_buy_price}
                      onChange={(e) => setFormData({ ...formData, avg_buy_price: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-650"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Notas (Opcional)</label>
                  <textarea
                    placeholder="Escribí notas sobre tu estrategia..."
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-650 resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark rounded-xl font-bold transition-all active:scale-[0.98]"
                >
                  {editingPosition ? 'Guardar Cambios' : 'Agregar a mi Cartera'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Disclaimer legal permanente */}
        <div className="bg-slate-950/40 border border-slate-900 text-slate-400 text-[11px] p-3 rounded-lg leading-relaxed select-none max-w-none text-center font-light mt-8">
          📊 Los precios mostrados son orientativos y pueden tener demora. No constituyen asesoramiento financiero ni oferta de inversión. Verificá siempre con tu broker antes de operar.
        </div>
      </div>

    </DashboardLayout>
  )
}

export default Portfolio
