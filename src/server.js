// src/server.js - VERSÃO COMPLETA COM MIDDLEWARES
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import middlewares
const ValidationMiddleware = require('./middleware/validation');
const rateLimiter = require('./middleware/rateLimiter');
const AuthMiddleware = require('./middleware/auth');
const logger = require('./utils/logger');

// Import routes
const conversationRoutes = require('./routes/conversations');
const webhookRoutes = require('./routes/webhooks');
const customerRoutes = require('./routes/customers');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Security middleware
app.use(helmet());
app.use(cors());

// Logging
app.use(logger.expressMiddleware());
app.use(morgan('combined'));

// Rate limiting
//app.use('/api/', rateLimiter.createGeneralLimiter());
//app.use('/api/v1/whatsapp/', rateLimiter.createWhatsAppLimiter());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization
app.use(ValidationMiddleware.sanitizeInput);

// Routes with validation
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Initialize services
const contextEngine = require('./services/contextEngine');
contextEngine.initialize().catch(console.error);

app.listen(PORT, () => {
  logger.info('NetPro OmniChat API started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;