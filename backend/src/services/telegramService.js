const axios = require('axios');
const { query } = require('../config/database');

class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.apiUrl = `https://api.telegram.org/bot${this.token}/sendMessage`;
  }

  isConfigured() {
    return this.token && this.chatId;
  }

  // Formatters returning HTML strings for Telegram
  formatAlert(data) {
    const { symbol, alert_type, price, timestamp } = data;
    let emoji = '🚨';
    if (alert_type === 'PRICE_UP') emoji = '🚀';
    if (alert_type === 'PRICE_DOWN') emoji = '📉';
    if (alert_type === 'VOLUME_SPIKE') emoji = '🔥';

    return `<b>${emoji} ALERTA DE MERCADO: ${symbol || 'Activo'}</b>
    
El activo <b>${symbol || 'N/A'}</b> ha desencadenado una alerta de tipo <i>${alert_type || 'General'}</i>.
💰 <b>Precio actual:</b> $${price || 'N/A'}
⏱️ <b>Hora:</b> ${timestamp ? new Date(timestamp).toLocaleString('es-AR') : new Date().toLocaleString('es-AR')}

<a href="https://invertite.neurasolutions.com.ar/dashboard">👉 Ir al Dashboard</a>`;
  }

  formatWeeklySummary(data) {
    const { totalTrades, totalProfit, bestSymbol } = data;
    return `<b>📊 RESUMEN SEMANAL INVERTITE</b>
    
Esta semana los usuarios de Invertite han estado muy activos.
✅ <b>Operaciones totales:</b> ${totalTrades || 0}
💵 <b>Ganancia total acumulada:</b> $${totalProfit || '0.00'}
🏆 <b>Activo más tradeado:</b> ${bestSymbol || 'N/A'}

¡Preparate para una nueva semana de inversiones!
<a href="https://invertite.neurasolutions.com.ar/dashboard">👉 Ingresar a tu cuenta</a>`;
  }

  formatDailySummary(data) {
    const { usdMep, mervalVar, date } = data;
    const dateStr = date ? new Date(date).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    return `<b>📈 RESUMEN DEL DÍA (${dateStr})</b>

💵 <b>Dólar MEP:</b> $${usdMep || 'N/A'}
📊 <b>MERVAL:</b> ${mervalVar > 0 ? '+' : ''}${mervalVar || '0'}%

La bolsa porteña y el tipo de cambio cerraron la jornada. Mantenete al tanto en Invertite.
<a href="https://invertite.neurasolutions.com.ar/dashboard">👉 Ir al Simulador</a>`;
  }

  formatEducationalTip(data) {
    const { title, content } = data;
    return `<b>💡 INVER-TIP DEL DÍA</b>
<i>${title || 'Educación Financiera'}</i>

${content || 'Aprende a invertir paso a paso con Invertite.'}

📚 ¿Querés saber más? Revisá el Módulo 1 completo en la plataforma.
<a href="https://invertite.neurasolutions.com.ar/modulos">👉 Ir al Curso</a>`;
  }

  getFormatter(type) {
    switch (type) {
      case 'alert': return this.formatAlert;
      case 'weekly_summary': return this.formatWeeklySummary;
      case 'daily_summary': return this.formatDailySummary;
      case 'educational_tip': return this.formatEducationalTip;
      default: return (data) => `<b>Invertite:</b>\n<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
  }

  async publish(type, data) {
    if (!this.isConfigured()) {
      console.warn('[Telegram] Token o Chat ID no configurados. Saltando...');
      return { success: false, reason: 'Not configured' };
    }

    const formatter = this.getFormatter(type).bind(this);
    const htmlContent = formatter(data);

    try {
      const response = await axios.post(this.apiUrl, {
        chat_id: this.chatId,
        text: htmlContent,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      // Log success
      await this.logPublication(type, htmlContent, 'success', null);
      return { success: true, messageId: response.data.result.message_id };

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[Telegram] Error al publicar:', errorMsg);
      // Log error but don't crash
      await this.logPublication(type, htmlContent, 'error', errorMsg);
      return { success: false, reason: errorMsg };
    }
  }

  async logPublication(type, content, status, errorMsg) {
    try {
      await query(
        `INSERT INTO telegram_posts_log (workflow_type, content, status, error_message)
         VALUES ($1, $2, $3, $4)`,
        [type, content, status, errorMsg]
      );
    } catch (err) {
      console.error('[Telegram] Error al registrar log de publicación en BD:', err);
    }
  }
}

module.exports = new TelegramService();
