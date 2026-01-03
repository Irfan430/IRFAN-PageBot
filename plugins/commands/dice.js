module.exports = {
  config: {
    name: "dice",
    aliases: ["roll", "diceroll"],
    author: "IRFAN",
    description: "Play dice game",
    prefix: false,
    cooldown: 2
  },

  run: async (ctx) => {
    // Delegate to games.js dice_open
    const gamesPlugin = require('./games');
    await gamesPlugin.runDice(ctx);
  },

  postbacks: {
    dice_menu: async (ctx) => {
      const { bet } = ctx.payloadData;
      const user = await ctx.getUser();
      
      await ctx.reply({
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: `🎲 **Dice Game - Bet: ${bet}${ctx.config.economy?.currencySymbol || '💵'}**\n\nBalance: ${user.money}${ctx.config.economy?.currencySymbol || '💵'}\n\nPredict if the roll will be HIGH (4-6) or LOW (1-3):`,
            buttons: [
              {
                type: "postback",
                title: `⬆️ HIGH (4-6)`,
                payload: JSON.stringify({ type: "dice_roll", bet: bet, prediction: "high" })
              },
              {
                type: "postback",
                title: `⬇️ LOW (1-3)`,
                payload: JSON.stringify({ type: "dice_roll", bet: bet, prediction: "low" })
              }
            ]
          }
        }
      });
      
      return true;
    },
    
    dice_roll: async (ctx) => {
      const { bet, prediction } = ctx.payloadData;
      const userId = ctx.senderId;
      
      // Validate
      if (!bet || !prediction || !['high', 'low'].includes(prediction)) {
        await ctx.reply('❌ Invalid dice parameters.');
        return true;
      }
      
      // Check balance
      const user = await ctx.getUser();
      
      if (user.money < bet) {
        await ctx.reply(`❌ Insufficient balance!\n\nYour balance: ${user.money}${ctx.config.economy?.currencySymbol || '💵'}\nRequired: ${bet}${ctx.config.economy?.currencySymbol || '💵'}`);
        return true;
      }
      
      // Deduct bet
      await ctx.db.deductMoney(userId, bet);
      
      // Roll dice
      const diceRoll = Math.floor(Math.random() * 6) + 1; // 1-6
      const isHigh = diceRoll >= 4;
      const isCorrect = (prediction === 'high' && isHigh) || (prediction === 'low' && !isHigh);
      
      // Calculate win
      let winAmount = 0;
      if (isCorrect) {
        winAmount = bet * 2; // Double the bet
        await ctx.db.addMoney(userId, winAmount);
      }
      
      // Update stats
      const stats = user.gameStats?.dice || { wins: 0, totalRolls: 0, maxWin: 0 };
      stats.totalRolls = (stats.totalRolls || 0) + 1;
      
      if (isCorrect) {
        stats.wins = (stats.wins || 0) + 1;
        if (winAmount > (stats.maxWin || 0)) {
          stats.maxWin = winAmount;
        }
      }
      
      await ctx.updateUser(userId, {
        gameStats: { ...user.gameStats, dice: stats }
      });
      
      // Prepare result
      const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚄'][diceRoll - 1];
      const newBalance = (user.money - bet + winAmount);
      
      let message = `🎲 **Dice Roll**\n\n`;
      message += `Rolled: ${diceEmoji} (${diceRoll})\n\n`;
      message += `Your prediction: ${prediction.toUpperCase()}\n`;
      
      if (isCorrect) {
        message += `✅ **CORRECT!**\n`;
        message += `💰 Won: ${winAmount}${ctx.config.economy?.currencySymbol || '💵'}\n`;
        message += `📈 Profit: ${winAmount - bet}${ctx.config.economy?.currencySymbol || '💵'}\n`;
      } else {
        message += `❌ **WRONG!**\n`;
        message += `💸 Bet lost: ${bet}${ctx.config.economy?.currencySymbol || '💵'}\n`;
      }
      
      message += `\n💵 New Balance: ${newBalance}${ctx.config.economy?.currencySymbol || '💵'}`;
      
      // Create buttons
      const buttons = [
        {
          type: "postback",
          title: "🎲 Roll Again",
          payload: JSON.stringify({ type: "dice_roll", bet: bet, prediction: prediction })
        }
      ];
      
      if (bet * 2 <= newBalance) {
        buttons.push({
          type: "postback",
          title: `🎯 Double Bet (${bet * 2})`,
          payload: JSON.stringify({ type: "dice_menu", bet: bet * 2 })
        });
      }
      
      buttons.push({
        type: "postback",
        title: "📊 Dice Stats",
        payload: JSON.stringify({ type: "dice_stats" })
      });
      
      await ctx.reply({
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: message,
            buttons: buttons
          }
        }
      });
      
      return true;
    },
    
    dice_stats: async (ctx) => {
      const user = await ctx.getUser();
      const stats = user.gameStats?.dice || { wins: 0, totalRolls: 0, maxWin: 0 };
      
      const winRate = stats.totalRolls > 0 
        ? ((stats.wins / stats.totalRolls) * 100).toFixed(1) 
        : 0;
      
      const message = `📊 **Dice Statistics**\n\n`;
      message += `🎲 Total Rolls: ${stats.totalRolls || 0}\n`;
      message += `✅ Wins: ${stats.wins || 0}\n`;
      message += `📈 Win Rate: ${winRate}%\n`;
      message += `💰 Max Win: ${stats.maxWin || 0}${ctx.config.economy?.currencySymbol || '💵'}\n`;
      message += `💵 Current Balance: ${user.money}${ctx.config.economy?.currencySymbol || '💵'}`;
      
      await ctx.reply(message);
      return true;
    }
  }
};