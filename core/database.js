const fs = require('fs').promises;
const path = require('path');

class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.mongoClient = null;
    this.jsonData = {};
    this.usingMongoDB = false;
    this.cache = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('📦 Initializing database...');
      
      // Try MongoDB first
      if (this.config.database?.mongoUri) {
        const connected = await this.connectMongoDB();
        if (connected) {
          this.usingMongoDB = true;
          console.log('✅ Using MongoDB as primary database');
          return;
        }
      }
      
      // Fallback to JSON
      await this.initializeJSON();
      console.log('✅ Using JSON as fallback database');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    } finally {
      this.initialized = true;
    }
  }

  async connectMongoDB() {
    try {
      const { MongoClient } = await import('mongodb');
      
      const client = new MongoClient(this.config.database.mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      await client.connect();
      this.mongoClient = client;
      this.db = client.db();
      
      // Create indexes
      await this.createIndexes();
      
      return true;
    } catch (error) {
      console.warn('⚠️ MongoDB connection failed:', error.message);
      return false;
    }
  }

  async createIndexes() {
    if (!this.usingMongoDB) return;
    
    try {
      await this.db.collection('users').createIndex({ userId: 1 }, { unique: true });
      await this.db.collection('transactions').createIndex({ userId: 1, timestamp: -1 });
      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
    }
  }

  async initializeJSON() {
    const jsonPath = path.join(__dirname, '../data/local/users.json');
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(jsonPath), { recursive: true });
      
      // Load existing data or create new
      try {
        const data = await fs.readFile(jsonPath, 'utf8');
        this.jsonData = JSON.parse(data);
        console.log(`✅ Loaded ${Object.keys(this.jsonData).length} users from JSON`);
      } catch (error) {
        // File doesn't exist, create empty
        this.jsonData = {};
        await this.saveJSON();
        console.log('✅ Created new JSON database');
      }
    } catch (error) {
      console.error('❌ Failed to initialize JSON database:', error);
      throw error;
    }
  }

  async getUser(userId) {
    // Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }
    
    let userData;
    
    if (this.usingMongoDB) {
      userData = await this.getUserMongo(userId);
    } else {
      userData = await this.getUserJSON(userId);
    }
    
    // Cache the result
    if (userData) {
      this.cache.set(userId, userData);
      // Auto remove from cache after 5 minutes
      setTimeout(() => this.cache.delete(userId), 300000);
    }
    
    return userData;
  }

  async getUserMongo(userId) {
    try {
      const user = await this.db.collection('users').findOne({ userId });
      
      if (user) {
        return user;
      }
      
      // Create new user if not exists
      return await this.createNewUser(userId);
      
    } catch (error) {
      console.error('❌ MongoDB getUser error:', error);
      throw error;
    }
  }

  async getUserJSON(userId) {
    if (this.jsonData[userId]) {
      return this.jsonData[userId];
    }
    
    // Create new user
    return await this.createNewUser(userId);
  }

  async createNewUser(userId) {
    const newUser = {
      userId,
      name: `User_${userId.slice(-4)}`,
      money: this.config.economy?.startBalance || 1000,
      level: 1,
      experience: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      },
      inventory: [],
      gameStats: {}
    };
    
    // Save to database
    await this.updateUser(userId, newUser);
    
    return newUser;
  }

  async updateUser(userId, data) {
    // Update cache
    if (this.cache.has(userId)) {
      const cached = this.cache.get(userId);
      Object.assign(cached, data);
      cached.updatedAt = new Date().toISOString();
    }
    
    if (this.usingMongoDB) {
      await this.updateUserMongo(userId, data);
    } else {
      await this.updateUserJSON(userId, data);
    }
  }

  async updateUserMongo(userId, data) {
    try {
      data.updatedAt = new Date().toISOString();
      
      await this.db.collection('users').updateOne(
        { userId },
        { $set: data },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ MongoDB update error:', error);
      throw error;
    }
  }

  async updateUserJSON(userId, data) {
    data.updatedAt = new Date().toISOString();
    
    if (!this.jsonData[userId]) {
      this.jsonData[userId] = await this.createNewUser(userId);
    }
    
    Object.assign(this.jsonData[userId], data);
    
    // Save to file
    await this.saveJSON();
  }

  async saveJSON() {
    try {
      const jsonPath = path.join(__dirname, '../data/local/users.json');
      await fs.writeFile(jsonPath, JSON.stringify(this.jsonData, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Failed to save JSON:', error);
    }
  }

  async addMoney(userId, amount) {
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const newBalance = (user.money || 0) + amount;
    
    await this.updateUser(userId, { 
      money: newBalance,
      lastTransaction: {
        type: 'add',
        amount,
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      success: true,
      oldBalance: user.money,
      newBalance,
      userId
    };
  }

  async deductMoney(userId, amount) {
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.money < amount) {
      return {
        success: false,
        message: 'Insufficient balance',
        currentBalance: user.money,
        required: amount
      };
    }
    
    const newBalance = user.money - amount;
    
    await this.updateUser(userId, { 
      money: newBalance,
      lastTransaction: {
        type: 'deduct',
        amount,
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      success: true,
      oldBalance: user.money,
      newBalance,
      userId
    };
  }

  async transferMoney(fromUserId, toUserId, amount) {
    if (fromUserId === toUserId) {
      return {
        success: false,
        message: 'Cannot transfer to yourself'
      };
    }
    
    // Start transaction
    const deductResult = await this.deductMoney(fromUserId, amount);
    
    if (!deductResult.success) {
      return deductResult;
    }
    
    try {
      const addResult = await this.addMoney(toUserId, amount);
      
      // Log transaction
      await this.logTransaction({
        fromUserId,
        toUserId,
        amount,
        type: 'transfer',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        from: deductResult,
        to: addResult
      };
      
    } catch (error) {
      // Rollback - add money back to sender
      await this.addMoney(fromUserId, amount);
      
      return {
        success: false,
        message: 'Transfer failed',
        error: error.message
      };
    }
  }

  async logTransaction(data) {
    try {
      if (this.usingMongoDB) {
        await this.db.collection('transactions').insertOne(data);
      } else {
        // Store in JSON if needed
        const logPath = path.join(__dirname, '../data/local/transactions.json');
        let logs = [];
        
        try {
          const existing = await fs.readFile(logPath, 'utf8');
          logs = JSON.parse(existing);
        } catch (error) {
          // File doesn't exist
        }
        
        logs.push(data);
        await fs.writeFile(logPath, JSON.stringify(logs, null, 2), 'utf8');
      }
    } catch (error) {
      console.error('❌ Failed to log transaction:', error);
    }
  }
}

module.exports = DatabaseManager;