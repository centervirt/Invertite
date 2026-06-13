/**
 * INVERTITE — Controlador de Datos de Mercado
 * Provee cotizaciones en tiempo real y conjuntos de datos para gráficos históricos.
 */
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /api/v1/market/ticker
const getTicker = async (req, res, next) => {
  try {
    const cotizaciones = [
      { name: 'Dólar MEP', value: 1248.50, change: -0.3 },
      { name: 'Dólar CCL', value: 1284.20, change: 0.5 },
      { name: 'S&P Merval', value: 1580400, change: 2.8 },
      { name: 'Plazo Fijo TNA', value: 35.0, change: 0.0 },
      { name: 'Rendimiento FCI MM', value: 38.2, change: 1.2 }
    ];
    return res.json(successResponse(cotizaciones, 'Cotizaciones de mercado obtenidas.'));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/market/chart-data/:dataKey
const getChartData = async (req, res, next) => {
  try {
    const { dataKey } = req.params;

    const dataSets = {
      inflacion_vs_plazo_fijo: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [
          { label: 'Inflación (%)', data: [20.6, 13.2, 11.0, 8.8, 4.2, 4.6] },
          { label: 'Plazo Fijo (%)', data: [9.0, 9.0, 8.0, 6.0, 3.5, 3.0] }
        ]
      },
      tipos_dolar: {
        labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        datasets: [
          { label: 'Oficial', data: [890, 892, 893, 895, 896] },
          { label: 'MEP', data: [1230, 1235, 1240, 1245, 1248] },
          { label: 'CCL', data: [1260, 1265, 1272, 1278, 1284] }
        ]
      },
      cedears_performance: {
        labels: ['AAPL', 'GOOGL', 'MSFT', 'KO', 'TSLA'],
        datasets: [
          { label: 'Rendimiento YTD (%)', data: [18.5, 22.1, 14.8, 8.2, -12.4] }
        ]
      },
      caucion_vs_pf: {
        labels: ['1 día', '7 días', '14 días', '30 días'],
        datasets: [
          { label: 'Caución TNA (%)', data: [31.5, 32.0, 32.5, 33.0] },
          { label: 'Plazo Fijo TNA (%)', data: [35.0, 35.0, 35.0, 35.0] }
        ]
      }
    };

    const data = dataSets[dataKey];
    if (!data) {
      return res.status(404).json(errorResponse('Clave de datos de gráfico no encontrada.'));
    }

    return res.json(successResponse(data, 'Datos de gráfico obtenidos.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTicker,
  getChartData
};
