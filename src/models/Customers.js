const { ObjectId } = require('mongodb');

class CustomerModel {
  static schema = {
    _id: ObjectId,
    id: String,
    cpf: String,
    name: String,
    email: String,
    phone: String,
    plan: {
      type: String,
      name: String,
      speed: String,
      monthly_fee: Number,
      contract_date: Date,
      due_day: Number
    },
    tier: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    financial_status: {
      status: {
        type: String,
        enum: ['em_dia', 'inadimplente', 'negociacao'],
        default: 'em_dia'
      },
      pending_amount: { type: Number, default: 0 },
      last_payment_date: Date,
      payment_method: String
    },
    technical_profile: {
      connection_type: String,
      equipment: [
        {
          type: String,
          model: String,
          serial: String,
          installation_date: Date
        }
      ],
      installation_address: {
        street: String,
        neighborhood: String,
        city: String,
        state: String,
        zipcode: String
      }
    },
    preferences: {
      communication_channel: {
        type: String,
        enum: ['whatsapp', 'email', 'phone', 'web_chat'],
        default: 'whatsapp'
      },
      language: { type: String, default: 'pt_BR' },
      notifications: {
        billing: { type: Boolean, default: true },
        technical: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false }
      }
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    last_interaction: Date,
    total_interactions: { type: Number, default: 0 }
  };

  static validate(data) {
    const errors = [];

    if (!data.name || data.name.length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!data.cpf || !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data.cpf)) {
      errors.push('CPF must be in format XXX.XXX.XXX-XX');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.phone || !/^\+?[\d\s-()]+$/.test(data.phone)) {
      errors.push('Invalid phone format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitize(data) {
    return {
      ...data,
      name: data.name?.trim(),
      email: data.email?.toLowerCase().trim(),
      phone: data.phone?.replace(/\D/g, ''),
      updated_at: new Date()
    };
  }

  static defaultCustomer(id) {
    return {
      id,
      name: 'Cliente NetPro',
      tier: 'basic',
      plan: {
        name: 'Fibra 100MB',
        speed: '100MB',
        monthly_fee: 69.90
      },
      financial_status: {
        status: 'em_dia',
        pending_amount: 0
      },
      preferences: {
        communication_channel: 'whatsapp',
        language: 'pt_BR'
      },
      created_at: new Date(),
      updated_at: new Date(),
      total_interactions: 0
    };
  }
}

module.exports = CustomerModel;