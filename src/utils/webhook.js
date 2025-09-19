
// src/utils/webhook.js
const crypto = require('crypto');
const logger = require('./logger');

class WebhookUtils {
  // Generate secure webhook signature
  static generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  // Verify webhook signature
  static verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature verification failed', { error: error.message });
      return false;
    }
  }

  // Retry policy calculator
  static calculateRetryDelay(attempt, baseDelay = 1000, maxDelay = 300000) {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt - 1),
      maxDelay
    );
    
    // Add jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(exponentialDelay + jitter, baseDelay);
  }

  // Circuit breaker state manager
  static createCircuitBreaker(options = {}) {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000,
      monitoringPeriod = 600000
    } = options;

    return {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null,
      successCount: 0,

      canExecute() {
        if (this.state === 'CLOSED') {
          return true;
        }

        if (this.state === 'OPEN') {
          if (Date.now() - this.lastFailureTime >= recoveryTimeout) {
            this.state = 'HALF_OPEN';
            this.successCount = 0;
            logger.info('Circuit breaker transitioning to HALF_OPEN');
            return true;
          }
          return false;
        }

        if (this.state === 'HALF_OPEN') {
          return true;
        }

        return false;
      },

      recordSuccess() {
        this.failures = 0;
        
        if (this.state === 'HALF_OPEN') {
          this.successCount++;
          if (this.successCount >= 3) {
            this.state = 'CLOSED';
            logger.info('Circuit breaker closed - service recovered');
          }
        }
      },

      recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === 'HALF_OPEN') {
          this.state = 'OPEN';
          logger.warn('Circuit breaker opened - service still failing');
          return;
        }

        if (this.failures >= failureThreshold) {
          this.state = 'OPEN';
          logger.warn(`Circuit breaker opened - ${this.failures} failures`);
        }
      },

      getState() {
        return {
          state: this.state,
          failures: this.failures,
          lastFailureTime: this.lastFailureTime,
          canExecute: this.canExecute()
        };
      }
    };
  }

  // Webhook payload validator
  static validatePayload(payload, schema) {
    const requiredFields = schema.required || [];
    const optionalFields = schema.optional || [];
    const allFields = [...requiredFields, ...optionalFields];

    // Check required fields
    for (const field of requiredFields) {
      if (!payload.hasOwnProperty(field) || payload[field] === null || payload[field] === undefined) {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    // Check for unknown fields
    for (const field in payload) {
      if (!allFields.includes(field)) {
        logger.warn('Unknown field in webhook payload', { field, payload });
      }
    }

    return { valid: true };
  }

  // Dead letter queue handler
  static async handleFailedWebhook(webhookId, payload, error, attempts) {
    logger.error('Webhook permanently failed', {
      webhookId,
      attempts,
      error: error.message,
      payloadSize: JSON.stringify(payload).length
    });

    // Em produção, aqui você salvaria em uma fila para reprocessamento manual
    // ou notificaria a equipe de TI
    
    return {
      id: webhookId,
      status: 'failed_permanently',
      attempts,
      lastError: error.message,
      savedToDLQ: true,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WebhookUtils