/**
 * INVERTITE — Mapa de fuentes de datos de mercado por instrumento
 * 
 * Estado de fuentes (2026-06):
 *  - dolarito.ar: primaria para USD (403 intermitente, fallback a bluelytics)
 *  - bluelytics.com.ar: fallback para USD ✅
 *  - cedears.info: INACTIVA — DNS no resuelve (ENOTFOUND)
 *  - iol.com.ar / rava.com: scraping para acciones/CEDEARs
 *  - api.bcra.gob.ar v2: DEPRECADA (410) → v3 disponible
 *  - coingecko: requiere API key de pago para ARS → usar Binance como primaria
 */
module.exports = {
  dolar: {
    primary: {
      name: 'bluelytics',
      url: 'https://api.bluelytics.com.ar/v2/latest',
      parser: 'parseBluelytics'
    },
    fallback: {
      name: 'dolarapi',
      url: 'https://dolarapi.com/v1/dolares',
      parser: 'parseDolarApi'
    }
  },

  cedear: {
    primary: {
      name: 'rava_cedear',
      url: 'https://www.rava.com/perfil/{ticker}',
      parser: 'parseRava',
      method: 'scraping'
    },
    fallback: {
      name: 'hardcoded',
      value: null // Usar último valor conocido en Redis
    }
  },

  accion: {
    primary: {
      name: 'rava_accion',
      url: 'https://www.rava.com/perfil/{ticker}',
      parser: 'parseRava',
      method: 'scraping'
    },
    fallback: {
      name: 'hardcoded',
      value: null
    }
  },

  fci: {
    primary: {
      name: 'cafci',
      url: 'https://api.cafci.org.ar/fondo',
      parser: 'parseCafci',
      ttl: 86400 // 24 horas — FCIs se actualizan una vez al día
    },
    fallback: null // Si cafci falla, usar caché extendida
  },

  caucion: {
    primary: {
      name: 'bcra_v3',
      // API BCRA v3 — Variables estadísticas (variable 34 = Tasa política monetaria)
      // Variable 27 = Tasa de pases pasivos (más cercana a la caución overnight)
      url: 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/27',
      parser: 'parseBcraV3'
    },
    fallback: {
      name: 'hardcoded',
      value: null // Usar último valor conocido en Redis indefinidamente
    }
  },

  crypto: {
    primary: {
      name: 'binance',
      // Binance no requiere API key para precios spot — devuelve USD
      // Nota: el ticker se mapea en marketDataService (BITCOIN→BTC, etc.)
      url: 'https://api.binance.com/api/v3/ticker/price?symbol={ticker}USDT',
      parser: 'parseBinance'
    },
    fallback: {
      name: 'binance_avg',
      url: 'https://api.binance.com/api/v3/avgPrice?symbol={ticker}USDT',
      parser: 'parseBinanceAvg'
    }
  },

  merval: {
    primary: {
      name: 'byma_merval',
      // BYMA — API pública de índices
      url: 'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/index-portfolio?index=MERVAL',
      parser: 'parseMervalByma'
    },
    fallback: {
      name: 'hardcoded',
      value: null
    }
  }
};
