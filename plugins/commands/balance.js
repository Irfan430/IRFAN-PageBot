module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "money", "cash"],
    author: "IRFAN",
    description: "Check your balance or transfer money",
    prefix: false,
    cooldown: 5
  },

  run: async (ctx) => {
    const { args, senderId, config } = ctx;
    
    // Check if user wants to transfer
    if (args[0] === 'transfer' && args[1] && args[2]) {
      const toUserId = args[1];
      const amount = parseInt(args[2]);
      
      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please enter a positive number.');
        return;
      }
      
      if (amount > 1000000) {
        await ctx.reply('❌ Maximum transfer amount is 1,000,000.');
        return;
      }
      
      const result = await ctx.db.transferMoney(senderId, toUserId, amount);
      
      if (result.success) {
        await ctx.reply(`✅ Transfer successful!\n\n💰 Sent: ${amount}${config.economy?.currencySymbol || '💵'}\n📤 To: ${toUserId}\n📊 Your new balance: ${result.from.newBalance}${config.economy?.currencySymbol || '💵'}`);
      } else {
        await ctx.reply(`❌ Transfer failed: ${result.message}\n\nYour balance: ${result.currentBalance}${config.economy?.currencySymbol || '💵'}`);
      }
      
      return;
    }
    
    // Show balance
    const user = await ctx.getUser();
    
    let message = `💰 **Your Balance**\n\n`;
    message += `💵 Cash: ${user.money}${config.economy?.currencySymbol || '💵'}\n`;
    message += `📈 Level: ${user.level || 1}\n`;
    message += `⭐ Experience: ${user.experience || 0}\n\n`;
    
    if (user.inventory && user.inventory.length > 0) {
      const itemsCount = user.inventory.filter(item => item.equipped).length;
      message += `🎒 Equipped Items: ${itemsCount}\n`;
    }
    
    // Add transaction history if available
    if (user.lastTransaction) {
      const date = new Date(user.lastTransaction.timestamp).toLocaleDateString();
      message += `\n📅 Last Transaction: ${date}\n`;
    }
    
    message += `\n💡 Use: balance transfer [user_id] [amount] to send money`;
    
    await ctx.reply(message);
  }
};