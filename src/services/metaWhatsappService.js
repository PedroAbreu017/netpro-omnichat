// src/services/metaWhatsappService.js
const crypto = require('crypto');

class MetaWhatsappService {
  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN || 'mock_token_demo';
    this.webhookVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'netpro_verify_token';
    this.phoneNumberId = process.env.META_PHONE_NUMBER_ID || '123456789';
    this.businessAccountId = process.env.META_BUSINESS_ACCOUNT_ID || 'netpro_business';
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    // Rate limiting - WhatsApp Business API limits
    this.rateLimits = {
      messages_per_second: 20,
      messages_per_minute: 1000,
      messages_per_day: 100000
    };
    
    // Message templates aprovados pela META
    this.approvedTemplates = {
      welcome: {
        name: 'netpro_welcome',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            type: 'BODY',
            text: 'Olá {{1}}! Bem-vindo à NetPro. Seu plano {{2}} está ativo. Como posso ajudar?'
          }
        ]
      },
      technical_support: {
        name: 'netpro_tech_support',
        category: 'UTILITY', 
        language: 'pt_BR',
        components: [
          {
            type: 'BODY',
            text: 'Olá {{1}}! Detectamos instabilidade na sua conexão {{2}}. Nossa equipe técnica já foi notificada. Posso executar um teste remoto?'
          },
          {
            type: 'BUTTONS',
            buttons: [
              {
                type: 'QUICK_REPLY',
                text: 'Sim, executar teste'
              },
              {
                type: 'QUICK_REPLY', 
                text: 'Agendar técnico'
              }
            ]
          }
        ]
      },
      billing_reminder: {
        name: 'netpro_billing',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            type: 'BODY',
            text: 'Olá {{1}}! Sua fatura de {{2}} no valor de R$ {{3}} vence em {{4}} dias. Deseja receber a segunda via?'
          },
          {
            type: 'BUTTONS',
            buttons: [
              {
                type: 'QUICK_REPLY',
                text: 'Enviar segunda via'
              },
              {
                type: 'QUICK_REPLY',
                text: 'Falar com atendente'
              }
            ]
          }
        ]
      }
    };
  }

  // Webhook verification - META requirement
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      console.log('✅ WhatsApp webhook verified successfully');
      return challenge;
    } else {
      console.error('❌ WhatsApp webhook verification failed');
      return null;
    }
  }

  // Process incoming webhook from WhatsApp
  async processIncomingWebhook(body, signature) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(body, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { entry } = body;
      if (!entry || entry.length === 0) {
        return null;
      }

      const changes = entry[0].changes;
      if (!changes || changes.length === 0) {
        return null;
      }

      const value = changes[0].value;
      const messages = value.messages;
      
      if (!messages || messages.length === 0) {
        return null; // Status update, not a message
      }

      // Process each message
      const processedMessages = [];
      for (const message of messages) {
        const processed = await this.processMessage(message, value.contacts);
        processedMessages.push(processed);
      }

      return processedMessages;

    } catch (error) {
      console.error('WhatsApp webhook processing error:', error);
      throw error;
    }
  }

  async processMessage(message, contacts) {
    const contact = contacts?.find(c => c.wa_id === message.from);
    
    return {
      message_id: message.id,
      from: message.from,
      timestamp: message.timestamp,
      type: message.type,
      content: this.extractMessageContent(message),
      contact_info: {
        name: contact?.profile?.name || 'Unknown',
        wa_id: message.from
      },
      context: message.context, // Reply context if applicable
      metadata: {
        received_at: new Date().toISOString(),
        phone_number_id: this.phoneNumberId
      }
    };
  }

  extractMessageContent(message) {
    switch (message.type) {
      case 'text':
        return {
          text: message.text.body
        };
      case 'image':
        return {
          image_id: message.image.id,
          mime_type: message.image.mime_type,
          caption: message.image.caption || null
        };
      case 'document':
        return {
          document_id: message.document.id,
          filename: message.document.filename,
          mime_type: message.document.mime_type
        };
      case 'audio':
        return {
          audio_id: message.audio.id,
          mime_type: message.audio.mime_type
        };
      case 'interactive':
        return {
          interactive_type: message.interactive.type,
          response: message.interactive.button_reply || message.interactive.list_reply
        };
      default:
        return {
          unsupported_type: message.type
        };
    }
  }

  // Send text message
  async sendTextMessage(to, text, context = null) {
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: text
      }
    };

    if (context) {
      payload.context = {
        message_id: context.message_id
      };
    }

    return this.sendMessage(payload);
  }

  // Send template message (for business initiated conversations)
  async sendTemplateMessage(to, templateName, languageCode = 'pt_BR', components = []) {
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    return this.sendMessage(payload);
  }

  // Send interactive message with buttons
  async sendInteractiveMessage(to, body, buttons, header = null) {
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: body
        },
        action: {
          buttons: buttons.map((button, index) => ({
            type: 'reply',
            reply: {
              id: `btn_${index}`,
              title: button
            }
          }))
        }
      }
    };

    if (header) {
      payload.interactive.header = {
        type: 'text',
        text: header
      };
    }

    return this.sendMessage(payload);
  }

  // Send list message
  async sendListMessage(to, body, buttonText, sections) {
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: body
        },
        action: {
          button: buttonText,
          sections: sections
        }
      }
    };

    return this.sendMessage(payload);
  }

  // Generic send message function
  async sendMessage(payload) {
    try {
      // Mock response for demo - em produção seria fetch real
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{
          input: payload.to,
          wa_id: payload.to
        }],
        messages: [{
          id: `wamid.${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }]
      };

      console.log('📱 WhatsApp message sent (MOCK):', {
        to: payload.to,
        type: payload.type,
        message_id: mockResponse.messages[0].id
      });

      return {
        success: true,
        message_id: mockResponse.messages[0].id,
        recipient: payload.to,
        type: payload.type,
        timestamp: new Date().toISOString()
      };

      /* Em produção seria algo assim:
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
      */

    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId) {
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    };

    // Mock implementation
    console.log('✓ Message marked as read (MOCK):', messageId);
    return { success: true };
  }

  // Get message delivery status
  async getMessageStatus(messageId) {
    // Mock implementation
    return {
      id: messageId,
      status: 'delivered',
      timestamp: new Date().toISOString(),
      recipient_id: '5521987654321'
    };
  }

  // Verify webhook signature from META
  verifyWebhookSignature(body, signature) {
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.META_APP_SECRET || 'demo_secret')
      .update(JSON.stringify(body))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', ''), 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Get available templates
  getApprovedTemplates() {
    return this.approvedTemplates;
  }

  // Build template components for NetPro specific use cases
  buildWelcomeTemplate(customerName, planName) {
    return [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: customerName },
          { type: 'text', text: planName }
        ]
      }
    ];
  }

  buildTechSupportTemplate(customerName, connectionType) {
    return [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: customerName },
          { type: 'text', text: connectionType }
        ]
      }
    ];
  }

  buildBillingTemplate(customerName, month, amount, daysUntilDue) {
    return [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: customerName },
          { type: 'text', text: month },
          { type: 'text', text: amount.toFixed(2) },
          { type: 'text', text: daysUntilDue.toString() }
        ]
      }
    ];
  }

  // Helper for NetPro specific interactions
  async sendNetProWelcome(to, customerName, planName) {
    const components = this.buildWelcomeTemplate(customerName, planName);
    return this.sendTemplateMessage(to, 'netpro_welcome', 'pt_BR', components);
  }

  async sendTechnicalSupportMessage(to, customerName, issue) {
    const buttons = [
      'Executar teste remoto',
      'Agendar visita técnica',
      'Falar com especialista'
    ];

    return this.sendInteractiveMessage(
      to,
      `Olá ${customerName}! Vou ajudar com: ${issue}. Como prefere resolver?`,
      buttons,
      'NetPro Suporte Técnico'
    );
  }

  async sendBillingOptions(to, customerName, amount) {
    const sections = [
      {
        title: 'Opções de Pagamento',
        rows: [
          {
            id: 'segunda_via',
            title: 'Segunda Via',
            description: 'Receber boleto por email'
          },
          {
            id: 'pix',
            title: 'PIX',
            description: 'Gerar chave PIX para pagamento'
          },
          {
            id: 'parcelamento',
            title: 'Parcelamento',
            description: 'Negociar parcelamento'
          }
        ]
      }
    ];

    return this.sendListMessage(
      to,
      `Olá ${customerName}! Sua fatura de R$ ${amount.toFixed(2)} está disponível. Como deseja pagar?`,
      'Ver opções',
      sections
    );
  }
}

module.exports = new MetaWhatsappService();

