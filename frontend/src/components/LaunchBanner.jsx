import React, { useState, useEffect } from 'react'
import api from '../services/api'

const LaunchBanner = () => {
  const [status, setStatus] = useState(null)

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/launch/status')
      setStatus(data.data)
    } catch (err) {
      console.error('Error al cargar banner de lanzamiento:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!status || !status.launchActive) return null

  const { remaining, totalSubscribers, launchLimit, percentageUsed } = status

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 bg-[#0B0F1A] border border-[#00C9A7]/40 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-6 shadow-xl relative overflow-hidden select-none">
      
      {/* Glow effect */}
      <div className="absolute -inset-y-10 -left-10 w-40 bg-[#00C9A7]/5 blur-3xl pointer-events-none rounded-full"></div>

      <div className="flex items-start space-x-3.5 relative z-10">
        <span className="text-2xl mt-0.5 animate-pulse">🔥</span>
        <div>
          <h4 className="text-sm font-extrabold tracking-tight text-white flex items-center">
            Precio de Lanzamiento 
            <span className="ml-2 bg-[#00C9A7]/10 text-[#00C9A7] text-[9px] px-2 py-0.5 rounded-full border border-[#00C9A7]/20 font-bold uppercase tracking-wider">
              Plazas Limitadas
            </span>
          </h4>
          <p className="text-xs text-slate-400 font-light mt-1">
            Quedan <strong className="text-white font-bold">{remaining} lugares</strong> al precio especial.
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-1.5 w-full sm:w-56 relative z-10">
        <div className="flex justify-between text-[10px] text-slate-500 font-bold tracking-wider uppercase">
          <span>Progreso</span>
          <span className="text-white">{totalSubscribers} / {launchLimit} cupos</span>
        </div>
        <div className="h-2 w-full bg-[#1A2235] rounded-full overflow-hidden border border-slate-900">
          <div 
            className="h-full bg-[#00C9A7] rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${percentageUsed}%` }}
          ></div>
        </div>
      </div>

    </div>
  )
}

export default LaunchBanner
