import React from 'react'

const PriceBadge = ({ price, currency = 'ARS', isFresh, isStale, isVeryStale, minutesOld, source }) => {
  if (price === null || price === undefined) {
    return (
      <div className="flex items-center space-x-2 select-none">
        <span className="font-mono text-slate-500">—</span>
        <span className="text-[10px] text-slate-500">Sin datos</span>
      </div>
    )
  }

  const formattedPrice = parseFloat(price).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const currencySymbol = currency === 'USD' ? 'USDT' : '$'

  if (isFresh) {
    return (
      <div className="flex items-center space-x-2 select-none">
        <span className="font-mono text-white font-semibold">{currencySymbol} {formattedPrice}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
          en vivo
        </span>
      </div>
    )
  }

  if (isStale) {
    return (
      <div className="flex items-center space-x-2 select-none">
        <span className="font-mono text-white/90 font-medium">{currencySymbol} {formattedPrice}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1"></span>
          hace {minutesOld} min
        </span>
      </div>
    )
  }

  if (isVeryStale) {
    return (
      <div className="flex items-center space-x-2 select-none group relative">
        <span className="font-mono text-white/70">{currencySymbol} {formattedPrice}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/10 cursor-help">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1"></span>
          precio diferido
        </span>
        {/* Premium Tooltip */}
        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-50 w-48">
          <div className="bg-slate-950 border border-slate-900 text-[10px] text-slate-350 p-2.5 rounded-xl shadow-2xl leading-normal text-center">
            No pudimos actualizar este precio. Mostramos el último valor conocido. Los precios son orientativos.
          </div>
          <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-900 transform rotate-45 -mt-1"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 select-none">
      <span className="font-mono text-white font-medium">{currencySymbol} {formattedPrice}</span>
    </div>
  )
}

export default PriceBadge
