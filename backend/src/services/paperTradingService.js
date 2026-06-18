/**
 * INVERTITE — Servicio de Simulador de Cartera (Paper Trading)
 */
const { query, queryOne, queryAll, withTransaction } = require('../config/database');
const marketDataService = require('./marketDataService');

/**
 * Genera un código de 4 caracteres alfanuméricos en mayúsculas
 */
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const PaperTradingService = {
  /**
   * Inicializar una cartera virtual para el usuario si no existe
   */
  async initPortfolio(userId) {
    const existing = await queryOne(
      'SELECT * FROM paper_portfolios WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      return existing;
    }

    const displayName = `Inversor_${generateRandomCode()}`;
    const initialCapital = 1000000.00;

    const portfolio = await queryOne(`
      INSERT INTO paper_portfolios (user_id, display_name, initial_capital, cash_balance, total_value, total_return_pct)
      VALUES ($1, $2, $3, $4, $5, 0)
      RETURNING *
    `, [userId, displayName, initialCapital, initialCapital, initialCapital]);

    return portfolio;
  },

  /**
   * Obtener cartera completa con posiciones actualizadas
   */
  async getPortfolio(userId) {
    let portfolio = await queryOne(
      'SELECT * FROM paper_portfolios WHERE user_id = $1',
      [userId]
    );

    if (!portfolio) {
      portfolio = await this.initPortfolio(userId);
    }

    const positions = await queryAll(
      'SELECT * FROM paper_positions WHERE portfolio_id = $1 ORDER BY ticker ASC',
      [portfolio.id]
    );

    let positionsValue = 0;
    const positionsWithPrices = [];

    if (positions.length > 0) {
      const tickersToFetch = positions.map(pos => ({
        ticker: pos.ticker,
        type: pos.instrument_type
      }));
      const prices = await marketDataService.getPrices(tickersToFetch);

      for (const pos of positions) {
        const priceInfo = prices[pos.ticker.toUpperCase()];
        const currentPrice = priceInfo && priceInfo.price ? parseFloat(priceInfo.price) : parseFloat(pos.avg_buy_price);
        const qty = parseFloat(pos.quantity);
        const avgPrice = parseFloat(pos.avg_buy_price);
        
        const currentValue = qty * currentPrice;
        const gainLossArs = currentValue - (qty * avgPrice);
        const gainLossPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

        positionsValue += currentValue;
        positionsWithPrices.push({
          id: pos.id,
          ticker: pos.ticker,
          name: pos.name,
          type: pos.instrument_type,
          quantity: qty,
          avgBuyPrice: avgPrice,
          currentPrice: currentPrice,
          currentValue: currentValue,
          gainLossArs: gainLossArs,
          gainLossPct: parseFloat(gainLossPct.toFixed(2)),
          currency: pos.currency,
          isFresh: priceInfo ? priceInfo.isFresh : false,
          minutesOld: priceInfo ? priceInfo.minutesOld : 0
        });
      }
    }

    const cashBalance = parseFloat(portfolio.cash_balance);
    const initialCapital = parseFloat(portfolio.initial_capital);
    const totalValue = cashBalance + positionsValue;
    const totalReturnArs = totalValue - initialCapital;
    const totalReturnPct = initialCapital > 0 ? ((totalValue - initialCapital) / initialCapital) * 100 : 0;

    await query(`
      UPDATE paper_portfolios 
      SET total_value = $1, total_return_pct = $2, last_calculated_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [totalValue, totalReturnPct, portfolio.id]);

    return {
      id: portfolio.id,
      displayName: portfolio.display_name,
      initialCapital,
      cashBalance,
      positionsValue,
      totalValue,
      totalReturnArs,
      totalReturnPct: parseFloat(totalReturnPct.toFixed(2)),
      resetCount: portfolio.reset_count,
      positions: positionsWithPrices
    };
  },

  /**
   * Ejecutar compra ficticia de un instrumento
   */
  async executeBuy(userId, { ticker, type, name, quantity }) {
    if (!ticker || !type || !name || !quantity || parseFloat(quantity) <= 0) {
      throw new Error('Parámetros de compra inválidos o incompletos.');
    }

    const qty = parseFloat(quantity);
    const tickerUpper = ticker.toUpperCase().trim();
    const instType = type.toLowerCase().trim();

    // Regla 4 — Cantidades mínimas
    if (['cedear', 'accion', 'on', 'otro'].includes(instType) && qty < 1) {
      throw new Error('La cantidad mínima a comprar de CEDEARs y acciones es de 1 unidad.');
    }
    if (instType === 'crypto' && qty < 0.001) {
      throw new Error('La cantidad mínima a comprar de criptomonedas es de 0.001 unidades.');
    }

    // Obtener precio actual de mercado
    const priceInfo = await marketDataService.getPrice(tickerUpper, instType);
    if (!priceInfo || !priceInfo.price || parseFloat(priceInfo.price) <= 0) {
      throw new Error(`No se pudo obtener el precio actual para ${tickerUpper}.`);
    }
    const currentPrice = parseFloat(priceInfo.price);
    const baseAmount = qty * currentPrice;

    // Regla 2 — Precio mínimo de operación
    if (baseAmount < 1000) {
      throw new Error('Monto mínimo de operación: $1.000');
    }
    // Regla 4 — Caución mínima
    if (instType === 'caucion' && baseAmount < 10000) {
      throw new Error('Monto mínimo para operar cauciones: $10.000 ARS');
    }

    // Regla 1 — Comisión simulada de 0.5%
    const commission = baseAmount * 0.005;
    const totalAmount = baseAmount + commission;

    return await withTransaction(async (client) => {
      const portfolio = await client.query(
        'SELECT * FROM paper_portfolios WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (portfolio.rows.length === 0) {
        throw new Error('La cartera simulada no existe.');
      }

      const pf = portfolio.rows[0];
      const cashBefore = parseFloat(pf.cash_balance);

      if (cashBefore < totalAmount) {
        throw new Error(`Saldo insuficiente. Tenés $${cashBefore.toLocaleString('es-AR')} y necesitás $${totalAmount.toLocaleString('es-AR')} (incluye comisión de 0.5%).`);
      }

      const cashAfter = cashBefore - totalAmount;

      // Verificar existencia de posición y Regla 5 — Límite de posiciones (Max 15)
      const existingPos = await client.query(
        'SELECT * FROM paper_positions WHERE portfolio_id = $1 AND ticker = $2',
        [pf.id, tickerUpper]
      );

      if (existingPos.rows.length === 0) {
        const countRes = await client.query(
          'SELECT COUNT(*) FROM paper_positions WHERE portfolio_id = $1',
          [pf.id]
        );
        if (parseInt(countRes.rows[0].count || 0) >= 15) {
          throw new Error('Límite de 15 posiciones alcanzado. Vendé alguna posición antes de agregar una nueva.');
        }
      }

      // Insertar o actualizar posición
      if (existingPos.rows.length > 0) {
        const pos = existingPos.rows[0];
        const oldQty = parseFloat(pos.quantity);
        const oldAvg = parseFloat(pos.avg_buy_price);
        const newQty = oldQty + qty;
        const newAvg = ((oldQty * oldAvg) + (qty * currentPrice)) / newQty;

        await client.query(`
          UPDATE paper_positions 
          SET quantity = $1, avg_buy_price = $2, updated_at = NOW()
          WHERE id = $3
        `, [newQty, newAvg, pos.id]);
      } else {
        await client.query(`
          INSERT INTO paper_positions (portfolio_id, instrument_type, ticker, name, quantity, avg_buy_price, currency)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [pf.id, instType, tickerUpper, name, qty, currentPrice, priceInfo.currency || 'ARS']);
      }

      // Actualizar cash balance de la cartera
      await client.query(
        'UPDATE paper_portfolios SET cash_balance = $1, updated_at = NOW() WHERE id = $2',
        [cashAfter, pf.id]
      );

      // Registrar transacción
      const tx = await client.query(`
        INSERT INTO paper_transactions (portfolio_id, transaction_type, instrument_type, ticker, name, quantity, price, total_amount, cash_before, cash_after)
        VALUES ($1, 'buy', $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [pf.id, instType, tickerUpper, name, qty, currentPrice, totalAmount, cashBefore, cashAfter]);

      return {
        transaction: tx.rows[0]
      };
    }).then(async (result) => {
      const updatedPortfolio = await this.getPortfolio(userId);
      return {
        success: true,
        portfolio: updatedPortfolio,
        transaction: result.transaction
      };
    });
  },

  /**
   * Ejecutar venta ficticia de un instrumento
   */
  async executeSell(userId, { ticker, quantity }) {
    if (!ticker || !quantity || parseFloat(quantity) <= 0) {
      throw new Error('Parámetros de venta inválidos.');
    }

    const qty = parseFloat(quantity);
    const tickerUpper = ticker.toUpperCase().trim();

    return await withTransaction(async (client) => {
      const portfolio = await client.query(
        'SELECT * FROM paper_portfolios WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (portfolio.rows.length === 0) {
        throw new Error('La cartera simulada no existe.');
      }

      const pf = portfolio.rows[0];

      const existingPos = await client.query(
        'SELECT * FROM paper_positions WHERE portfolio_id = $1 AND ticker = $2 FOR UPDATE',
        [pf.id, tickerUpper]
      );

      if (existingPos.rows.length === 0) {
        throw new Error(`No tenés posiciones abiertas de ${tickerUpper}.`);
      }

      const pos = existingPos.rows[0];
      const posQty = parseFloat(pos.quantity);

      if (posQty < qty) {
        throw new Error(`Cantidad insuficiente. Tenés ${posQty} de ${tickerUpper} y querés vender ${qty}.`);
      }

      const priceInfo = await marketDataService.getPrice(tickerUpper, pos.instrument_type);
      if (!priceInfo || !priceInfo.price || parseFloat(priceInfo.price) <= 0) {
        throw new Error(`No se pudo obtener el precio actual para la venta de ${tickerUpper}.`);
      }
      const currentPrice = parseFloat(priceInfo.price);
      const baseAmount = qty * currentPrice;

      // Regla 2 — Precio mínimo de operación
      if (baseAmount < 1000) {
        throw new Error('Monto mínimo de operación: $1.000');
      }

      // Regla 1 — Comisión simulada de 0.5% en la venta
      const commission = baseAmount * 0.005;
      const totalAmount = baseAmount - commission;
      
      const realizedGain = baseAmount - (qty * parseFloat(pos.avg_buy_price));

      const cashBefore = parseFloat(pf.cash_balance);
      const cashAfter = cashBefore + totalAmount;

      if (posQty === qty) {
        await client.query('DELETE FROM paper_positions WHERE id = $1', [pos.id]);
      } else {
        await client.query(
          'UPDATE paper_positions SET quantity = $1, updated_at = NOW() WHERE id = $2',
          [posQty - qty, pos.id]
        );
      }

      await client.query(
        'UPDATE paper_portfolios SET cash_balance = $1, updated_at = NOW() WHERE id = $2',
        [cashAfter, pf.id]
      );

      const tx = await client.query(`
        INSERT INTO paper_transactions (portfolio_id, transaction_type, instrument_type, ticker, name, quantity, price, total_amount, cash_before, cash_after)
        VALUES ($1, 'sell', $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [pf.id, pos.instrument_type, tickerUpper, pos.name, qty, currentPrice, totalAmount, cashBefore, cashAfter]);

      return {
        transaction: tx.rows[0],
        realizedGain
      };
    }).then(async (result) => {
      const updatedPortfolio = await this.getPortfolio(userId);
      return {
        success: true,
        portfolio: updatedPortfolio,
        transaction: result.transaction,
        realizedGain: result.realizedGain
      };
    });
  },

  /**
   * Resetear cartera virtual a valores iniciales
   */
  async resetPortfolio(userId) {
    return await withTransaction(async (client) => {
      const portfolio = await client.query(
        'SELECT * FROM paper_portfolios WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (portfolio.rows.length === 0) {
        throw new Error('La cartera simulada no existe.');
      }

      const pf = portfolio.rows[0];

      // Eliminar posiciones y transacciones asociadas
      await client.query('DELETE FROM paper_positions WHERE portfolio_id = $1', [pf.id]);
      await client.query('DELETE FROM paper_transactions WHERE portfolio_id = $1', [pf.id]);

      // Regla 3 — Consecuencia del reset: perder rendimiento de periodos rankings actuales (monthly, weekly)
      await client.query(
        "DELETE FROM ranking_history WHERE portfolio_id = $1 AND period IN ('weekly', 'monthly')",
        [pf.id]
      );

      // Resetear balance
      const initialCapital = 1000000.00;
      await client.query(`
        UPDATE paper_portfolios 
        SET cash_balance = $1, total_value = $1, total_return_pct = 0, reset_count = reset_count + 1, updated_at = NOW()
        WHERE id = $2
      `, [initialCapital, pf.id]);

      return pf.id;
    }).then(async () => {
      return await this.getPortfolio(userId);
    });
  },

  /**
   * Historial de transacciones de un usuario (últimas 50)
   */
  async getTransactionHistory(userId) {
    const portfolio = await queryOne('SELECT id FROM paper_portfolios WHERE user_id = $1', [userId]);
    if (!portfolio) return [];

    return await queryAll(`
      SELECT transaction_type as type, ticker, quantity, price, total_amount as total, executed_at as date
      FROM paper_transactions
      WHERE portfolio_id = $1
      ORDER BY executed_at DESC
      LIMIT 50
    `, [portfolio.id]);
  },

  /**
   * Tomar snapshot diario del portfolio
   */
  async takeSnapshot(portfolioId) {
    try {
      const portfolio = await queryOne('SELECT * FROM paper_portfolios WHERE id = $1', [portfolioId]);
      if (!portfolio) return;

      const positionsCountRes = await queryOne(
        'SELECT COUNT(*) FROM paper_positions WHERE portfolio_id = $1',
        [portfolioId]
      );
      const positionsCount = parseInt(positionsCountRes.count || 0);

      await query(`
        INSERT INTO paper_snapshots (portfolio_id, snapshot_date, total_value, cash_balance, total_return_pct, positions_count)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
        ON CONFLICT (portfolio_id, snapshot_date)
        DO UPDATE SET
          total_value = EXCLUDED.total_value,
          cash_balance = EXCLUDED.cash_balance,
          total_return_pct = EXCLUDED.total_return_pct,
          positions_count = EXCLUDED.positions_count
      `, [
        portfolioId,
        portfolio.total_value,
        portfolio.cash_balance,
        portfolio.total_return_pct,
        positionsCount
      ]);
    } catch (err) {
      console.error(`[PaperTradingService] Error al tomar snapshot para ${portfolioId}:`, err.message);
    }
  },

  /**
   * Calcular ranking e historial
   */
  async calculateRanking(period = 'monthly') {
    let periodKey = 'alltime';
    const now = new Date();
    
    if (period === 'monthly') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      periodKey = `${year}-${month}`;
    } else if (period === 'weekly') {
      const year = now.getFullYear();
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
      periodKey = `${year}-W${week}`;
    }

    const portfolios = await queryAll(`
      SELECT id, display_name, total_value, total_return_pct 
      FROM paper_portfolios 
      WHERE is_active = true 
      ORDER BY total_return_pct DESC
    `);

    const topRanking = [];

    for (let i = 0; i < portfolios.length; i++) {
      const pf = portfolios[i];
      const rankPosition = i + 1;

      await query(`
        INSERT INTO ranking_history (portfolio_id, period, period_key, rank_position, total_return_pct, total_value, recorded_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (portfolio_id, period, period_key)
        DO UPDATE SET
          rank_position = EXCLUDED.rank_position,
          total_return_pct = EXCLUDED.total_return_pct,
          total_value = EXCLUDED.total_value,
          recorded_at = NOW()
      `, [pf.id, period, periodKey, rankPosition, pf.total_return_pct, pf.total_value]);

      if (rankPosition <= 20) {
        topRanking.push({
          position: rankPosition,
          displayName: pf.display_name,
          totalReturnPct: parseFloat(pf.total_return_pct),
          totalValue: parseFloat(pf.total_value),
          portfolioId: pf.id
        });
      }
    }

    return topRanking;
  }
};

module.exports = PaperTradingService;
