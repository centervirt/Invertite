import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const MarketDataContext = createContext(null)

export const MarketDataProvider = ({ children }) => {
  const [dolar, setDolar] = useState(null)
  const [caucion, setCaucion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchGlobalMarketData = async () => {
    try {
      const [dolarRes, caucionRes] = await Promise.all([
        api.get('/market/dolar'),
        api.get('/market/caucion')
      ])

      setDolar(dolarRes.data.data)
      setCaucion(caucionRes.data.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[MarketDataProvider] Error al cargar datos globales de mercado:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const getPrice = async (ticker, type) => {
    try {
      const { data } = await api.get(`/market/price/${type}/${ticker}`)
      return data.data
    } catch (err) {
      console.error(`[MarketDataProvider] Error al consultar precio de ${ticker}:`, err.message)
      return {
        ticker,
        type,
        price: null,
        currency: null,
        source: 'error',
        error: err.message,
        isFresh: false,
        isStale: false,
        isVeryStale: false,
        minutesOld: null,
        fromCache: false
      }
    }
  }

  useEffect(() => {
    fetchGlobalMarketData()

    // Polling cada 5 minutos (300.000 ms)
    const interval = setInterval(fetchGlobalMarketData, 300000)

    return () => clearInterval(interval)
  }, [])

  return (
    <MarketDataContext.Provider value={{ dolar, caucion, getPrice, loading, lastUpdated, refresh: fetchGlobalMarketData }}>
      {children}
    </MarketDataContext.Provider>
  )
}

export const useMarketData = () => {
  const context = useContext(MarketDataContext)
  if (!context) {
    throw new Error('useMarketData debe utilizarse dentro de un MarketDataProvider')
  }
  return context
}
