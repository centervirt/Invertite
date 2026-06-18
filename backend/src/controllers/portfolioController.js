/**
 * INVERTITE — Controlador de Portafolio / Simulador
 */
const { query, queryOne, queryAll } = require('../config/database');
const MarketDataService = require('../services/marketDataService');
const { successResponse, errorResponse } = require('../utils/helpers');

const PortfolioController = {
  /**
   * Obtener cartera del usuario y precios actuales
   */
  async getPortfolio(req, res, next) {
    try {
      const userId = req.user.id;

      // 1. Obtener cartera, si no existe la creamos automáticamente
      let portfolio = await queryOne('SELECT id, name, virtual_balance_ars, virtual_balance_usd FROM portfolios WHERE user_id = $1', [userId]);
      if (!portfolio) {
        portfolio = await queryOne(
          'INSERT INTO portfolios (user_id, name, virtual_balance_ars, virtual_balance_usd) VALUES ($1, $2, 1000000.00, 1000.00) RETURNING id, name, virtual_balance_ars, virtual_balance_usd',
          [userId, 'Mi Cartera']
        );
      }

      const portfolioId = portfolio.id;

      // 2. Obtener posiciones
      const positions = await queryAll(
        `SELECT id, instrument_type, ticker, name, quantity, avg_buy_price, currency, notes 
         FROM portfolio_positions 
         WHERE portfolio_id = $1 
         ORDER BY ticker ASC`,
        [portfolioId]
      );

      // 3. Resolver precios en batch
      const priceTickers = positions.map(p => ({ ticker: p.ticker, instrument_type: p.instrument_type }));
      const prices = await MarketDataService.getPrices(priceTickers);

      // Obtener MEP para conversiones
      const mepData = await MarketDataService.getPrice('MEP', 'mep');
      const mepRate = mepData ? parseFloat(mepData.price) : 1250;

      let totalCarteraArs = 0;
      let totalCarteraUsd = 0;

      const positionsWithCalculations = positions.map(pos => {
        const priceInfo = prices[pos.ticker.toUpperCase()];
        const buyPrice = parseFloat(pos.avg_buy_price) || 0;
        let priceCurrent = priceInfo && priceInfo.price !== null && priceInfo.price !== undefined ? parseFloat(priceInfo.price) : NaN;
        
        if (isNaN(priceCurrent)) {
          priceCurrent = buyPrice;
        }
        
        const currentCurrency = priceInfo && priceInfo.currency ? priceInfo.currency : pos.currency || 'ARS';

        const qty = parseFloat(pos.quantity);

        // Valor actual
        const valorActual = qty * priceCurrent;

        // Ganancia en la moneda nativa del activo
        const ganancia = valorActual - (qty * buyPrice);
        const gananciaPct = buyPrice > 0 ? ((priceCurrent - buyPrice) / buyPrice) * 100 : 0;

        let valArs = 0;
        let valUsd = 0;

        if (currentCurrency === 'ARS') {
          valArs = valorActual;
          valUsd = valorActual / mepRate;
        } else {
          valUsd = valorActual;
          valArs = valorActual * mepRate;
        }

        totalCarteraArs += valArs;
        totalCarteraUsd += valUsd;

        return {
          id: pos.id,
          instrument_type: pos.instrument_type,
          ticker: pos.ticker,
          name: pos.name,
          quantity: qty,
          avg_buy_price: buyPrice,
          price_current: priceCurrent,
          currency: pos.currency,
          notes: pos.notes,
          value_current: valorActual,
          value_ars: valArs,
          value_usd: valUsd,
          profit_nominal: ganancia,
          profit_pct: gananciaPct,
          isFresh: priceInfo ? priceInfo.isFresh : false,
          isStale: priceInfo ? priceInfo.isStale : false,
          isVeryStale: priceInfo ? priceInfo.isVeryStale : false,
          minutesOld: priceInfo ? priceInfo.minutesOld : null,
          source: priceInfo ? priceInfo.source : null
        };
      });


      // 4. Calcular rendimiento del mes (comparando con snapshot de hace 30 días aprox)
      // Buscamos el snapshot más cercano a hace 30 días
      const snapshot30DaysAgo = await queryOne(
        `SELECT total_ars 
         FROM portfolio_snapshots 
         WHERE portfolio_id = $1 AND snapshot_date <= CURRENT_DATE - INTERVAL '30 days'
         ORDER BY snapshot_date DESC 
         LIMIT 1`,
        [portfolioId]
      );

      let monthlyReturn = 0;
      if (snapshot30DaysAgo && parseFloat(snapshot30DaysAgo.total_ars) > 0) {
        const oldVal = parseFloat(snapshot30DaysAgo.total_ars);
        monthlyReturn = ((totalCarteraArs - oldVal) / oldVal) * 100;
      }

      return res.json(
        successResponse({
          portfolio,
          positions: positionsWithCalculations,
          totals: {
            total_ars: totalCarteraArs,
            total_usd: totalCarteraUsd,
            mep_rate: mepRate
          },
          monthly_return: monthlyReturn
        }, 'Cartera obtenida correctamente.')
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * Agregar posición a la cartera
   */
  async addPosition(req, res, next) {
    try {
      const userId = req.user.id;
      const { instrument_type, ticker, name, quantity, avg_buy_price, currency, notes } = req.body;

      if (!instrument_type || !ticker || !name || quantity === undefined || avg_buy_price === undefined) {
        return res.status(400).json(errorResponse('Campos requeridos faltantes.'));
      }

      // Validar tipo de activo
      const validTypes = ['cedear','accion','on','fci','caucion','mep','crypto','otro'];
      if (!validTypes.includes(instrument_type.toLowerCase())) {
        return res.status(400).json(errorResponse('Tipo de instrumento inválido.'));
      }

      // 1. Obtener/Crear cartera
      let portfolio = await queryOne('SELECT id, virtual_balance_ars, virtual_balance_usd FROM portfolios WHERE user_id = $1', [userId]);
      if (!portfolio) {
        portfolio = await queryOne(
          'INSERT INTO portfolios (user_id, name, virtual_balance_ars, virtual_balance_usd) VALUES ($1, $2, 1000000.00, 1000.00) RETURNING id, virtual_balance_ars, virtual_balance_usd',
          [userId, 'Mi Cartera']
        );
      }

      const portfolioId = portfolio.id;
      const formattedTicker = ticker.toUpperCase().trim();
      const buyCurrency = currency || 'ARS';
      const cost = quantity * avg_buy_price;

      // Validar saldo virtual suficiente
      if (buyCurrency === 'USD') {
        if (parseFloat(portfolio.virtual_balance_usd) < cost) {
          return res.status(400).json(errorResponse(`Saldo virtual insuficiente. Necesitás USDT ${cost.toFixed(2)} pero tenés USDT ${parseFloat(portfolio.virtual_balance_usd).toFixed(2)}.`));
        }
        await query('UPDATE portfolios SET virtual_balance_usd = virtual_balance_usd - $1 WHERE id = $2', [cost, portfolioId]);
      } else {
        if (parseFloat(portfolio.virtual_balance_ars) < cost) {
          return res.status(400).json(errorResponse(`Saldo virtual insuficiente. Necesitás $ ${cost.toFixed(2)} pero tenés $ ${parseFloat(portfolio.virtual_balance_ars).toFixed(2)}.`));
        }
        await query('UPDATE portfolios SET virtual_balance_ars = virtual_balance_ars - $1 WHERE id = $2', [cost, portfolioId]);
      }

      // 2. Verificar duplicados en la cartera
      const existing = await queryOne(
        'SELECT id FROM portfolio_positions WHERE portfolio_id = $1 AND ticker = $2',
        [portfolioId, formattedTicker]
      );
      if (existing) {
        // Devolver el saldo que restamos antes de abortar
        if (buyCurrency === 'USD') {
          await query('UPDATE portfolios SET virtual_balance_usd = virtual_balance_usd + $1 WHERE id = $2', [cost, portfolioId]);
        } else {
          await query('UPDATE portfolios SET virtual_balance_ars = virtual_balance_ars + $1 WHERE id = $2', [cost, portfolioId]);
        }
        return res.status(409).json(errorResponse(`El ticker ${formattedTicker} ya existe en tu cartera. Modificá la cantidad existente en su lugar.`));
      }

      // 3. Crear posición
      const position = await queryOne(
        `INSERT INTO portfolio_positions (
          portfolio_id, instrument_type, ticker, name, quantity, avg_buy_price, currency, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, instrument_type, ticker, name, quantity, avg_buy_price, currency, notes`,
        [portfolioId, instrument_type.toLowerCase(), formattedTicker, name, quantity, avg_buy_price, buyCurrency, notes || null]
      );

      return res.status(201).json(successResponse({ position }, 'Posición agregada con éxito.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Actualizar posición de la cartera
   */
  async updatePosition(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { quantity, avg_buy_price, notes } = req.body;

      // Verificar pertenencia de la posición al usuario
      const pos = await queryOne(
        `SELECT pp.id 
         FROM portfolio_positions pp
         JOIN portfolios p ON p.id = pp.portfolio_id
         WHERE pp.id = $1 AND p.user_id = $2`,
        [id, userId]
      );

      if (!pos) {
        return res.status(404).json(errorResponse('Posición no encontrada.'));
      }

      const updated = await queryOne(
        `UPDATE portfolio_positions 
         SET quantity = COALESCE($1, quantity),
             avg_buy_price = COALESCE($2, avg_buy_price),
             notes = COALESCE($3, notes),
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, instrument_type, ticker, name, quantity, avg_buy_price, currency, notes`,
        [quantity !== undefined ? quantity : null, avg_buy_price !== undefined ? avg_buy_price : null, notes !== undefined ? notes : null, id]
      );

      return res.json(successResponse({ position: updated }, 'Posición actualizada correctamente.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Eliminar posición de la cartera
   */
  async deletePosition(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Verificar pertenencia y obtener datos para liquidación
      const pos = await queryOne(
        `SELECT pp.id, pp.portfolio_id, pp.instrument_type, pp.ticker, pp.quantity, pp.currency, pp.avg_buy_price
         FROM portfolio_positions pp
         JOIN portfolios p ON p.id = pp.portfolio_id
         WHERE pp.id = $1 AND p.user_id = $2`,
        [id, userId]
      );

      if (!pos) {
        return res.status(404).json(errorResponse('Posición no encontrada.'));
      }

      // Resolver precio de mercado para vender a precio actual
      let priceCurrent = 0;
      try {
        const priceInfo = await MarketDataService.getPrice(pos.ticker, pos.instrument_type);
        priceCurrent = priceInfo && priceInfo.price !== null && priceInfo.price !== undefined ? parseFloat(priceInfo.price) : parseFloat(pos.avg_buy_price) || 0;
      } catch (err) {
        priceCurrent = parseFloat(pos.avg_buy_price) || 0;
      }

      const liquidationValue = parseFloat(pos.quantity) * priceCurrent;

      // Devolver saldo al portafolio (Simular venta)
      if (pos.currency === 'USD') {
        await query('UPDATE portfolios SET virtual_balance_usd = virtual_balance_usd + $1 WHERE id = $2', [liquidationValue, pos.portfolio_id]);
      } else {
        await query('UPDATE portfolios SET virtual_balance_ars = virtual_balance_ars + $1 WHERE id = $2', [liquidationValue, pos.portfolio_id]);
      }

      await query('DELETE FROM portfolio_positions WHERE id = $1', [id]);

      return res.json(successResponse({ deleted: true, returned_cash: liquidationValue }, 'Posición liquidada y eliminada correctamente.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtener historial de evolución de la cartera (últimos 90 días)
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;

      const portfolio = await queryOne('SELECT id FROM portfolios WHERE user_id = $1', [userId]);
      if (!portfolio) {
        return res.json(successResponse({ snapshots: [] }, 'Historial vacío.'));
      }

      const snapshots = await queryAll(
        `SELECT snapshot_date AS date, total_ars, total_usd 
         FROM portfolio_snapshots 
         WHERE portfolio_id = $1 AND snapshot_date >= CURRENT_DATE - INTERVAL '90 days'
         ORDER BY snapshot_date ASC`,
        [portfolio.id]
      );

      return res.json(successResponse({ snapshots }, 'Historial de evolución obtenido.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resetear portafolio (vaciar posiciones y restaurar efectivo)
   */
  async resetPortfolio(req, res, next) {
    try {
      const userId = req.user.id;
      const portfolio = await queryOne('SELECT id FROM portfolios WHERE user_id = $1', [userId]);
      if (portfolio) {
        await query('DELETE FROM portfolio_positions WHERE portfolio_id = $1', [portfolio.id]);
        await query('UPDATE portfolios SET virtual_balance_ars = 1000000.00, virtual_balance_usd = 1000.00 WHERE id = $1', [portfolio.id]);
      }
      return res.json(successResponse(null, 'Portafolio reseteado correctamente.'));
    } catch (err) {
      next(err);
    }
  }
};

module.exports = PortfolioController;
