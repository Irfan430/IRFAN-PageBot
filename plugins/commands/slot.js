module.exports = {
  config: {
    name: "slot",
    aliases: ["slots", "spin"],
    author: "IRFAN",
    description: "Play slot machine game",
    prefix: false,
    cooldown: 2
  },

  run: async (ctx) => {
    // Delegate to games.js slot_open
    const gamesPlugin = require('./games');
    await gamesPlugin.runSlot(ctx);
  },

  postbacks: {
    slot_spin: async (ctx) => {
      const { bet } = ctx.payloadData;
      const userId = ctx.senderId;
      
      // Validate bet
      if (!bet || isNaN(bet) || bet <= 0) {
        await ctx.reply('❌ Invalid bet amount.');
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
      
      // Simulate slot spin
      const symbols = ['🍒', '🍋', '⭐', '7️⃣', '🔔', '💎'];
      const results = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];
      
      // Calculate win
      let winMultiplier = 0;
      let winAmount = 0;
      
      // Check for matches
      if (results[0] === results[1] && results[1] === results[2]) {
        // Three of a kind
        winMultiplier = 10;
      } else if (results[0] === results[1] || results[1] === results[2]) {
        // Two of a kind
        winMultiplier = 3;
      } else if (results.includes('7️⃣') && results.includes('💎')) {
        // Special combination
        winMultiplier = 5;
      }
      
      winAmount = bet * winMultiplier;
      
      // Add winnings if any
      if (winAmount > 0) {
        await ctx.db.addMoney(userId, winAmount);
      }
      
      // Update game stats
      const stats = user.gameStats?.slot || { wins: 0, totalSpins: 0, maxWin: 0 };
      stats.totalSpins = (stats.totalSpins || 0) + 1;
      
      if (winAmount > 0) {
        stats.wins = (stats.wins || 0) + 1;
        if (winAmount > (stats.maxWin || 0)) {
          stats.maxWin = winAmount;
        }
      }
      
      await ctx.updateUser(userId, {
        gameStats: { ...user.gameStats, slot: stats }
      });
      
      // Prepare result message
      const slotDisplay = `[ ${results.join(' | ')} ]`;
      const newBalance = (user.money - bet + winAmount);
      
      let message = `🎰 **Slot Results**\n\n`;
      message += `${slotDisplay}\n\n`;
      
      if (winAmount > 0) {
        message += `🎉 **JACKPOT!** 🎉\n`;
        message += `💰 Won: ${winAmount}${ctx.config.economy?.currencySymbol || '💵'}\n`;
        message += `📈 Multiplier: ${winMultiplier}x\n`;
      } else {
        message += `❌ No win this time!\n`;
        message += `💸 Bet lost: ${bet}${ctx.config.economy?.currencySymbol || '💵'}\n`;
      }
      
      message += `\n💵 New Balance: ${newBalance}${ctx.config.economy?.currencySymbol || '💵'}`;
      
      // Create buttons for next action
      const buttons = [
        {
          type: "postback",
          title: "🔄 Spin Again",
          payload: JSON.stringify({ type: "slot_spin", bet: bet })
        }
      ];
      
      if (bet * 2 <= newBalance) {
        buttons.push({
          type: "postback",
          title: `🎯 Double Bet (${bet * 2})`,
          payload: JSON.stringify({ type: "slot_spin", bet: bet * 2 })
        });
      }
      
      buttons.push({
        type: "postback",
        title: "📊 Slot Stats",
        payload: JSON.stringify({ type: "slot_stats" })
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
    
    slot_stats: async (ctx) => {
      const user = await ctx.getUser();
      const stats = user.gameStats?.slot || { wins: 0, totalSpins: 0, maxWin: 0 };
      
      const winRate = stats.totalSpins > 0 
        ? ((stats.wins / stats.totalSpins) * 100).toFixed(1) 
        : 0;
      
      const message = `📊 **Slot Statistics**\n\n`;
      message += `🎰 Total Spins: ${stats.totalSpins || 0}\n`;
      message += `✅ Wins: ${stats.wins || 0}\n`;
      message += `📈 Win Rate: ${winRate}%\n`;
      message += `💰 Max Win: ${stats.maxWin || 0}${ctx.config.economy?.currencySymbol || '💵'}\n`;
      message += `💵 Current Balance: ${user.money}${ctx.config.economy?.currencySymbol || '💵'}`;
      
      await ctx.reply(message);
      return true;
    }
  }
};