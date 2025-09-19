const { MongoClient } = require('mongodb');
const redis = require('redis');

class DatabaseConnection {
  constructor() {
    this.mongodb = null;
    this.redis = null;
  }

  async connectMongoDB() {
    try {
      this.mongodb = new MongoClient(process.env.MONGODB_URI);
      await this.mongodb.connect();
      console.log('✅ MongoDB connected successfully');
      return this.mongodb.db('netpro-omnichat');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async connectRedis() {
    try {
      this.redis = redis.createClient({
        url: process.env.REDIS_URL
      });
      
      this.redis.on('error', (err) => console.error('Redis error:', err));
      await this.redis.connect();
      console.log('✅ Redis connected successfully');
      return this.redis;
    } catch (error) {
      console.error('❌ Redis connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.mongodb) {
      await this.mongodb.close();
      console.log('MongoDB disconnected');
    }
    if (this.redis) {
      await this.redis.quit();
      console.log('Redis disconnected');
    }
  }
}

module.exports = new DatabaseConnection();
