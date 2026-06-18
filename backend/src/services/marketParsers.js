/**
 * INVERTITE — Parsers de Fuentes de Mercado
 * Convierte respuestas crudas (JSON o HTML Cheerio) a formato estandarizado.
 */

const parseDolarito = (data, ticker) => {
  try {
    const keyMap = {
      mep: ['Bolsa', 'bolsa', 'mep', 'MEP'],
      ccl: ['ContadoConLiqui', 'contadoConLiqui', 'ccl', 'CCL'],
      blue: ['Informal', 'informal', 'blue', 'BLUE'],
      oficial: ['Oficial', 'oficial', 'oficial_bna']
    };
    
    const possibleKeys = keyMap[ticker.toLowerCase()] || [ticker];
    for (const key of possibleKeys) {
      if (data[key]) {
        const val = data[key].value_sell || data[key].price || data[key].venta;
        if (val) {
          const parsedVal = parseFloat(String(val).replace(/\./g, '').replace(',', '.').trim());
          if (!isNaN(parsedVal)) {
            return { price: parsedVal, currency: 'ARS', ticker };
          }
        }
      }
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseBluelytics = (data, ticker) => {
  try {
    const t = ticker.toLowerCase();
    if (t === 'blue' && data.blue) {
      return { price: parseFloat(data.blue.value_sell), currency: 'ARS', ticker };
    }
    if (t === 'oficial' && data.oficial) {
      return { price: parseFloat(data.oficial.value_sell), currency: 'ARS', ticker };
    }
    if ((t === 'mep' || t === 'ccl') && data.blue && data.oficial) {
      const estimate = parseFloat(data.blue.value_sell) * 0.97;
      return { price: Math.round(estimate), currency: 'ARS', ticker };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseCedearsInfo = ($, ticker) => {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    let price = null;
    let variacion = null;
    
    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length > 0) {
        const symbol = ($(cells[0]).text() || $(cells[1]).text() || '').trim().toUpperCase();
        if (symbol === tickerUpper || symbol.startsWith(tickerUpper + ' ') || symbol === tickerUpper + 'C') {
          for (let c = 1; c < cells.length; c++) {
            const text = $(cells[c]).text().trim();
            if (text.includes('$') || /^[0-9.,\s]+$/.test(text.replace('$', '').trim())) {
              const cleanVal = parseFloat(text.replace('$', '').replace(/\./g, '').replace(',', '.').trim());
              if (!isNaN(cleanVal) && cleanVal > 1) {
                price = cleanVal;
                const varText = $(cells[c + 1]).text().trim();
                if (varText.includes('%')) {
                  variacion = varText;
                }
                break;
              }
            }
          }
          if (price) return false;
        }
      }
    });
    
    if (price) {
      return { price, currency: 'ARS', ticker: tickerUpper, extra: { variacion } };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseBolsar = ($, ticker) => {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    let price = null;
    
    $('table tr, .cotizaciones tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length > 0) {
        const symbol = $(cells[0]).text().trim().toUpperCase();
        if (symbol === tickerUpper) {
          cells.each((c, cell) => {
            const text = $(cell).text().trim();
            const cleanVal = parseFloat(text.replace('$', '').replace(/\./g, '').replace(',', '.').trim());
            if (!isNaN(cleanVal) && cleanVal > 0 && c > 0) {
              price = cleanVal;
              return false;
            }
          });
          if (price) return false;
        }
      }
    });
    
    if (price) {
      return { price, currency: 'ARS', ticker: tickerUpper };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseRava = ($, ticker) => {
  try {
    let priceText = $('.ultimo').first().text().trim() || 
                    $('.profile-price').first().text().trim();
                    
    if (!priceText) {
      // Intentar extraer del tag <title> que contiene la cotización (ej: "SPY SPDR S&P 500 $18.790...")
      const titleText = $('title').first().text().trim();
      const titleMatch = titleText.match(/\$\s*([0-9.,]+)/);
      if (titleMatch) {
        priceText = titleMatch[1];
      }
    }

    if (!priceText) {
      // Intentar extraer de meta description
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      const metaMatch = metaDesc.match(/\$\s*([0-9.,]+)/);
      if (metaMatch) {
        priceText = metaMatch[1];
      }
    }
                    
    if (!priceText) {
      const bodyText = $('body').text();
      const match = bodyText.match(/último[\s:]+([0-9.,]+)/i);
      if (match) {
        priceText = match[1];
      }
    }
    
    if (!priceText) return null;

    const price = parseFloat(priceText.replace('$', '').replace(/\./g, '').replace(',', '.').trim());
    if (!isNaN(price) && price > 0) {
      return { price, currency: 'ARS', ticker: ticker.toUpperCase() };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseCafci = (data, ticker) => {
  try {
    if (data && data.data && data.data.info) {
      const price = parseFloat(data.data.info.vcp);
      return { price, currency: 'ARS', ticker, extra: { fecha_vcp: data.data.info.fecha } };
    }
    if (Array.isArray(data)) {
      const fund = data.find(f => f.nombre.toUpperCase().includes(ticker.toUpperCase()) || f.id === ticker);
      if (fund) {
        return { price: parseFloat(fund.vcp), currency: 'ARS', ticker, extra: { fecha_vcp: fund.fecha } };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseBcra = (data, ticker) => {
  try {
    if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
      const latest = data.results[data.results.length - 1];
      return { price: parseFloat(latest.valor), currency: 'ARS', ticker, extra: { tipo: 'tna', fecha: latest.fecha } };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseCoingecko = (data, ticker) => {
  try {
    const key = ticker.toLowerCase();
    if (data && data[key]) {
      return {
        price: parseFloat(data[key].ars),
        priceUsd: parseFloat(data[key].usd),
        currency: 'ARS',
        ticker
      };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseBinance = (data, ticker) => {
  try {
    // Binance /api/v3/ticker/price devuelve { symbol: 'BTCUSDT', price: '...' }
    if (data && data.price) {
      const priceUsd = parseFloat(data.price);
      return {
        price: priceUsd,
        currency: 'USD',
        ticker,
        extra: { priceUsd, convertedFromUSD: true }
      };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseBinanceAvg = (data, ticker) => {
  try {
    // Binance /api/v3/avgPrice devuelve { mins: 5, price: '...' }
    if (data && data.price) {
      const priceUsd = parseFloat(data.price);
      return {
        price: priceUsd,
        currency: 'USD',
        ticker,
        extra: { priceUsd, convertedFromUSD: true }
      };
    }
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Parser para dolarapi.com — devuelve { compra, venta, nombre, ... }
 */
const parseDolarApi = (data, ticker) => {
  try {
    if (data && data.venta) {
      return { price: parseFloat(data.venta), currency: 'ARS', ticker };
    }
    if (Array.isArray(data)) {
      // A veces devuelve array de cotizaciones
      const t = ticker.toLowerCase();
      const item = data.find(d =>
        (d.nombre || '').toLowerCase().includes(t) ||
        (d.casa || '').toLowerCase() === t
      ) || data[0];
      if (item && item.venta) {
        return { price: parseFloat(item.venta), currency: 'ARS', ticker };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Parser para BCRA API v3 — GET /estadisticas/v3.0/monetarias/{idVariable}
 * Devuelve { results: [{ idVariable, cdSerie, fecha, valor }, ...] }
 */
const parseBcraV3 = (data, ticker) => {
  try {
    if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
      // Tomamos el último dato disponible
      const latest = data.results[data.results.length - 1];
      return {
        price: parseFloat(latest.valor),
        currency: 'ARS',
        ticker,
        extra: { tipo: 'tna', fecha: latest.fecha }
      };
    }
    // Algunas variables v3 pueden devolver formato distinto
    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const latest = data.data[data.data.length - 1];
      return {
        price: parseFloat(latest.valor || latest.value),
        currency: 'ARS',
        ticker,
        extra: { tipo: 'tna' }
      };
    }
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Parser para Rava.com — scraping del índice MERVAL
 */
const parseMervalRava = ($, ticker) => {
  try {
    let price = null;
    // Buscamos el valor del MERVAL en la página de índices
    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length > 0) {
        const label = $(cells[0]).text().trim().toUpperCase();
        if (label.includes('MERVAL')) {
          // El precio suele estar en la segunda o tercera columna
          for (let c = 1; c < Math.min(cells.length, 4); c++) {
            const text = $(cells[c]).text().trim().replace(/\./g, '').replace(',', '.');
            const val = parseFloat(text);
            if (!isNaN(val) && val > 100000) { // MERVAL típicamente > 100.000 ARS
              price = val;
              return false;
            }
          }
        }
      }
    });
    // Fallback: buscar cualquier número grande en la página que parezca MERVAL
    if (!price) {
      const bodyText = $('body').text();
      const match = bodyText.match(/MERVAL[\s\S]{0,50}?([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?)/i);
      if (match) {
        const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(val) && val > 1000) price = val;
      }
    }
    if (price) {
      return { price, currency: 'ARS', ticker: 'MERVAL' };
    }
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Parser para BYMA Open Data — API de índice MERVAL
 * GET /vanoms-be-core/rest/api/bymadata/free/index-portfolio?index=MERVAL
 */
const parseMervalByma = (data, ticker) => {
  try {
    // BYMA devuelve { data: [{ closePrice, last, ... }] } o similar
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      const item = data.data[0];
      const price = parseFloat(item.closePrice || item.last || item.trade || item.price);
      if (!isNaN(price) && price > 0) {
        return { price, currency: 'ARS', ticker: 'MERVAL' };
      }
    }
    // Intentar con formato plano
    if (data && (data.closePrice || data.last)) {
      const price = parseFloat(data.closePrice || data.last);
      if (!isNaN(price) && price > 0) {
        return { price, currency: 'ARS', ticker: 'MERVAL' };
      }
    }
    // Intentar con array directo
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const price = parseFloat(item.closePrice || item.last || item.close);
      if (!isNaN(price) && price > 0) {
        return { price, currency: 'ARS', ticker: 'MERVAL' };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseMerval = ($, ticker) => {
  try {
    let valText = $('.merval-value').first().text().trim() || 
                  $('td:contains("MERVAL")').next().text().trim() || 
                  $('.merval').text().trim();
    if (!valText) {
      $('td').each((i, td) => {
        if ($(td).text().toUpperCase().includes('MERVAL')) {
          valText = $(td).next().text().trim();
          return false;
        }
      });
    }
    const price = parseFloat(valText.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(price) && price > 0) {
      return { price, currency: 'ARS', ticker: 'MERVAL' };
    }
    return null;
  } catch (err) {
    return null;
  }
};

const parseAcciones = ($, ticker) => {
  return parseCedearsInfo($, ticker);
};

module.exports = {
  parseDolarito,
  parseBluelytics,
  parseDolarApi,
  parseCedearsInfo,
  parseBolsar,
  parseRava,
  parseCafci,
  parseBcra,
  parseBcraV3,
  parseCoingecko,
  parseBinance,
  parseBinanceAvg,
  parseMerval,
  parseMervalRava,
  parseMervalByma,
  parseAcciones
};
