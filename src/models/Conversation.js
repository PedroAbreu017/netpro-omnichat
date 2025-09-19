const { ObjectId } = require('mongodb');

class ConversationModel {
  static schema = {
    _id: ObjectId,
    id: String,
    customer_id: String,
    channel: {
      type: String,
      enum: ['whatsapp', 'email', 'web_chat', 'phone'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'escalated', 'abandoned'],
      default: 'active'
    },
    session_id: String,
    messages: [
      {
        id: String,
        sender: {
          type: String,
          enum: ['customer', 'ai', 'agent'],
          required: true
        },
        content: {
          text: String,
          type: {
            type: String,
            enum: ['text', 'image', 'document', 'audio', 'interactive']
          },
          metadata: Object
        },
        timestamp: { type: Date, default: Date.now },
        ai_analysis: {
          intent: String,
          confidence: Number,
          sentiment: String,
          actions_taken: [String]
        }
      }
    ],
    ai_classification: {
      primary_intent: String,
      confidence: Number,
      complexity: {
        type: String,
        enum: ['simple', 'medium', 'complex']
      },
      auto_resolvable: Boolean,
      processing_time_ms: Number
    },
    routing_info: {
      department: String,
      agent_id: String,
      escalation_reason: String,
      routing_time: Date
    },
    resolution: {
      type: {
        type: String,
        enum: ['ai_automated', 'human_assisted', 'escalated', 'abandoned']
      },
      resolution_time: Date,
      total_duration_seconds: Number,
      satisfaction_score: Number,
      feedback: String
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    closed_at: Date
  };

  static validate(data) {
    const errors = [];

    if (!data.customer_id) {
      errors.push('Customer ID is required');
    }

    if (!data.channel || !['whatsapp', 'email', 'web_chat', 'phone'].includes(data.channel)) {
      errors.push('Valid channel is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static createMessage(sender, content, aiAnalysis = null) {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender,
      content,
      timestamp: new Date(),
      ai_analysis: aiAnalysis
    };
  }

  static calculateDuration(startTime, endTime = new Date()) {
    return Math.floor((endTime - startTime) / 1000);
  }
}

module.exports = ConversationModel;