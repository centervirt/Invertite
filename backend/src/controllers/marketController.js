/**
 * INVERTITE — Controlador de Datos de Mercado
 */
const marketDataService = require('../services/marketDataService');
const redis = require('../config/redis');
const { successResponse, errorResponse } = require('../utils/helpers');

const MarketController = {
  /**
   * GET /api/v1/market/price/:type/:ticker
   */
  async getPrice(req, res, next) {
    try {
      const { type, ticker } = req.params;
      if (!type || !ticker) {
        return res.status(400).json(errorResponse('Tipo e instrumento son requeridos.'));
      }
      
      const priceData = await marketDataService.getPrice(ticker, type);
      return res.json(successResponse(priceData, 'Precio obtenido correctamente.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/market/prices
   */
  async getPrices(req, res, next) {
    try {
      const { instruments } = req.body;
      if (!Array.isArray(instruments)) {
        return res.status(400).json(errorResponse('instruments debe ser un array.'));
      }
      if (instruments.length > 20) {
        return res.status(400).json(errorResponse('Límite excedido: Máximo de 20 instrumentos por consulta.'));
      }

      const prices = await marketDataService.getPrices(instruments);
      return res.json(successResponse(prices, 'Precios en lote obtenidos.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/market/dolar (Ruta Pública)
   */
  async getDolar(req, res, next) {
    try {
      const cacheKey = 'market:dolar_grouped';
      
      // Intentar caché Redis
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return res.json(successResponse(parsed, 'Cotizaciones de dólar (desde caché).'));
      }

      // Consultar MEP, CCL, Blue y Oficial
      const [mep, ccl, blue, oficial] = await Promise.all([
        marketDataService.getPrice('MEP', 'dolar'),
        marketDataService.getPrice('CCL', 'dolar'),
        marketDataService.getPrice('BLUE', 'dolar'),
        marketDataService.getPrice('OFICIAL', 'dolar')
      ]);

      const data = { mep, ccl, blue, oficial };
      
      // Cachear por 5 minutos (300s)
      await redis.set(cacheKey, data, 300);

      return res.json(successResponse(data, 'Cotizaciones de dólar obtenidas.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/market/caucion (Ruta Pública)
   */
  async getCaucion(req, res, next) {
    try {
      const cacheKey = 'market:caucion_rate';
      
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return res.json(successResponse(parsed, 'Tasa de caución (desde caché).'));
      }

      const caucionData = await marketDataService.getPrice('CAUCION', 'caucion');
      
      const data = {
        tna: caucionData && caucionData.price ? parseFloat(caucionData.price) : 38.5,
        source: caucionData ? caucionData.source : 'bcra_fallback',
        isFresh: caucionData ? caucionData.isFresh : false,
        timestamp: caucionData ? caucionData.timestamp : Date.now()
      };

      // Cachear por 1 hora (3600s)
      await redis.set(cacheKey, data, 3600);

      return res.json(successResponse(data, 'Tasa de caución obtenida.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/market/chart-data/:dataKey
   */
  async getChartData(req, res, next) {
    try {
      const { dataKey } = req.params;
      const cacheKey = `market:chart:${dataKey}`;

      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return res.json(successResponse(parsed, 'Histórico obtenido (desde caché).'));
      }

      let chartData = { labels: [], datasets: [] };

      // Datos mock dinámicos / históricos para graficar en frontend
      if (dataKey === 'inflacion_vs_plazo_fijo') {
        chartData = {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Inflación Mensual (%)',
              data: [20.6, 13.2, 11.0, 8.8, 4.2, 4.6],
              borderColor: '#EC4899',
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              tension: 0.3
            },
            {
              label: 'Tasa Plazo Fijo (%)',
              data: [9.1, 9.1, 5.8, 4.2, 3.3, 3.3],
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.3
            }
          ]
        };
      } else if (dataKey === 'tipos_dolar') {
        chartData = {
          labels: ['Día 1', 'Día 5', 'Día 10', 'Día 15', 'Día 20', 'Día 25', 'Día 30'],
          datasets: [
            {
              label: 'Dólar MEP',
              data: [1220, 1230, 1240, 1245, 1242, 1250, 1248],
              borderColor: '#00C9A7',
              backgroundColor: 'rgba(0, 201, 167, 0.05)',
              tension: 0.2
            },
            {
              label: 'Dólar CCL',
              data: [1260, 1270, 1285, 1288, 1282, 1290, 1284],
              borderColor: '#8B5CF6',
              backgroundColor: 'rgba(139, 92, 246, 0.05)',
              tension: 0.2
            },
            {
              label: 'Dólar Blue',
              data: [1230, 1245, 1270, 1290, 1285, 1310, 1305],
              borderColor: '#F59E0B',
              backgroundColor: 'rgba(245, 158, 11, 0.05)',
              tension: 0.2
            }
          ]
        };
      } else if (dataKey === 'cedears_performance') {
        chartData = {
          labels: ['QQQ', 'SPY', 'AAPL', 'MSFT', 'NVDA'],
          datasets: [
            {
              label: 'Rendimiento Anual (%)',
              data: [42.1, 26.4, 21.8, 18.5, 154.2],
              backgroundColor: ['#00C9A7', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B']
            }
          ]
        };
      } else if (dataKey === 'caucion_vs_pf') {
        chartData = {
          labels: ['1 día', '7 días', '14 días', '30 días'],
          datasets: [
            {
              label: 'Caución TNA (%)',
              data: [34.5, 35.2, 35.8, 36.5],
              borderColor: '#00C9A7',
              backgroundColor: 'rgba(0, 201, 167, 0.1)',
              tension: 0.3
            },
            {
              label: 'Plazo Fijo TNA (%)',
              data: [0, 0, 0, 40.0],
              borderColor: '#F59E0B',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              tension: 0.3
            }
          ]
        };
      }

      // Cachear por 1 hora (3600s)
      await redis.set(cacheKey, chartData, 3600);

      return res.json(successResponse(chartData, 'Datos históricos de mercado obtenidos.'));
    } catch (err) {
      next(err);
    }
  }
};

module.exports = MarketController;
