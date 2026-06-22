const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const alertController = require('../controllers/alertController');
const redis = require('../config/redis');

const INTERNAL_KEY = process.env.INTERNAL_KEY || 'invertite_internal_secret_key_2026';

// Middleware de autenticación interna
const requireInternalKey = (req, res, next) => {
  const key = req.headers['x-internal-key'];
  if (!key || key !== INTERNAL_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// POST /api/v1/internal/weekly-summary
router.post('/weekly-summary', contentController.postWeeklySummary);

// POST /api/v1/internal/alerts/broadcast
router.post('/alerts/broadcast', alertController.broadcastAlert);

// GET /api/v1/internal/market-snapshot/previous
router.get('/market-snapshot/previous', requireInternalKey, async (req, res, next) => {
  try {
    const snapshot = await redis.get('market:snapshot:previous');
    if (!snapshot) {
      const MarketDataService = require('../services/marketDataService');
      const mep = await MarketDataService.getPrice('MEP', 'dolar');
      const blue = await MarketDataService.getPrice('BLUE', 'dolar');
      const caucion = await MarketDataService.getPrice('CAUCION', 'caucion');
      return res.json({
        mep: mep?.price || 0,
        blue: blue?.price || 0,
        caucion_tna: caucion?.price || 0,
        timestamp: new Date().toISOString()
      });
    }
    return res.json(typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/internal/market-snapshot
router.post('/market-snapshot', requireInternalKey, async (req, res, next) => {
  try {
    const { snapshot } = req.body;
    if (!snapshot) {
      return res.status(400).json({ error: 'Snapshot is required' });
    }
    await redis.set('market:snapshot:previous', snapshot);
    return res.json({ success: true, message: 'Snapshot guardado en Redis.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/internal/telegram/publish
router.post('/telegram/publish', requireInternalKey, async (req, res, next) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      return res.status(400).json({ error: 'type and data are required' });
    }
    
    const telegramService = require('../services/telegramService');
    const result = await telegramService.publish(type, data);
    
    if (result.success) {
      return res.json(result);
    } else {
      // Retornar 200 de todas formas para no romper n8n, 
      // pero indicar success: false en el body.
      return res.json(result);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/internal/telegram/random-tip
router.get('/telegram/random-tip', requireInternalKey, async (req, res, next) => {
  try {
    const { queryOne } = require('../config/database');
    const tip = await queryOne(`
      SELECT title, content_json as content 
      FROM lessons 
      WHERE is_published = true 
      ORDER BY RANDOM() 
      LIMIT 1
    `);
    
    if (!tip) {
      return res.json({ title: 'Aprende a invertir', content: 'Descubre los módulos en Invertite.' });
    }
    
    // Extraer texto limpio del contenido (que podría ser JSON de EditorJS o HTML)
    let cleanContent = tip.content;
    
    try {
      if (typeof cleanContent === 'string') {
        cleanContent = JSON.parse(cleanContent);
      }
      
      // Si es un array (ej: [{"text": "..."}])
      if (Array.isArray(cleanContent)) {
        cleanContent = cleanContent.map(b => b.text || '').join(' ');
      } 
      // Si es objeto EditorJS
      else if (cleanContent && cleanContent.blocks) {
        cleanContent = cleanContent.blocks.map(b => b.data?.text || '').join(' ');
      }
      // Si no, lo volvemos string
      else {
        cleanContent = JSON.stringify(cleanContent);
      }
    } catch (e) {
      // Era HTML crudo o texto plano, se mantiene como string
    }
    
    cleanContent = String(cleanContent).replace(/<[^>]*>?/gm, '');
    return res.json({ 
      title: tip.title, 
      content: cleanContent.substring(0, 150) + '...'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
