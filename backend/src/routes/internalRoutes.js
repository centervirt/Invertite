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
      return res.json({ mep: 0, blue: 0, caucion_tna: 0, timestamp: new Date().toISOString() });
    }
    return res.json(snapshot);
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
    if (typeof cleanContent !== 'string') {
      cleanContent = JSON.stringify(cleanContent);
    }
    
    if (cleanContent.includes('{"time":')) {
      try {
        const blocks = JSON.parse(cleanContent).blocks;
        cleanContent = blocks.map(b => b.data.text || '').join(' ').replace(/<[^>]*>?/gm, '');
      } catch(e) {}
    } else {
      cleanContent = cleanContent.replace(/<[^>]*>?/gm, '');
    }
    
    return res.json({ 
      title: tip.title, 
      content: cleanContent.substring(0, 150) + '...'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
