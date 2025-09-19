const db = require('../config/database');

class ContextEngine {
  constructor() {
    this.redis = null;
    this.mongodb = null;
  }

  async initialize() {
    try {
      this.mongodb = await db.connectMongoDB();
      this.redis = await db.connectRedis();
      console.log('✅ Context Engine initialized successfully');
    } catch (error) {
      console.error('❌ Context Engine initialization failed:', error);
      throw error;
    }
  }

  async getCustomerContext(customerId) {
    try {
      // Buscar dados básicos do cliente no MongoDB
      const customer = await this.mongodb.collection('customers').findOne({
        id: customerId
      });

      // Auto-criar cliente se não existir
      if (!customer) {
        // Auto-criar cliente básico
        const newCustomer = {
          id: customerId,
          name: 'Cliente NetPro',
          plan: 'Fibra 100MB', 
          tier: 'basic',
          created_at: new Date().toISOString()
        };
        
        await this.mongodb.collection('customers').insertOne(newCustomer);
        return { customer: newCustomer, session: null, recent_interactions: [] };
      }

      // Buscar contexto da sessão no Redis
      const sessionKey = `session:${customerId}`;
      const sessionData = await this.redis.get(sessionKey);
           
      // Buscar histórico recente
      const recentInteractions = await this.mongodb
        .collection('interactions')
        .find({ customer_id: customerId })
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();

      return {
        customer,
        session: sessionData ? JSON.parse(sessionData) : null,
        recent_interactions: recentInteractions,
        context_loaded_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Context Engine Error:', error);
      throw error;
    }
  }

  async saveSession(customerId, sessionData) {
    const sessionKey = `session:${customerId}`;
    const ttl = 3600; // 1 hora
         
    await this.redis.setEx(
      sessionKey, 
      ttl, 
      JSON.stringify(sessionData)
    );
  }

  async updateCustomerProfile(customerId, updates) {
    await this.mongodb.collection('customers').updateOne(
      { id: customerId },
      { 
        $set: {
          ...updates,
          updated_at: new Date().toISOString()
        }
      }
    );
  }
}

module.exports = new ContextEngine();