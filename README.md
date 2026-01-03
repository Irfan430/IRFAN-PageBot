```markdown
# IRFAN 3D Page Bot

A production-grade Facebook Page Bot with 3D WebViews, MongoDB auto-fallback, and plugin architecture.

## 🚀 Features

- **3D WebView Games**: Immersive slot and dice games using Three.js
- **MongoDB Primary**: Automatic connection with JSON fallback
- **Plugin System**: Easy to extend with new commands
- **Vercel Ready**: Serverless deployment optimized
- **Production Ready**: Error handling, logging, monitoring

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/irfan-pagebot.git
cd irfan-pagebot
```

1. Install dependencies:

```bash
npm install
```

1. Configure environment:

```bash
cp config/config.example.json config/config.json
# Edit config.json with your credentials
```

1. Set environment variables in .env.local:

```
MONGODB_URI=mongodb+srv://...
PAGE_ACCESS_TOKEN=EA...
VERIFY_TOKEN=your_token
JWT_SECRET=your_secret_key
```

🔧 Configuration

Edit config/config.json:

· pageAccessToken: Facebook Page Access Token
· verifyToken: Webhook verification token
· mongodbUri: MongoDB connection string (optional)
· Configure bot behavior, economy, games

🎮 Games System

Available Games:

· Slot Machine: 3D slot game with WebView
· Dice Game: Predict high/low dice rolls
· Balance System: Virtual currency with transfers

Game Features:

· Real-time balance updates
· Game statistics tracking
· Admin controls
· 3D visualizations

🗄️ Database

MongoDB (Primary):

```javascript
// Users collection
{
  userId: String,
  money: Number,
  level: Number,
  gameStats: Object,
  createdAt: Date
}
```

JSON Fallback:

If MongoDB fails, automatically falls back to data/local/users.json

🔌 Plugin Development

Create new commands in plugins/commands/:

```javascript
module.exports = {
  config: {
    name: "command",
    aliases: ["alias"],
    author: "IRFAN",
    description: "Command description",
    prefix: false, // true/false to override global
    cooldown: 5
  },
  
  run: async (ctx) => {
    // Command logic
    await ctx.reply("Hello World!");
  },
  
  postbacks: {
    "action_type": async (ctx) => {
      // Handle postback
      return true;
    }
  }
};
```

🌐 WebView Integration

Generating WebView URLs:

```javascript
// In plugins:
const url = ctx.webView.getSlotGameUrl(userId, bet);
```

WebView Authentication:

Uses JWT tokens for secure user sessions.

🚀 Deployment

Vercel:

```bash
vercel
```

Environment Variables on Vercel:

· MONGODB_URI
· PAGE_ACCESS_TOKEN
· VERIFY_TOKEN
· JWT_SECRET

📁 Project Structure

```
irfan-pagebot/
├── app/                    # Next.js app
├── core/                  # Bot core system
├── plugins/              # Command plugins
├── config/               # Configuration
├── lib/                  # Utilities
└── data/                 # Local data storage
```

🛠️ Development

1. Start development server:

```bash
npm run dev
```

1. Set up ngrok for local webhook:

```bash
ngrok http 3000
```

1. Update Facebook webhook URL to ngrok URL.

🔍 Debugging

Check logs in:

· Console output
· data/local/logs.json
· Vercel function logs

📄 License

MIT License

👥 Support

For issues and questions, please open a GitHub issue.

```

---

## **✅ Installation & Setup Guide**

### **1. Initialize Project:**
```bash
mkdir irfan-pagebot
cd irfan-pagebot
npm init -y
npm install next react react-dom mongoose axios jsonwebtoken three @react-three/fiber @react-three/drei lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. Create Folder Structure:

```bash
mkdir -p app/api/{webhook,webview/games/slot} core plugins/commands config lib data/local
```

3. Copy all files to their locations

4. Configure Facebook App:

1. Go to Facebook Developers
2. Create a new app
3. Add Messenger product
4. Create Page Access Token
5. Set up webhook with your Vercel URL

5. Deploy to Vercel:

```bash
vercel
```

---

🔧 Environment Variables:

Create .env.local:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/botdb
PAGE_ACCESS_TOKEN=EAAY...
VERIFY_TOKEN=irfan_bot_3d_2024
JWT_SECRET=your_super_secret_jwt_key
APP_SECRET=your_facebook_app_secret
NEXT_PUBLIC_URL=https://your-bot.vercel.app
```

---

🎯 Bot Features Summary:

1. ✅ MongoDB Primary Storage with auto JSON fallback
2. ✅ 3D WebView Games with Three.js integration
3. ✅ Plugin Architecture - easy to extend
4. ✅ Complete Error Handling - never crashes
5. ✅ Vercel Optimized - serverless ready
6. ✅ Real-time Economy System with transfers
7. ✅ Admin Controls - manage users and balances
8. ✅ Game Statistics - track wins and performance
9. ✅ Secure Authentication - JWT for WebViews
10. ✅ Production Ready - logging, monitoring, scaling

---

The bot is now COMPLETE and READY for production deployment! 🚀

To deploy:

1. Copy all files to their respective locations
2. Update config/config.json with your credentials
3. Set environment variables
4. Run vercel to deploy
5. Set up Facebook webhook with your Vercel URL
6. Your bot is LIVE! 🎉
