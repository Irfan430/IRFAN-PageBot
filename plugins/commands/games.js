module.exports = {
  config: {
    name: "games",
    aliases: ["game", "play"],
    author: "IRFAN",
    description: "Open the games menu",
    prefix: false,
    cooldown: 3
  },

  run: async (ctx) => {
    const user = await ctx.getUser();
    
    await ctx.reply({
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "🎮 Game Center",
            subtitle: `Balance: ${user.money}${ctx.config.economy?.currencySymbol || '💵'} | Level: ${user.level || 1}`,
            image_url: "https://your-bot.vercel.app/images/games-banner.jpg",
            buttons: [
              {
                type: "postback",
                title: "🎰 Slot Machine",
                payload: JSON.stringify({ type: "slot_open" })
              },
              {
                type: "postback",
                title: "🎲 Dice Game",
                payload: JSON.stringify({ type: "dice_open" })
              },
              {
                type: "web_url",
                url: ctx.webView.getProfileUrl(ctx.senderId),
                title: "📊 My Stats",
                webview_height_ratio: "tall",
                messenger_extensions: true
              }
            ]
          }]
        }
      }
    });
  },

  postbacks: {
    slot_open: async (ctx) => {
      await module.exports.runSlot(ctx);
      return true;
    },
    
    dice_open: async (ctx) => {
      await module.exports.runDice(ctx);
      return true;
    }
  },

  runSlot: async (ctx) => {
    const user = await ctx.getUser();
    
    const message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: `🎰 **Slot Machine**\n\nBalance: ${user.money}${ctx.config.economy?.currencySymbol || '💵'}\n\nChoose your bet amount:`,
          buttons: [
            {
              type: "postback",
              title: "🎯 Bet 100",
              payload: JSON.stringify({ type: "slot_spin", bet: 100 })
            },
            {
              type: "postback",
              title: "🎯 Bet 500",
              payload: JSON.stringify({ type: "slot_spin", bet: 500 })
            },
            {
              type: "postback",
              title: "🎯 Bet 1000",
              payload: JSON.stringify({ type: "slot_spin", bet: 1000 })
            },
            {
              type: "web_url",
              url: ctx.webView.getSlotGameUrl(ctx.senderId),
              title: "🎮 3D Slot (Beta)",
              webview_height_ratio: "tall",
              messenger_extensions: true
            }
          ]
        }
      }
    };
    
    await ctx.reply(message);
  },

  runDice: async (ctx) => {
    const user = await ctx.getUser();
    
    const message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: `🎲 **Dice Game**\n\nBalance: ${user.money}${ctx.config.economy?.currencySymbol || '💵'}\n\nPredict if the roll will be HIGH (4-6) or LOW (1-3):`,
          buttons: [
            {
              type: "postback",
              title: "⬆️ HIGH (4-6) - Bet 100",
              payload: JSON.stringify({ type: "dice_roll", bet: 100, prediction: "high" })
            },
            {
              type: "postback",
              title: "⬇️ LOW (1-3) - Bet 100",
              payload: JSON.stringify({ type: "dice_roll", bet: 100, prediction: "low" })
            },
            {
              type: "postback",
              title: "🎯 Bet 500",
              payload: JSON.stringify({ type: "dice_menu", bet: 500 })
            },
            {
              type: "web_url",
              url: ctx.webView.getDiceGameUrl(ctx.senderId),
              title: "🎮 3D Dice (Beta)",
              webview_height_ratio: "tall",
              messenger_extensions: true
            }
          ]
        }
      }
    };
    
    await ctx.reply(message);
  }
};