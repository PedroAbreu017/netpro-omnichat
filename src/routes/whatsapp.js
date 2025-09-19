// src/routes/whatsapp.js
const express = require('express');
const metaWhatsappService = require('../services/metaWhatsappService');
const contextEngine = require('../services/contextEngine');
const aiClassifier = require('../services/aiClassifier');

const router = express.Router();

// GET /api/v1/whatsapp/webhook - Webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token']; 
  const challenge = req.query['hub.challenge'];

  const verification = metaWhatsappService.verifyWebhook(mode, token, challenge);
  
  if (verification) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// POST /api/v1/whatsapp/webhook - Receive messages
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const messages = await metaWhatsappService.processIncomingWebhook(req.body, signature);

    if (!messages || messages.length === 0) {
      return res.status(200).send('OK'); // Status update, not a message
    }

    // Process each message through our omnichannel system
    for (const messageData of messages) {
      const customerId = messageData.from;
      const messageText = messageData.content.text;

      // Get customer context
      const context = await contextEngine.getCustomerContext(customerId);
      
      // Classify message
      const aiAnalysis = await aiClassifier.classifyMessage(messageText, context);

      if (aiAnalysis.auto_resolvable) {
        // Auto-respond via WhatsApp
        const response = await aiClassifier.generateResponse(aiAnalysis.classification, context);
        await metaWhatsappService.sendTextMessage(customerId, response.text);
        
        // Mark original message as read
        await metaWhatsappService.markMessageAsRead(messageData.message_id);
      } else {
        // Send to human agent - acknowledge receipt first
        await metaWhatsappService.sendTextMessage(
          customerId,
          `Obrigado pelo contato, ${context.customer?.name || 'cliente'}! Você será atendido por um especialista em aproximadamente 3 minutos.`
        );
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Error');
  }
});

// POST /api/v1/whatsapp/send-message - Send message to customer
router.post('/send-message', async (req, res) => {
  try {
    const { to, message, type = 'text', template_data } = req.body;

    let result;
    switch (type) {
      case 'template':
        result = await metaWhatsappService.sendTemplateMessage(
          to, 
          template_data.name, 
          template_data.language, 
          template_data.components
        );
        break;
      case 'interactive':
        result = await metaWhatsappService.sendInteractiveMessage(
          to,
          message,
          template_data.buttons,
          template_data.header
        );
        break;
      default:
        result = await metaWhatsappService.sendTextMessage(to, message);
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/whatsapp/templates - Get available templates
router.get('/templates', (req, res) => {
  res.json({
    success: true,
    templates: metaWhatsappService.getApprovedTemplates()
  });
});

module.exports = router;
