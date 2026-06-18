/**
 * INVERTITE — Precalentamiento de Caché de Mercado
 * Precarga las cotizaciones más utilizadas en Redis cada 4 minutos para respuestas instantáneas.
 */
const marketDataService = require('./marketDataService');

async function warmCache() {
  console.log('🔥 [CacheWarmer] Iniciando precalentamiento de la caché de mercado...');
  
  const dolarTickers = ['mep', 'ccl', 'blue', 'oficial'];
  const cedearTickers = ['SPY', 'QQQ', 'AAPL', 'GOOGL', 'AMZN', 'MELI', 'BRKB', 'MSFT', 'TSLA', 'NVDA'];
  const accionTickers = ['YPFD', 'GGAL', 'BMA', 'PAMP', 'TXAR'];
  const cryptoTickers = ['bitcoin', 'ethereum', 'tether'];
  
  try {
    // 1. Dólares
    for (const ticker of dolarTickers) {
      await marketDataService.getPrice(ticker, 'dolar');
    }
    
    // 2. Caución
    await marketDataService.getPrice('CAUCION', 'caucion');
    
    // 3. CEDEARs
    for (const ticker of cedearTickers) {
      await marketDataService.getPrice(ticker, 'cedear');
    }
    
    // 4. Acciones
    for (const ticker of accionTickers) {
      await marketDataService.getPrice(ticker, 'accion');
    }
    
    // 5. Cryptos
    for (const ticker of cryptoTickers) {
      await marketDataService.getPrice(ticker, 'crypto');
    }
    
    // 6. Merval Index
    await marketDataService.getPrice('MERVAL', 'merval');
    
    console.log('✅ [CacheWarmer] Caché de mercado precalentada exitosamente.');
  } catch (err) {
    console.error('❌ [CacheWarmer] Error durante el precalentamiento de caché:', err.message);
  }
}

module.exports = { warmCache };
