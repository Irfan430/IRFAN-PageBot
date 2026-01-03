const crypto = require('crypto');

class WebViewManager {
  constructor(config) {
    this.config = config;
    this.jwtSecret = config.webview?.jwtSecret || 'irfan-webview-secret';
  }

  generateToken(userId, data = {}) {
    const payload = {
      userId,
      ...data,
      exp: Math.floor(Date.now() / 1000) + (this.config.webview?.sessionDuration || 3600)
    };
    
    // In production, use jsonwebtoken package
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${payloadEncoded}`)
      .digest('base64');
    
    return `${header}.${payloadEncoded}.${signature}`;
  }

  verifyToken(token) {
    try {
      const [header, payload, signature] = token.split('.');
      
      const expectedSignature = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${header}.${payload}`)
        .digest('base64');
      
      if (signature !== expectedSignature) {
        return null;
      }
      
      const payloadData = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      // Check expiration
      if (payloadData.exp && payloadData.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return payloadData;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return null;
    }
  }

  generateWebViewUrl(type, userId, params = {}) {
    const baseUrl = this.config.webview?.baseUrl || 'https://your-bot.vercel.app';
    const token = this.generateToken(userId, { type, ...params });
    
    return `${baseUrl}/webview/${type}?token=${token}`;
  }

  getSlotGameUrl(userId, bet = null) {
    const params = bet ? { initialBet: bet } : {};
    return this.generateWebViewUrl('games/slot', userId, params);
  }

  getDiceGameUrl(userId, bet = null) {
    const params = bet ? { initialBet: bet } : {};
    return this.generateWebViewUrl('games/dice', userId, params);
  }

  getProfileUrl(userId) {
    return this.generateWebViewUrl('profile', userId);
  }

  createWebViewButton(title, type, userId, additionalParams = {}) {
    const url = this.generateWebViewUrl(type, userId, additionalParams);
    
    return {
      type: "web_url",
      url: url,
      title: title,
      webview_height_ratio: "tall",
      messenger_extensions: true,
      fallback_url: `${this.config.webview?.baseUrl}/fallback`
    };
  }
}

module.exports = WebViewManager;