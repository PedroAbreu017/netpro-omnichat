const { ObjectId } = require('mongodb');

class TicketModel {
  static schema = {
    _id: ObjectId,
    id: String,
    external_id: String, // ID no CRM externo
    conversation_id: String,
    customer_id: String,
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
      default: 'open'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['technical_support', 'billing', 'commercial', 'general'],
      required: true
    },
    sub_category: String,
    title: String,
    description: String,
    channel: String,
    assigned_to: {
      agent_id: String,
      department: String,
      assigned_at: Date
    },
    sla: {
      response_deadline: Date,
      resolution_deadline: Date,
      escalation_deadline: Date
    },
    resolution: {
      resolved_at: Date,
      resolved_by: String,
      resolution_method: {
        type: String,
        enum: ['ai_automated', 'agent_manual', 'escalated', 'customer_self_service']
      },
      resolution_notes: String,
      customer_satisfaction: Number, // 1-5
      resolution_time_minutes: Number
    },
    interactions: [
      {
        timestamp: Date,
        type: {
          type: String,
          enum: ['status_change', 'assignment', 'note', 'escalation', 'resolution']
        },
        performed_by: String,
        details: String
      }
    ],
    webhook_deliveries: [
      {
        webhook_id: String,
        event_type: String,
        delivered_at: Date,
        success: Boolean,
        attempts: Number,
        response_code: Number
      }
    ],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    closed_at: Date
  };

  static validate(data) {
    const errors = [];

    if (!data.customer_id) {
      errors.push('Customer ID is required');
    }

    if (!data.category) {
      errors.push('Category is required');
    }

    if (!data.title || data.title.length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generateId() {
    return `TKT_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  static calculatePriority(customerTier, category, previousTickets) {
    let priority = 'medium';

    // Cliente premium = prioridade alta
    if (customerTier === 'premium') priority = 'high';
    
    // Problemas técnicos = prioridade alta
    if (category === 'technical_support') priority = 'high';
    
    // Múltiplos tickets = prioridade urgente
    if (previousTickets > 3) priority = 'urgent';

    return priority;
  }

  static calculateSLA(priority, category) {
    const slaMatrix = {
      urgent: { response: 15, resolution: 120 }, // 15min, 2h
      high: { response: 30, resolution: 240 },   // 30min, 4h
      medium: { response: 60, resolution: 480 }, // 1h, 8h
      low: { response: 120, resolution: 1440 }   // 2h, 24h
    };

    const sla = slaMatrix[priority] || slaMatrix.medium;
    const now = new Date();

    return {
      response_deadline: new Date(now.getTime() + sla.response * 60000),
      resolution_deadline: new Date(now.getTime() + sla.resolution * 60000),
      escalation_deadline: new Date(now.getTime() + (sla.response * 2) * 60000)
    };
  }
}

module.exports = TicketModel;