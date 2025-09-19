const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthMiddleware {
  // JWT Authentication
  static authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided'
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'netpro_secret');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  }

  // API Key Authentication (para integrações)
  static authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required'
      });
    }

    const validApiKeys = [
      process.env.NETPRO_API_KEY || 'netpro_api_key_demo',
      process.env.CRM_API_KEY || 'crm_api_key_demo'
    ];

    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    next();
  }

  // Webhook Signature Verification (META WhatsApp)
  static verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    if (!signature) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing webhook signature'
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.META_APP_SECRET || 'demo_secret')
      .update(payload)
      .digest('hex');

    const receivedSignature = signature.replace('sha256=', '');

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );

      if (!isValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid webhook signature'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Signature verification failed'
      });
    }
  }

  // Role-based access control
  static requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Generate JWT Token (utility)
  static generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, process.env.JWT_SECRET || 'netpro_secret', {
      expiresIn
    });
  }
}

module.exports = AuthMiddleware;

// src/utils/logger.js
const winston = require('winston');
const path = require('path');

class Logger {
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.colorize({ all: true })
      ),
      defaultMeta: {
        service: 'netpro-omnichat',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // File transport for errors
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),

        // File transport for all logs
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'combined.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ]
    });

    // Create logs directory if it doesn't exist
    const fs = require('fs');
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Specific logging methods for business events
  logConversation(conversationId, customerId, channel, message, aiAnalysis) {
    this.info('Conversation processed', {
      event: 'conversation_processed',
      conversationId,
      customerId,
      channel,
      messageLength: message.length,
      aiIntent: aiAnalysis.classification.intent,
      aiConfidence: aiAnalysis.classification.confidence,
      autoResolvable: aiAnalysis.auto_resolvable
    });
  }

  logWebhookDelivery(webhookId, url, attempts, success, errorMessage = null) {
    this.info('Webhook delivery attempt', {
      event: 'webhook_delivery',
      webhookId,
      url: url.replace(/\/\/.*@/, '//***@'), // Hide credentials in URL
      attempts,
      success,
      errorMessage
    });
  }

  logWhatsAppMessage(messageId, to, type, success) {
    this.info('WhatsApp message sent', {
      event: 'whatsapp_message',
      messageId,
      to: to.substring(0, 5) + '***', // Partial phone for privacy
      type,
      success
    });
  }

  logAuthEvent(event, userId, ip, success, reason = null) {
    this.info('Authentication event', {
      event: 'auth_event',
      authEvent: event,
      userId,
      ip,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  logRateLimitHit(ip, endpoint, limit, windowMs) {
    this.warn('Rate limit exceeded', {
      event: 'rate_limit_hit',
      ip,
      endpoint,
      limit,
      windowMs,
      timestamp: new Date().toISOString()
    });
  }

  // Business metrics logging
  logBusinessMetric(metric, value, unit, metadata = {}) {
    this.info('Business metric', {
      event: 'business_metric',
      metric,
      value,
      unit,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // Express middleware for request logging
  expressMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        this.info('HTTP Request', {
          event: 'http_request',
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          contentLength: res.get('Content-Length')
        });
      });

      next();
    };
  }
}

module.exports = new Logger();