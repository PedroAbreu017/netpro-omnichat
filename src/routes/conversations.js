const express = require('express');
const { v4: uuidv4 } = require('uuid');
const contextEngine = require('../services/contextEngine');
const aiClassifier = require('../services/aiClassifier');
const webhookService = require('../services/webhookService');

const router = express.Router();

// POST /api/v1/conversations/message
// Recebe mensagem de qualquer canal e processa
router.post('/message', async (req, res) => {
  try {
    const { channel, customer_identifier, message, metadata = {} } = req.body;

    if (!channel || !customer_identifier || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['channel', 'customer_identifier', 'message']
      });
    }

    // Buscar contexto do cliente
    let customerContext;
    try {
      customerContext = await contextEngine.getCustomerContext(customer_identifier);
    } catch (error) {
      // Cliente novo - criar perfil básico
      customerContext = {
        customer: {
          id: customer_identifier,
          name: 'Cliente',
          tier: 'basic',
          created_at: new Date().toISOString()
        }
      };
    }

    // Classificar mensagem com IA
    const aiAnalysis = await aiClassifier.classifyMessage(message, customerContext);

    // Gerar ID da conversa
    const conversationId = uuidv4();
    const sessionId = `sess_${Date.now()}_${channel}`;

    // Salvar sessão
    await contextEngine.saveSession(customer_identifier, {
      conversation_id: conversationId,
      channel,
      start_time: new Date().toISOString(),
      last_message: message,
      ai_classification: aiAnalysis.classification,
      status: 'active'
    });

    let response;

    if (aiAnalysis.auto_resolvable) {
      // IA resolve automaticamente
      const aiResponse = aiAnalysis.response;

      response = {
        conversation_id: conversationId,
        session_id: sessionId,
        resolution_type: 'ai_automated',
        response: aiResponse.text,
        actions_taken: aiResponse.actions,
        estimated_resolution_time: '00:02:00',
        follow_up_required: false
      };
    } else {
      // Escalar para humano
      const ticketId = `TKT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Criar payload do webhook
      const webhookPayload = {
        webhook_id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'ticket_created',
        timestamp: new Date().toISOString(),
        source: 'netpro_omnichat',
        ticket: {
          id: ticketId,
          status: 'open',
          priority: aiAnalysis.classification.confidence > 0.8 ? 'medium' : 'high',
          category: aiAnalysis.recommended_department,
          channel,
          created_at: new Date().toISOString()
        },
        customer: customerContext.customer,
        issue_details: {
          title: `${aiAnalysis.classification.intent} - ${channel}`,
          description: `Cliente reportou via ${channel}: "${message}"`,
          customer_message: message,
          ai_analysis: aiAnalysis.classification
        },
        ai_recommendations: {
          department: aiAnalysis.recommended_department,
          estimated_complexity: aiAnalysis.classification.complexity,
          suggested_actions: [
            'Verificar contexto completo do cliente',
            'Aplicar script específico para o tipo de problema',
            'Escalar se não resolver em 15 minutos'
          ]
        }
      };

      // Enviar webhook (fire and forget)
      webhookService.sendWebhook(process.env.CRM_WEBHOOK_URL, webhookPayload)
        .catch(error => console.error('Webhook error:', error));

      response = {
        conversation_id: conversationId,
        session_id: sessionId,
        resolution_type: 'human_required',
        ticket_id: ticketId,
        queue_position: Math.floor(Math.random() * 10) + 1,
        estimated_wait_time: '00:03:30',
        agent_department: aiAnalysis.recommended_department,
        message: `Obrigado pelo contato! Identifiquei que você precisa de ajuda com ${aiAnalysis.classification.intent}. Você está na posição ${Math.floor(Math.random() * 5) + 1} da fila e será atendido em aproximadamente 3 minutos.`
      };
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...response,
      ai_analysis: {
        intent: aiAnalysis.classification.intent,
        confidence: aiAnalysis.classification.confidence,
        sentiment: aiAnalysis.classification.sentiment,
        processing_time_ms: aiAnalysis.processing_time_ms
      }
    });

  } catch (error) {
    console.error('Conversation processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process conversation'
    });
  }
});

// GET /api/v1/conversations/:id/context
// Busca contexto completo de uma conversa
router.get('/:id/context', async (req, res) => {
  try {
    const { id } = req.params;
    const context = await contextEngine.getCustomerContext(id);
    
    res.json({
      success: true,
      context,
      retrieved_at: new Date().toISOString()
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Customer not found',
        customer_id: req.params.id
      });
    }
    
    res.status(500).json({
      error: 'Failed to retrieve context'
    });
  }
});

module.exports = router;