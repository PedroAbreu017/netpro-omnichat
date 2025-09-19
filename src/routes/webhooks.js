const express = require('express');
const webhookService = require('../services/webhookService');

const router = express.Router();

// POST /api/v1/webhooks/crm-notify
// Endpoint para enviar notificações para CRM
router.post('/crm-notify', async (req, res) => {
  try {
    const { event_type, payload } = req.body;

    if (!event_type || !payload) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['event_type', 'payload']
      });
    }

    const webhookPayload = {
      webhook_id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_type,
      timestamp: new Date().toISOString(),
      source: 'netpro_omnichat_manual',
      ...payload
    };

    const result = await webhookService.sendWebhook(
      process.env.CRM_WEBHOOK_URL,
      webhookPayload
    );

    res.json({
      success: true,
      webhook_id: result.webhookId,
      delivery_status: 'delivered',
      attempts: result.attempt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/webhooks/test
// Endpoint para testar webhooks
router.post('/test', async (req, res) => {
  try {
    const testPayload = {
      event_type: 'test_webhook',
      timestamp: new Date().toISOString(),
      test_data: {
        message: 'NetPro OmniChat webhook test',
        system: 'healthy',
        version: '1.0.0'
      }
    };

    const result = await webhookService.sendWebhook(
      req.body.webhook_url || process.env.CRM_WEBHOOK_URL,
      testPayload
    );

    res.json({
      success: true,
      message: 'Webhook test completed successfully',
      result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Webhook test failed'
    });
  }
});

module.exports = router;

