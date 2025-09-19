// src/routes/customers.js
const express = require('express');
const contextEngine = require('../services/contextEngine');

const router = express.Router();

// GET /api/v1/customers/:id
// Busca dados completos do cliente
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customerData = await contextEngine.getCustomerContext(id);

    const response = {
      customer: customerData.customer,
      subscription: {
        plan_name: customerData.customer.plan || 'Fibra 100MB',
        monthly_fee: 69.90,
        status: 'active',
        due_day: 15
      },
      financial_status: {
        status: 'em_dia',
        pending_amount: 0.00,
        last_payment: '2024-01-15'
      },
      technical_profile: {
        connection_type: 'fibra_optica',
        contracted_speed: '100MB',
        avg_usage: '85GB/month'
      },
      interaction_summary: {
        total_interactions: customerData.recent_interactions?.length || 0,
        last_contact: customerData.recent_interactions?.[0]?.timestamp || null,
        satisfaction_avg: 4.5
      }
    };

    res.json({
      success: true,
      ...response,
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
      error: 'Failed to retrieve customer data'
    });
  }
});

// PUT /api/v1/customers/:id
// Atualiza dados do cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await contextEngine.updateCustomerProfile(id, updates);

    res.json({
      success: true,
      message: 'Customer profile updated successfully',
      customer_id: id,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to update customer profile'
    });
  }
});

// POST /api/v1/customers/mock-data
// Cria dados fictícios para demo
router.post('/mock-data', async (req, res) => {
  try {
    const mockCustomers = [
      {
        id: 'CUST_12345',
        cpf: '123.456.789-00',
        name: 'João Silva Santos',
        email: 'joao.silva@email.com',
        phone: '+5521987654321',
        plan: 'Fibra Premium 200MB',
        tier: 'premium',
        created_at: new Date().toISOString()
      },
      {
        id: 'CUST_67890',
        cpf: '987.654.321-00',
        name: 'Maria Santos Oliveira',
        email: 'maria.santos@email.com',
        phone: '+5521987654322',
        plan: 'Fibra Basic 100MB',
        tier: 'basic',
        created_at: new Date().toISOString()
      }
    ];

    // Em um ambiente real, salvaria no MongoDB
    res.json({
      success: true,
      message: 'Mock data created successfully',
      customers: mockCustomers,
      count: mockCustomers.length
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to create mock data'
    });
  }
});

module.exports = router;