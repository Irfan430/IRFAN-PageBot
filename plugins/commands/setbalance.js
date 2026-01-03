module.exports = {
  config: {
    name: "setbalance",
    aliases: ["setbal", "adminmoney"],
    author: "IRFAN",
    description: "Admin command to manage user balances",
    prefix: true, // Always requires prefix
    cooldown: 0,
    role: 1 // Admin only
  },

  run: async (ctx) => {
    const { args, senderId, config } = ctx;
    
    // Check admin permission
    if (!ctx.isAdmin()) {
      await ctx.reply('🔒 This command requires administrator privileges.');
      return;
    }
    
    if (args.length < 2) {
      await ctx.reply(`📖 **Usage:**\n\n1. Set balance: ${config.bot.prefix}setbalance [user_id] [amount]\n2. Add balance: ${config.bot.prefix}setbalance add [user_id] [amount]\n3. Deduct balance: ${config.bot.prefix}setbalance deduct [user_id] [amount]\n\nExample: ${config.bot.prefix}setbalance add 123456789 1000`);
      return;
    }
    
    let action = 'set';
    let userId = args[0];
    let amount = args[1];
    
    if (args[0] === 'add' || args[0] === 'deduct') {
      action = args[0];
      userId = args[1];
      amount = args[2];
    }
    
    if (!userId || !amount) {
      await ctx.reply('❌ Invalid arguments. Provide user ID and amount.');
      return;
    }
    
    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount)) {
      await ctx.reply('❌ Amount must be a number.');
      return;
    }
    
    try {
      let result;
      
      switch (action) {
        case 'set':
          await ctx.updateUser(userId, { money: parsedAmount });
          result = `✅ Set balance for ${userId} to ${parsedAmount}${config.economy?.currencySymbol || '💵'}`;
          break;
          
        case 'add':
          result = await ctx.db.addMoney(userId, parsedAmount);
          result = `✅ Added ${parsedAmount}${config.economy?.currencySymbol || '💵'} to ${userId}\nNew balance: ${result.newBalance}${config.economy?.currencySymbol || '💵'}`;
          break;
          
        case 'deduct':
          result = await ctx.db.deductMoney(userId, parsedAmount);
          if (result.success) {
            result = `✅ Deducted ${parsedAmount}${config.economy?.currencySymbol || '💵'} from ${userId}\nNew balance: ${result.newBalance}${config.economy?.currencySymbol || '💵'}`;
          } else {
            result = `❌ Failed: ${result.message}\nCurrent balance: ${result.currentBalance}${config.economy?.currencySymbol || '💵'}`;
          }
          break;
      }
      
      await ctx.reply(result);
      
    } catch (error) {
      console.error('❌ Error in setbalance:', error);
      await ctx.reply('❌ An error occurred while updating balance.');
    }
  }
};