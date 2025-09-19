const { body, param, query, validationResult } = require('express-validator');

class ValidationMiddleware {
  // Middleware para capturar erros de validação
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }
    next();
  }

  // Validações para conversas
  static validateConversationMessage() {
    return [
      body('channel')
        .isIn(['whatsapp', 'email', 'web_chat', 'phone'])
        .withMessage('Channel must be one of: whatsapp, email, web_chat, phone'),
      
      body('customer_identifier')
        .notEmpty()
        .withMessage('Customer identifier is required')
        .isLength({ min: 3, max: 50 })
        .withMessage('Customer identifier must be between 3 and 50 characters'),
      
      body('message')
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
      
      body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object')
    ];
  }

  // Validações para WhatsApp
  static validateWhatsAppMessage() {
    return [
      body('to')
        .matches(/^\+?[\d\s-()]+$/)
        .withMessage('Invalid phone number format')
        .isLength({ min: 8, max: 15 })
        .withMessage('Phone number must be between 8 and 15 digits'),
      
      body('message')
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ max: 4096 })
        .withMessage('Message too long (max 4096 characters)'),
      
      body('type')
        .optional()
        .isIn(['text', 'template', 'interactive'])
        .withMessage('Type must be text, template, or interactive')
    ];
  }

  // Validações para webhook
  static validateWebhook() {
    return [
      body('event_type')
        .notEmpty()
        .withMessage('Event type is required')
        .isIn(['ticket_created', 'ticket_updated', 'customer_updated'])
        .withMessage('Invalid event type'),
      
      body('payload')
        .notEmpty()
        .withMessage('Payload is required')
        .isObject()
        .withMessage('Payload must be an object')
    ];
  }

  // Validações para customer ID
  static validateCustomerId() {
    return [
      param('id')
        .notEmpty()
        .withMessage('Customer ID is required')
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage('Customer ID contains invalid characters')
    ];
  }

  // Sanitização de entrada
  static sanitizeInput(req, res, next) {
    // Remove scripts e HTML potencialmente perigosos
    const sanitize = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          obj[key] = obj[key].trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    
    next();
  }
}

module.exports = ValidationMiddleware;