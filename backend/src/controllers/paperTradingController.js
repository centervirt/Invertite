/**
 * INVERTITE — Controlador del Simulador de Cartera
 */
const PaperTradingService = require('../services/paperTradingService');
const { queryOne, queryAll } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

const getPeriodDetails = (period) => {
  const now = new Date();
  let periodKey = 'alltime';
  let periodLabel = 'Histórico';

  if (period === 'monthly') {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    periodKey = `${year}-${month}`;
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    periodLabel = `${monthNames[now.getMonth()]} ${year}`;
  } else if (period === 'weekly') {
    const year = now.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    periodKey = `${year}-W${week}`;
    periodLabel = `Semana ${week} (${year})`;
  }

  return { periodKey, periodLabel };
};

const PaperTradingController = {
  /**
   * Obtener cartera completa
   */
  async getPortfolio(req, res, next) {
    try {
      const userId = req.user.id;
      const portfolio = await PaperTradingService.getPortfolio(userId);
      return res.json(successResponse({ portfolio }, 'Cartera simulada obtenida.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Ejecutar compra
   */
  async buyInstrument(req, res, next) {
    try {
      const userId = req.user.id;
      const { ticker, type, name, quantity } = req.body;
      const result = await PaperTradingService.executeBuy(userId, { ticker, type, name, quantity });
      return res.json(successResponse(result, 'Compra ficticia realizada con éxito.'));
    } catch (err) {
      return res.status(400).json(errorResponse(err.message));
    }
  },

  /**
   * Ejecutar venta
   */
  async sellInstrument(req, res, next) {
    try {
      const userId = req.user.id;
      const { ticker, quantity } = req.body;
      const result = await PaperTradingService.executeSell(userId, { ticker, quantity });
      return res.json(successResponse(result, 'Venta ficticia realizada con éxito.'));
    } catch (err) {
      return res.status(400).json(errorResponse(err.message));
    }
  },

  /**
   * Reiniciar cartera
   */
  async resetPortfolio(req, res, next) {
    try {
      const userId = req.user.id;
      const { confirm } = req.body;

      if (!confirm) {
        return res.status(400).json(errorResponse('Es necesario confirmar el reinicio de la cartera.'));
      }

      const portfolio = await PaperTradingService.resetPortfolio(userId);
      return res.json(successResponse({ portfolio }, 'Tu cartera simulada ha sido reiniciada a $1.000.000.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtener historial de transacciones
   */
  async getTransactions(req, res, next) {
    try {
      const userId = req.user.id;
      const transactions = await PaperTradingService.getTransactionHistory(userId);
      return res.json(successResponse({ transactions }, 'Historial de transacciones obtenido.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtener el ranking de carteras
   */
  async getRanking(req, res, next) {
    try {
      const userId = req.user.id;
      const period = req.query.period || 'monthly';

      if (!['monthly', 'weekly', 'alltime'].includes(period)) {
        return res.status(400).json(errorResponse('Período de ranking inválido.'));
      }

      const { periodKey, periodLabel } = getPeriodDetails(period);

      // Buscar ranking registrado en BD
      let rankRows = await queryAll(
        `SELECT r.rank_position, r.total_return_pct, r.total_value, p.display_name, p.id as portfolio_id
         FROM ranking_history r
         JOIN paper_portfolios p ON r.portfolio_id = p.id
         WHERE r.period = $1 AND r.period_key = $2
         ORDER BY r.rank_position ASC
         LIMIT 20`,
        [period, periodKey]
      );

      // Si no hay ranking calculado aún (ej. primera vez), lo generamos al vuelo
      if (rankRows.length === 0) {
        await PaperTradingService.calculateRanking(period);
        rankRows = await queryAll(
          `SELECT r.rank_position, r.total_return_pct, r.total_value, p.display_name, p.id as portfolio_id
           FROM ranking_history r
           JOIN paper_portfolios p ON r.portfolio_id = p.id
           WHERE r.period = $1 AND r.period_key = $2
           ORDER BY r.rank_position ASC
           LIMIT 20`,
          [period, periodKey]
        );
      }

      // Obtener el portfolio del usuario actual
      const userPortfolio = await queryOne(
        'SELECT id FROM paper_portfolios WHERE user_id = $1',
        [userId]
      );

      let currentUserPosition = null;
      if (userPortfolio) {
        const userRank = await queryOne(
          `SELECT rank_position, total_return_pct, total_value
           FROM ranking_history
           WHERE portfolio_id = $1 AND period = $2 AND period_key = $3`,
          [userPortfolio.id, period, periodKey]
        );
        if (userRank) {
          currentUserPosition = {
            position: userRank.rank_position,
            totalReturnPct: parseFloat(userRank.total_return_pct),
            totalValue: parseFloat(userRank.total_value)
          };
        }
      }

      const ranking = rankRows.map(row => ({
        position: row.rank_position,
        displayName: row.display_name,
        totalReturnPct: parseFloat(row.total_return_pct),
        totalValue: parseFloat(row.total_value),
        isCurrentUser: userPortfolio ? row.portfolio_id === userPortfolio.id : false
      }));

      return res.json(successResponse({
        period,
        periodLabel,
        ranking,
        currentUserPosition
      }, 'Ranking de carteras obtenido.'));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtener snapshots históricos (últimos 30 días)
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;

      const portfolio = await queryOne(
        'SELECT id FROM paper_portfolios WHERE user_id = $1',
        [userId]
      );

      if (!portfolio) {
        return res.json(successResponse({ snapshots: [] }, 'No hay snapshots registrados.'));
      }

      const rows = await queryAll(
        `SELECT snapshot_date as date, total_value as "totalValue", total_return_pct as "returnPct"
         FROM paper_snapshots
         WHERE portfolio_id = $1
         ORDER BY snapshot_date ASC
         LIMIT 30`,
        [portfolio.id]
      );

      return res.json(successResponse({ snapshots: rows }, 'Historial de snapshots obtenido.'));
    } catch (err) {
      next(err);
    }
  }
};

module.exports = PaperTradingController;
