const fs = require('fs').promises;
const path = require('path');
const DatabaseManager = require('./database');
const WebViewManager = require('./webview-manager');

class IRFANBotCore {
  constructor() {
    this.commands = new Map();
    this.postbacks = new Map();
    this.plugins = [];
    this.config = null;
    this.db = null;
    this.webView = null;
    this.isInitialized = false;
  }

  async initialize(configPath) {
    try {
      console.log('🚀 Initializing IRFAN Bot...');
      
      // Load configuration
      const config = require(configPath);
      this.config = config;
      
      // Initialize database
      this.db = new DatabaseManager(config);
      await this.db.initialize();
      
      // Initialize WebView manager
      this.webView = new WebViewManager(config);
      
      // Load plugins
      await this.loadPlugins();
      
      this.isInitialized = true;
      console.log('✅ Bot initialized successfully');
      console.log(`📊 Commands loaded: ${this.commands.size}`);
      console.log(`📊 Postbacks loaded: ${this.postbacks.size}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      throw error;
    }
  }

  async loadPlugins() {
    const pluginsDir = path.join(__dirname, '../plugins/commands');
    
    try {
      const files = await fs.readdir(pluginsDir);
      
      for (const file of files) {
        if (!file.endsWith('.js')) continue;
        
        try {
          const pluginPath = path.join(pluginsDir, file);
          const plugin = require(pluginPath);
          
          // Validate plugin
          if (!this.validatePlugin(plugin)) {
            console.warn(`⚠️ Invalid plugin skipped: ${file}`);
            continue;
          }
          
          // Register command
          this.registerCommand(plugin);
          
          // Register postbacks if any
          if (plugin.postbacks) {
            this.registerPostbacks(plugin);
          }
          
          this.plugins.push({
            name: plugin.config.name,
            file: file,
            loaded: true
          });
          
          console.log(`✅ Loaded plugin: ${plugin.config.name}`);
          
        } catch (error) {
          console.error(`❌ Error loading plugin ${file}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to read plugins directory:', error);
    }
  }

  validatePlugin(plugin) {
    // Check required fields
    if (!plugin.config || !plugin.run) {
      console.warn('Plugin missing config or run method');
      return false;
    }
    
    // Check author
    if (plugin.config.author !== 'IRFAN') {
      console.warn(`Invalid author: ${plugin.config.author}`);
      return false;
    }
    
    // Check name
    if (!plugin.config.name || typeof plugin.config.name !== 'string') {
      console.warn('Invalid command name');
      return false;
    }
    
    // Check prefix override
    if (plugin.config.prefix !== undefined && typeof plugin.config.prefix !== 'boolean') {
      console.warn('Invalid prefix override value');
      return false;
    }
    
    return true;
  }

  registerCommand(plugin) {
    const { name, aliases = [] } = plugin.config;
    
    // Register main command
    this.commands.set(name.toLowerCase(), plugin);
    
    // Register aliases if enabled
    if (this.config.bot.allowAliases !== false) {
      aliases.forEach(alias => {
        const aliasLower = alias.toLowerCase();
        if (!this.commands.has(aliasLower)) {
          this.commands.set(aliasLower, plugin);
        }
      });
    }
  }

  registerPostbacks(plugin) {
    if (!plugin.postbacks) return;
    
    Object.entries(plugin.postbacks).forEach(([type, handler]) => {
      if (typeof handler !== 'function') {
        console.warn(`Invalid postback handler for type: ${type}`);
        return;
      }
      
      if (!this.postbacks.has(type)) {
        this.postbacks.set(type, handler);
      } else {
        console.warn(`Postback type "${type}" already registered`);
      }
    });
  }

  async processMessage(event) {
    if (!this.isInitialized) {
      throw new Error('Bot not initialized');
    }

    try {
      const context = this.buildContext(event);
      
      // Handle postback
      if (event.postback) {
        return await this.handlePostback(event.postback, context);
      }
      
      // Handle message
      if (event.message?.text) {
        return await this.handleMessage(event.message.text, context);
      }
      
      // Handle other message types
      if (event.message) {
        await this.handleOtherMessage(event.message, context);
      }
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      throw error;
    }
  }

  buildContext(event) {
    const context = {
      event,
      senderId: event.sender.id,
      text: event.message?.text || '',
      args: [],
      config: this.config,
      db: this.db,
      webView: this.webView,
      
      // User data methods
      getUser: async (uid) => await this.db.getUser(uid || event.sender.id),
      updateUser: async (uid, data) => await this.db.updateUser(uid || event.sender.id, data),
      
      // Reply method
      reply: async (message) => {
        await this.sendMessage(event.sender.id, message);
      },
      
      // Send message to any user
      send: async (userId, message) => {
        await this.sendMessage(userId, message);
      },
      
      // Check if user is admin
      isAdmin: () => {
        const admins = this.config.admins?.uids || [];
        return admins.includes(event.sender.id);
      },
      
      // Parse postback payload
      getPayloadData: () => {
        if (!event.postback?.payload) return null;
        try {
          return JSON.parse(event.postback.payload);
        } catch {
          return { type: event.postback.payload };
        }
      }
    };
    
    return context;
  }

  async handleMessage(text, ctx) {
    // Clean and prepare text
    const cleanText = text.trim();
    const lowerText = this.config.bot.caseInsensitive ? cleanText.toLowerCase() : cleanText;
    
    // Check for command
    const isPrefixEnabled = this.config.bot.prefixEnabled;
    const prefix = this.config.bot.prefix || '/';
    
    // Parse command and args
    let commandText, args = [];
    
    if (cleanText.startsWith(prefix) && isPrefixEnabled) {
      // Command with prefix
      const parts = cleanText.slice(prefix.length).split(/\s+/);
      commandText = parts[0];
      args = parts.slice(1);
    } else if (!isPrefixEnabled) {
      // No prefix required
      const parts = cleanText.split(/\s+/);
      commandText = parts[0];
      args = parts.slice(1);
    } else {
      // Not a command
      return null;
    }
    
    // Find command
    const commandKey = this.config.bot.caseInsensitive ? commandText.toLowerCase() : commandText;
    const commandPlugin = this.commands.get(commandKey);
    
    if (!commandPlugin) {
      // Command not found
      return null;
    }
    
    // Check prefix override
    const requiresPrefix = commandPlugin.config.prefix !== undefined 
      ? commandPlugin.config.prefix 
      : isPrefixEnabled;
    
    if (requiresPrefix && !cleanText.startsWith(prefix)) {
      // Command requires prefix but message doesn't have it
      return null;
    }
    
    // Check cooldown
    if (await this.isOnCooldown(ctx.senderId, commandPlugin)) {
      const cooldown = commandPlugin.config.cooldown || 3;
      await ctx.reply(`⏳ Please wait ${cooldown} seconds before using this command again.`);
      return;
    }
    
    // Set cooldown
    this.setCooldown(ctx.senderId, commandPlugin);
    
    // Check role/permissions
    if (commandPlugin.config.role > 0 && !ctx.isAdmin()) {
      await ctx.reply('🔒 This command requires admin privileges.');
      return;
    }
    
    // Update context with args
    ctx.args = args;
    ctx.command = commandPlugin.config.name;
    
    // Execute command
    try {
      await commandPlugin.run(ctx);
    } catch (error) {
      console.error(`❌ Error executing command ${commandText}:`, error);
      await ctx.reply('❌ An error occurred while processing your command.');
    }
  }

  async handlePostback(postback, ctx) {
    let payloadData;
    
    try {
      payloadData = typeof postback.payload === 'string' 
        ? JSON.parse(postback.payload) 
        : postback.payload;
    } catch (error) {
      console.error('❌ Failed to parse postback payload:', error);
      payloadData = { type: postback.payload };
    }
    
    if (!payloadData.type) {
      console.warn('⚠️ Postback without type:', postback);
      return;
    }
    
    const handler = this.postbacks.get(payloadData.type);
    
    if (handler) {
      try {
        // Update context with payload data
        ctx.payloadData = payloadData;
        
        // Execute postback handler
        const result = await handler(ctx);
        
        if (result === false) {
          // Handler indicated not to process further
          return;
        }
      } catch (error) {
        console.error(`❌ Error in postback handler ${payloadData.type}:`, error);
        await ctx.reply('❌ An error occurred while processing your action.');
      }
    } else {
      console.warn(`⚠️ No handler for postback type: ${payloadData.type}`);
    }
  }

  async handleOtherMessage(message, ctx) {
    // Handle attachments, stickers, etc.
    if (message.attachments) {
      await ctx.reply('📎 I received your attachment. File support coming soon!');
    }
  }

  async sendMessage(userId, message) {
    try {
      const url = `https://graph.facebook.com/v18.0/me/messages`;
      const params = new URLSearchParams({
        access_token: this.config.pageAccessToken
      });
      
      const payload = {
        recipient: { id: userId },
        message: typeof message === 'string' ? { text: message } : message,
        messaging_type: 'RESPONSE'
      };
      
      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to send message:', error);
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  async isOnCooldown(userId, plugin) {
    // Simple in-memory cooldown (can be enhanced with Redis)
    const cooldown = plugin.config.cooldown || 3;
    if (cooldown <= 0) return false;
    
    const key = `cooldown:${userId}:${plugin.config.name}`;
    const lastUsed = this.cooldownCache?.[key];
    
    if (!lastUsed) return false;
    
    const elapsed = Date.now() - lastUsed;
    return elapsed < (cooldown * 1000);
  }

  setCooldown(userId, plugin) {
    const cooldown = plugin.config.cooldown;
    if (!cooldown || cooldown <= 0) return;
    
    const key = `cooldown:${userId}:${plugin.config.name}`;
    this.cooldownCache = this.cooldownCache || {};
    this.cooldownCache[key] = Date.now();
    
    // Clean up old cooldowns periodically
    setTimeout(() => {
      delete this.cooldownCache[key];
    }, cooldown * 1000 + 1000);
  }
}

module.exports = IRFANBotCore;