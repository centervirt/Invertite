import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import PriceBadge from './PriceBadge'
import { INSTRUMENTS } from '../config/instruments'

const TradeModal = ({
  isOpen,
  onClose,
  portfolio,
  initialAction = 'buy',
  initialTicker = '',
  initialType = 'cedear',
  initialName = '',
  onTradeExecuted
}) => {
  const [tradeType, setTradeType] = useState(initialAction)
  const [instrumentType, setInstrumentType] = useState(initialType)
  const [ticker, setTicker] = useState(initialTicker)
  const [name, setName] = useState(initialName)
  const [quantity, setQuantity] = useState('')
  const [livePrice, setLivePrice] = useState(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const quantityInputRef = useRef(null)

  // Reset form when modal opens with new initials
  useEffect(() => {
    if (isOpen) {
      setTradeType(initialAction)
      setInstrumentType(initialType)
      setTicker(initialTicker)
      setName(initialName)
      setQuantity('')
      setLivePrice(null)
      setShowSuggestions(false)
      
      setTimeout(() => {
        if (initialTicker) {
          quantityInputRef.current?.focus()
        }
      }, 100)
    }
  }, [isOpen, initialAction, initialTicker, initialType, initialName])

  // Fetch live price and handle suggestions when ticker changes
  useEffect(() => {
    if (!ticker) {
      setLivePrice(null)
      setSuggestions([])
      return
    }

    const cleanTicker = ticker.toUpperCase().trim()

    // Handle filtered suggestions list
    if (!initialTicker) {
      const filtered = INSTRUMENTS.filter(inst => 
        inst.ticker.startsWith(cleanTicker) || 
        inst.name.toLowerCase().includes(ticker.toLowerCase())
      )
      setSuggestions(filtered)
    }

    const fetchLivePrice = async () => {
      setFetchingPrice(true)
      try {
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
  }, [ticker, initialTicker])

  if (!isOpen) return null

  // Calculations for preview
  const qtyNum = parseFloat(quantity) || 0
  const estimatedPrice = livePrice || 0
  const totalCost = qtyNum * estimatedPrice

  // Cash / positions context
  const availableCash = portfolio ? parseFloat(portfolio.cashBalance) : 0
  const existingPosition = portfolio?.positions?.find(p => p.ticker.toUpperCase() === ticker.toUpperCase())
  const availableQty = existingPosition ? parseFloat(existingPosition.quantity) : 0

  // Validations
  const isBuy = tradeType === 'buy'
  const isInsufficientFunds = isBuy && (totalCost * 1.005) > availableCash
  const isInsufficientQuantity = !isBuy && qtyNum > availableQty
  const isInvalidQty = qtyNum <= 0

  const handleSelectSuggestion = (item) => {
    setTicker(item.ticker)
    setName(item.name)
    setInstrumentType(item.type)
    setShowSuggestions(false)
    setTimeout(() => {
      quantityInputRef.current?.focus()
    }, 100)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!ticker || isInvalidQty) {
      toast.error('Por favor, ingresá valores válidos.')
      return
    }

    if (isBuy && isInsufficientFunds) {
      toast.error('Saldo virtual insuficiente para realizar esta compra.')
      return
    }

    if (!isBuy && isInsufficientQuantity) {
      toast.error('No tenés la cantidad suficiente de activos para vender.')
      return
    }

    setSubmitting(true)
    try {
      if (isBuy) {
        await api.post('/simulator/buy', {
          ticker: ticker.toUpperCase().trim(),
          type: instrumentType,
          name: name || ticker.toUpperCase().trim(),
          quantity: qtyNum
        })
        toast.success(`Compraste virtualmente ${qtyNum} ${ticker.toUpperCase()}`)
      } else {
        await api.post('/simulator/sell', {
          ticker: ticker.toUpperCase().trim(),
          quantity: qtyNum
        })
        toast.success(`Vendiste virtualmente ${qtyNum} ${ticker.toUpperCase()}`)
      }
      
      onTradeExecuted()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al ejecutar la operación simulada.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-slate-950 border border-slate-900 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative overflow-hidden select-none">
        
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-teal/5 blur-3xl rounded-full"></div>

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
          <h2 className="text-base font-bold text-white tracking-tight">
            {isBuy ? 'Simular Compra' : 'Simular Venta'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab selector Comprar / Vender */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-900">
          <button
            type="button"
            onClick={() => { setTradeType('buy'); setQuantity(''); }}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${isBuy ? 'bg-accent-teal text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Comprar
          </button>
          <button
            type="button"
            onClick={() => { setTradeType('sell'); setQuantity(''); }}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${!isBuy ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Vender
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* Action fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Ticker</label>
              <input
                type="text"
                disabled={!!initialTicker}
                value={ticker}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full bg-[#090d16] border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-teal font-mono uppercase disabled:opacity-60"
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && !initialTicker && (
                <div className="absolute left-0 mt-1 w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-900">
                  {suggestions.map(item => (
                    <button
                      key={item.ticker}
                      type="button"
                      onMouseDown={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-900/50 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-white block">{item.ticker}</span>
                        <span className="text-[10px] text-slate-500 font-light truncate block max-w-[150px]">{item.name}</span>
                      </div>
                      <span className="bg-slate-900 text-[8px] px-1 rounded text-slate-400 uppercase font-bold">{item.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Tipo de Activo</label>
              <select
                disabled={!isBuy || !!initialTicker}
                value={instrumentType}
                onChange={(e) => setInstrumentType(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-teal disabled:opacity-60"
              >
                <option value="cedear">CEDEAR</option>
                <option value="accion">Acción Ar.</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Nombre</label>
            <input
              type="text"
              disabled={!!initialTicker}
              placeholder="Descripción del instrumento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-teal disabled:opacity-60"
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

          {/* Pricing badges */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-light">Precio Unitario</span>
              {fetchingPrice ? (
                <span className="text-[10px] text-accent-teal animate-pulse">Obteniendo...</span>
              ) : (
                <PriceBadge price={livePrice} currency={instrumentType === 'crypto' ? 'USD' : 'ARS'} isFresh={true} />
              )}
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-900/50 pt-2">
              <span className="text-slate-400 font-light">
                {isBuy ? 'Efectivo Disponible' : 'Posición Disponible'}
              </span>
              <span className="font-mono text-white font-bold">
                {isBuy ? `$${availableCash.toLocaleString('es-AR')}` : `${availableQty} unidades`}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-900/50 pt-2">
              <span className="text-slate-400 font-light">Comisión Simulada (0.5%)</span>
              <span className="font-mono text-slate-300 font-medium">
                ${(totalCost * 0.005).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-900/50 pt-2">
              <span className="text-slate-400 font-bold">Total {isBuy ? 'a Pagar' : 'a Acreditar'}</span>
              <span className="font-mono text-white font-black text-sm">
                ${(isBuy ? totalCost * 1.005 : totalCost * 0.995).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Error notifications */}
            {qtyNum > 0 && totalCost < 1000 && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] p-2.5 rounded-xl text-center leading-normal">
                ⚠️ <strong>Monto mínimo de operación: $1.000</strong>
              </div>
            )}
            {qtyNum > 0 && instrumentType === 'caucion' && totalCost < 10000 && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] p-2.5 rounded-xl text-center leading-normal">
                ⚠️ <strong>Monto mínimo para cauciones: $10.000 ARS</strong>
              </div>
            )}
            {qtyNum > 0 && ['cedear', 'accion', 'on', 'otro'].includes(instrumentType) && qtyNum < 1 && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] p-2.5 rounded-xl text-center leading-normal">
                ⚠️ <strong>Cantidad mínima para CEDEARs/Acciones: 1 unidad</strong>
              </div>
            )}
            {qtyNum > 0 && instrumentType === 'crypto' && qtyNum < 0.001 && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] p-2.5 rounded-xl text-center leading-normal">
                ⚠️ <strong>Cantidad mínima para Crypto: 0.001 unidades</strong>
              </div>
            )}
            {isBuy && isInsufficientFunds && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] p-2.5 rounded-xl text-center leading-normal">
                ⚠️ <strong>Saldo virtual insuficiente</strong> para completar la operación (incluye comisión).
              </div>
            )}
            {!isBuy && isInsufficientQuantity && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] p-2.5 rounded-xl text-center leading-normal">
                ⚠️ <strong>Cantidad insuficiente</strong> en cartera virtual para vender.
              </div>
            )}
          </div>

          {/* Submitting buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-900 hover:bg-slate-900/40 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || isInsufficientFunds || isInsufficientQuantity || isInvalidQty}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                isBuy
                  ? 'bg-accent-teal text-slate-950 hover:bg-accent-teal/90 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {submitting ? 'Operando...' : isBuy ? 'Confirmar Compra' : 'Confirmar Venta'}
            </button>
          </div>

        </form>

        {/* Disclaimer footer */}
        <div className="text-center text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none">
          ⚠️ SIMULADOR: Dinero 100% ficticio
        </div>

      </div>
    </div>
  )
}

export default TradeModal
