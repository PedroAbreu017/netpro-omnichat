const crypto = require('crypto');

class WebhookService {
  constructor() {
    this.maxRetries = 5;
    this.baseDelay = 1000; // 1 segundo
    this.maxDelay = 300000; // 5 minutos
  }

  async sendWebhook(url, payload, attempt = 1) {
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': this.generateSignature(payload),
          'X-Webhook-Timestamp': Date.now().toString(),
          'X-Webhook-ID': webhookId,
          'X-Webhook-Attempt': attempt.toString(),
          'User-Agent': 'NetPro-OmniChat/1.0'
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      if (response.ok) {
        const responseData = await response.text();
        console.log(`✅ Webhook delivered successfully - Attempt ${attempt}`, {
          webhookId,
          status: response.status,
          responseTime: response.headers.get('x-response-time')
        });
        
        return {
          success: true,
          attempt,
          status: response.status,
          response: responseData,
          webhookId
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Webhook failed - Attempt ${attempt}:`, {
        webhookId,
        error: error.message,
        url
      });
      
      if (attempt < this.maxRetries) {
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );
        
        console.log(`🔄 Retrying webhook in ${delay}ms...`);
        
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(this.sendWebhook(url, payload, attempt + 1));
          }, delay);
        });
      } else {
        console.error('💀 Webhook failed after all attempts');
        await this.handleFailedWebhook(webhookId, payload, error);
        throw new Error(`Webhook delivery failed after ${attempt} attempts: ${error.message}`);
      }
    }
  }

  generateSignature(payload) {
    const secret = process.env.WEBHOOK_SECRET || 'default_secret';
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async handleFailedWebhook(webhookId, payload, error) {
    // Em produção: salvar em dead letter queue, notificar admins
    console.log('📝 Saving failed webhook for manual processing:', {
      webhookId,
      payload: payload.event_type,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Aqui você salvaria em uma fila para reprocessamento manual
    // ou notificaria a equipe de TI
  }

  verifyWebhookSignature(payload, signature) {
    const expectedSignature = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

module.exports = new WebhookService();