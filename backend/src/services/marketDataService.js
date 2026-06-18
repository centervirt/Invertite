/**
 * INVERTITE — Servicio Unificado de Datos de Mercado
 * Implementa consultas de múltiples fuentes con fallback automático, doble caché (Redis)
 * y registro de estado de salud (PostgreSQL).
 */
const redis = require('../config/redis');
const sources = require('../config/marketSources');
const parsers = require('./marketParsers');
const axios = require('axios');
const { query, queryOne, queryAll } = require('../config/database');

const DEFAULT_TTL = 300; // 5 minutos
const EXTENDED_TTL = 3600; // 1 hora para fallback
const STALE_TTL = 86400; // 24 horas máximo para precio diferido

/**
 * Registra la salud de las fuentes de datos en la DB
 */
async function recordSourceHealth(sourceName, success) {
  try {
    if (success) {
      await query(`
        INSERT INTO source_health (source_name, last_success, consecutive_failures, is_healthy, updated_at)
        VALUES ($1, NOW(), 0, true, NOW())
        ON CONFLICT (source_name) DO UPDATE SET
          last_success = NOW(),
          consecutive_failures = 0,
          is_healthy = true,
          updated_at = NOW()
      `, [sourceName]);
    } else {
      await query(`
        INSERT INTO source_health (source_name, last_failure, consecutive_failures, is_healthy, updated_at)
        VALUES ($1, NOW(), 1, true, NOW())
        ON CONFLICT (source_name) DO UPDATE SET
          last_failure = NOW(),
          consecutive_failures = source_health.consecutive_failures + 1,
          is_healthy = (source_health.consecutive_failures + 1 < 3),
          updated_at = NOW()
      `, [sourceName]);
    }
  } catch (err) {
    console.error(`[MarketDataService] Error actualizando salud de ${sourceName}:`, err.message);
  }
}

/**
 * Obtener precio de un instrumento con fallback automático
 */
async function getPrice(ticker, type) {
  const formattedTicker = ticker.toUpperCase().trim();
  let formattedType = type.toLowerCase().trim();
  
  if (['mep', 'ccl', 'blue', 'oficial'].includes(formattedType)) {
    formattedType = 'dolar';
  }

  const cacheKey = `price:${formattedType}:${formattedTicker}`;
  const metaKey  = `price_meta:${formattedType}:${formattedTicker}`;


  // 1. Intentar caché Redis
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const meta = await redis.get(metaKey);
      const parsedMeta = meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : {};
      const timestamp = parsedMeta.timestamp || Date.now();
      const minutesOld = Math.floor((Date.now() - timestamp) / 60000);
      
      const parsedCached = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return {
        ...parsedCached,
        isFresh: minutesOld < 5,
        isStale: minutesOld >= 5 && minutesOld < 60,
        isVeryStale: minutesOld >= 60,
        minutesOld,
        fromCache: true
      };
    }
  } catch (err) {
    console.error('Redis error en getPrice:', err.message);
  }

  // 2. Intentar fuente primaria
  const sourceConfig = sources[formattedType];
  if (!sourceConfig) {
    return createErrorPrice(formattedTicker, formattedType, 'Tipo de instrumento no soportado');
  }

  const primaryResult = await fetchFromSource(sourceConfig.primary, formattedTicker, formattedType);

  if (primaryResult.success) {
    await recordSourceHealth(sourceConfig.primary.name, true);
    await cachePrice(cacheKey, metaKey, primaryResult.data, sourceConfig.primary.ttl || DEFAULT_TTL);
    return {
      ...primaryResult.data,
      isFresh: true, 
      isStale: false, 
      isVeryStale: false,
      minutesOld: 0, 
      fromCache: false
    };
  }

  // 3. Intentar fuente fallback
  await recordSourceHealth(sourceConfig.primary.name, false);
  console.warn(`[MarketDataService] Fuente primaria falló para ${formattedTicker} (${formattedType}):`, primaryResult.error);

  if (sourceConfig.fallback) {
    if (sourceConfig.fallback.name === 'hardcoded') {
      // Usar último valor conocido en Redis
      const cachedStale = await getStalePrice(formattedTicker, formattedType);
      if (cachedStale) {
        return cachedStale;
      }
    } else {
      const fallbackResult = await fetchFromSource(sourceConfig.fallback, formattedTicker, formattedType);

      if (fallbackResult.success) {
        await recordSourceHealth(sourceConfig.fallback.name, true);
        const dataWithMeta = {
          ...fallbackResult.data,
          source: sourceConfig.fallback.name + '_fallback'
        };
        await cachePrice(cacheKey, metaKey, dataWithMeta, EXTENDED_TTL);
        return {
          ...dataWithMeta,
          isFresh: false, 
          isStale: true, 
          isVeryStale: false,
          minutesOld: 0, 
          fromCache: false
        };
      } else {
        await recordSourceHealth(sourceConfig.fallback.name, false);
      }
    }
  }

  // 4. Intentar caché extendida (precio diferido)
  const cachedStale = await getStalePrice(formattedTicker, formattedType);
  if (cachedStale) {
    return cachedStale;
  }

  // 5. Todo falló
  return createErrorPrice(formattedTicker, formattedType, 'Sin datos disponibles');
}

/**
 * Obtener precio expirado (stale) de la caché
 */
async function getStalePrice(ticker, type) {
  try {
    const staleKey = `price_stale:${type}:${ticker}`;
    const stale = await redis.get(staleKey);
    if (stale) {
      const parsed = typeof stale === 'string' ? JSON.parse(stale) : stale;
      const timestamp = parsed.timestamp || Date.now();
      const minutesOld = Math.floor((Date.now() - timestamp) / 60000);
      return {
        ...parsed,
        isFresh: false, 
        isStale: false, 
        isVeryStale: true,
        minutesOld, 
        fromCache: true,
        source: parsed.source ? (parsed.source.includes('stale') ? parsed.source : parsed.source + '_stale') : 'stale_cache'
      };
    }
  } catch (err) {
    console.error('Error leyendo stale cache:', err.message);
  }
  return null;
}

/**
 * Obtener múltiples precios en batch
 */
async function getPrices(instruments) {
  if (!instruments || instruments.length === 0) return {};

  const normalized = instruments.map(inst => {
    if (typeof inst === 'string') {
      let type = 'cedear';
      const upper = inst.toUpperCase();
      if (['MEP', 'CCL', 'BLUE', 'OFICIAL'].includes(upper)) type = 'dolar';
      if (upper === 'CAUCION') type = 'caucion';
      return { ticker: upper, type };
    }
    let type = (inst.type || inst.instrument_type || 'cedear').toLowerCase();
    if (['mep', 'ccl', 'blue', 'oficial'].includes(type)) {
      type = 'dolar';
    }
    return { 
      ticker: inst.ticker.toUpperCase(), 
      type 
    };
  });


  const results = await Promise.allSettled(
    normalized.map(({ ticker, type }) => getPrice(ticker, type))
  );

  return normalized.reduce((acc, { ticker, type }, i) => {
    const result = results[i];
    const val = result.status === 'fulfilled'
      ? result.value
      : createErrorPrice(ticker, type, result.reason?.message);
    
    // Guardamos con prefijo y sin prefijo para compatibilidad total
    acc[`${type}:${ticker}`] = val;
    acc[ticker] = val;
    return acc;
  }, {});
}

/**
 * Guardar precio en Redis con doble clave (normal con TTL y stale persistente)
 */
async function cachePrice(cacheKey, metaKey, data, ttl) {
  const withTimestamp = { ...data, timestamp: Date.now() };
  const staleKey = cacheKey.replace('price:', 'price_stale:');
  
  try {
    await Promise.all([
      redis.set(cacheKey, withTimestamp, ttl),
      redis.set(metaKey, { timestamp: Date.now() }),
      redis.set(staleKey, withTimestamp)
    ]);
  } catch (err) {
    console.error('[MarketDataService] Error escribiendo en Redis:', err.message);
  }
}

/**
 * Llamar a una fuente de datos
 */
async function fetchFromSource(source, ticker, type) {
  try {
    if (source.method === 'scraping') {
      return await fetchByScraping(source, ticker, type);
    }
    
    if (!source.url) {
      return { success: false, error: 'URL de fuente no configurada' };
    }

    // Mapeo de tickers crypto a símbolos de Binance
    const cryptoSymbolMap = {
      BITCOIN: 'BTC', ETHEREUM: 'ETH',
      LITECOIN: 'LTC', RIPPLE: 'XRP', CARDANO: 'ADA',
      SOLANA: 'SOL', POLKADOT: 'DOT', CHAINLINK: 'LINK',
      BTC: 'BTC', ETH: 'ETH', LTC: 'LTC', XRP: 'XRP',
      SOL: 'SOL', ADA: 'ADA', DOT: 'DOT', LINK: 'LINK'
    };
    // TETHER es una stablecoin USD — no tiene sentido pedir USDTUSDT en Binance
    // Lo manejamos como un caso especial con precio fijo en USD
    if (ticker.toUpperCase() === 'TETHER' || ticker.toUpperCase() === 'USDT') {
      const usdtRate = await redis.get('price:dolar:mep').catch(() => null);
      const mepPrice = usdtRate ? (typeof usdtRate === 'string' ? JSON.parse(usdtRate) : usdtRate)?.price || 1400 : 1400;
      return { success: true, data: { price: Math.round(mepPrice), currency: 'ARS', ticker, source: 'hardcoded_stablecoin', note: 'USDT ≈ 1 USD' } };
    }

    let resolvedTicker = ticker;
    if (type === 'crypto') {
      resolvedTicker = cryptoSymbolMap[ticker.toUpperCase()] || ticker.toUpperCase();
    }

    const url = source.url
      .replace('{ticker}', resolvedTicker)
      .replace('{hoy}', new Date().toISOString().split('T')[0]);

    const axiosConfig = {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Invertite/1.0)',
        'Accept': 'application/json'
      }
    };

    // BCRA y BYMA APIs necesitan manejo de SSL permisivo en algunos entornos locales
    if (url.includes('bcra.gob.ar') || url.includes('bymadata.com.ar')) {
      const https = require('https');
      axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    const response = await axios.get(url, axiosConfig);

    const parser = parsers[source.parser];
    if (!parser) throw new Error(`Parser ${source.parser} no encontrado`);

    const parsed = parser(response.data, ticker);
    if (!parsed || parsed.price === null || parsed.price === undefined) {
      throw new Error('Parser no devolvió precio');
    }

    // Si la moneda es USD y el tipo es crypto, convertir a ARS
    if (parsed.currency === 'USD' && type === 'crypto') {
      let usdRate = 1400; // Valor por defecto razonable 2026
      try {
        // Intentar obtener MEP de caché
        const mepCache = await redis.get('price:dolar:mep');
        if (mepCache) {
          const parsedMep = typeof mepCache === 'string' ? JSON.parse(mepCache) : mepCache;
          if (parsedMep.price && parsedMep.price > 100) usdRate = parsedMep.price;
        } else {
          // Intentar con blue
          const blueCache = await redis.get('price:dolar:blue');
          if (blueCache) {
            const parsedBlue = typeof blueCache === 'string' ? JSON.parse(blueCache) : blueCache;
            if (parsedBlue.price && parsedBlue.price > 100) usdRate = parsedBlue.price;
          }
        }
      } catch (_) {}
      parsed.price = Math.round(parsed.price * usdRate);
      parsed.currency = 'ARS';
      parsed.convertedFromUSD = true;
      parsed.usdRate = usdRate;
    }

    return { success: true, data: { ...parsed, source: source.name } };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function fetchByScraping(source, ticker, type) {
  try {
    const cheerio = require('cheerio');
    const url = source.url.replace('{ticker}', ticker);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'es-AR,es;q=0.9'
      }
    });

    const $ = cheerio.load(response.data);
    const parser = parsers[source.parser];
    if (!parser) throw new Error(`Parser ${source.parser} no encontrado`);

    const parsed = parser($, ticker);
    if (!parsed || parsed.price === null || parsed.price === undefined) {
      throw new Error('Scraping no encontró precio');
    }

    return { success: true, data: { ...parsed, source: source.name } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function createErrorPrice(ticker, type, message) {
  return {
    ticker, 
    type, 
    price: null, 
    currency: null,
    source: 'error', 
    error: message,
    isFresh: false, 
    isStale: false, 
    isVeryStale: false,
    minutesOld: null, 
    fromCache: false
  };
}

/**
 * Generar snapshot diario de la cartera del usuario
 */
async function takePortfolioSnapshot(portfolioId) {
  try {
    const portfolio = await queryOne('SELECT id, user_id FROM portfolios WHERE id = $1', [portfolioId]);
    if (!portfolio) return null;

    const positions = await queryAll(`
      SELECT instrument_type, ticker, quantity, avg_buy_price, currency 
      FROM portfolio_positions 
      WHERE portfolio_id = $1
    `, [portfolioId]);

    if (positions.length === 0) {
      await query(`
        INSERT INTO portfolio_snapshots (portfolio_id, snapshot_date, total_ars, total_usd, positions_json)
        VALUES ($1, CURRENT_DATE, 0, 0, '[]'::jsonb)
        ON CONFLICT (portfolio_id, snapshot_date) 
        DO UPDATE SET total_ars = 0, total_usd = 0, positions_json = '[]'::jsonb, created_at = NOW()
      `, [portfolioId]);
      return;
    }

    const tickers = positions.map(p => ({ ticker: p.ticker, type: p.instrument_type }));
    const prices = await getPrices(tickers);
    
    const mepPriceData = await getPrice('MEP', 'dolar');
    const mepRate = mepPriceData && mepPriceData.price ? parseFloat(mepPriceData.price) : 1250;

    let totalArs = 0;
    let totalUsd = 0;

    const positionsWithValues = positions.map(pos => {
      const tickerUpper = pos.ticker.toUpperCase();
      const priceInfo = prices[tickerUpper];
      const priceCurrent = priceInfo && priceInfo.price ? parseFloat(priceInfo.price) : 1000;
      const currentCurrency = priceInfo && priceInfo.currency ? priceInfo.currency : 'ARS';

      const qty = parseFloat(pos.quantity);
      const value = qty * priceCurrent;

      let valArs = 0;
      let valUsd = 0;

      if (currentCurrency === 'ARS') {
        valArs = value;
        valUsd = value / mepRate;
      } else {
        valUsd = value;
        valArs = value * mepRate;
      }

      totalArs += valArs;
      totalUsd += valUsd;

      return {
        ticker: pos.ticker,
        instrument_type: pos.instrument_type,
        quantity: pos.quantity,
        avg_buy_price: pos.avg_buy_price,
        currency: pos.currency,
        price_current: priceCurrent,
        value_ars: valArs,
        value_usd: valUsd
      };
    });

    await query(`
      INSERT INTO portfolio_snapshots (portfolio_id, snapshot_date, total_ars, total_usd, positions_json)
      VALUES ($1, CURRENT_DATE, $2, $3, $4::jsonb)
      ON CONFLICT (portfolio_id, snapshot_date)
      DO UPDATE SET 
        total_ars = EXCLUDED.total_ars,
        total_usd = EXCLUDED.total_usd,
        positions_json = EXCLUDED.positions_json,
        created_at = NOW()
    `, [portfolioId, totalArs, totalUsd, JSON.stringify(positionsWithValues)]);

    console.log(`[MarketDataService] Snapshot guardado para cartera ${portfolioId}: ARS ${totalArs.toFixed(2)} | USD ${totalUsd.toFixed(2)}`);
  } catch (err) {
    console.error(`[MarketDataService] Error al generar snapshot para cartera ${portfolioId}:`, err.message);
  }
}

module.exports = { 
  getPrice, 
  getPrices,
  takePortfolioSnapshot
};
