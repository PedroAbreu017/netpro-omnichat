const rateLimit = require('express-rate-limit');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');

class RateLimiterMiddleware {
  constructor() {
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.redisClient.on('error', (err) => {
      console.error('Rate limiter Redis error:', err);
    });
  }

  // Rate limiter para API geral
  createGeneralLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 1000, // 1000 requests por IP
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Try again later.',
        retryAfter: 15 * 60 // 15 minutos em segundos
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  // Rate limiter específico para WhatsApp (respeitando limites da META)
  createWhatsAppLimiter() {
  return rateLimit({
    windowMs: 1000, // 1 segundo
    max: 20, // 20 requests por segundo (limite da META)
    message: {
      error: 'WhatsApp rate limit exceeded',
      message: 'Maximum 20 messages per second allowed',
      retryAfter: 1
    },
    // Fix para IPv6 - use função padrão
    keyGenerator: (req) => {
      return req.body.to || req.ip;
    },
    // Adicione esta linha para resolver IPv6
    standardHeaders: true,
    legacyHeaders: false
  });
}


  // Rate limiter para webhooks (proteção contra spam)
  createWebhookLimiter() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 100, // 100 webhooks por minuto
      message: {
        error: 'Webhook rate limit exceeded',
        message: 'Too many webhook requests',
        retryAfter: 60
      }
    });
  }

  // Rate limiter avançado com Redis (para produção)
  async createRedisLimiter(maxRequests, windowSeconds) {
    await this.redisClient.connect();
    
    const limiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'netpro_rl',
      points: maxRequests,
      duration: windowSeconds,
      blockDuration: windowSeconds,
    });

    return async (req, res, next) => {
      try {
        await limiter.consume(req.ip);
        next();
      } catch (rateLimiterRes) {
        const remainingPoints = rateLimiterRes.remainingPoints;
        const msBeforeNext = rateLimiterRes.msBeforeNext;

        res.set({
          'Retry-After': Math.round(msBeforeNext / 1000) || 1,
          'X-RateLimit-Limit': maxRequests,
          'X-RateLimit-Remaining': remainingPoints || 0,
          'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.round(msBeforeNext / 1000) || 1
        });
      }
    };
  }
}

module.exports = new RateLimiterMiddleware();