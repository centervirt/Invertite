const { parseBluelytics, parseDolarApi } = require('../services/marketParsers');

describe('Market Parsers', () => {
  describe('parseBluelytics', () => {
    const mockBluelytics = {
      "oficial": { "value_avg": 1457, "value_sell": 1482, "value_buy": 1432 },
      "blue": { "value_avg": 1479, "value_sell": 1495, "value_buy": 1463 },
      "last_update": "2026-06-22T19:45:51.422615-03:00"
    };

    it('deberia parsear el dolar oficial correctamente', () => {
      const result = parseBluelytics(mockBluelytics, 'oficial');
      expect(result).toEqual({ price: 1482, currency: 'ARS', ticker: 'oficial' });
    });

    it('deberia devolver null para MEP porque la fuente no lo provee (para activar fallback)', () => {
      const result = parseBluelytics(mockBluelytics, 'mep');
      expect(result).toBeNull();
    });

    it('deberia devolver null para CCL porque la fuente no lo provee (para activar fallback)', () => {
      const result = parseBluelytics(mockBluelytics, 'ccl');
      expect(result).toBeNull();
    });
  });

  describe('parseDolarApi', () => {
    const mockDolarApi = [
      {
        moneda: 'USD',
        casa: 'bolsa',
        nombre: 'Bolsa',
        compra: 1482.1,
        venta: 1485.8,
        fechaActualizacion: '2026-06-22T20:59:00.000Z'
      },
      {
        moneda: 'USD',
        casa: 'contadoconliqui',
        nombre: 'Contado con liquidación',
        compra: 1524.8,
        venta: 1527,
        fechaActualizacion: '2026-06-22T20:59:00.000Z'
      }
    ];

    it('deberia parsear el MEP buscando la casa bolsa', () => {
      const result = parseDolarApi(mockDolarApi, 'mep');
      expect(result).toEqual({ price: 1485.8, currency: 'ARS', ticker: 'mep' });
    });

    it('deberia parsear el CCL buscando la casa contadoconliqui', () => {
      const result = parseDolarApi(mockDolarApi, 'ccl');
      expect(result).toEqual({ price: 1527, currency: 'ARS', ticker: 'ccl' });
    });

    it('deberia devolver resultados diferenciados para MEP y CCL', () => {
      const mep = parseDolarApi(mockDolarApi, 'mep');
      const ccl = parseDolarApi(mockDolarApi, 'ccl');
      expect(mep.price).not.toEqual(ccl.price);
    });
  });
});

