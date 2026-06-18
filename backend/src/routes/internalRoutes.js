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

module.exports = router;
