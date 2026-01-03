module.exports = {
  config: {
    name: "ping",
    aliases: ["p", "test"],
    author: "IRFAN",
    description: "Check if the bot is responsive",
    prefix: false,
    cooldown: 2
  },

  run: async (ctx) => {
    const startTime = Date.now();
    
    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    await ctx.reply(`🏓 Pong!\n⏱️ Latency: ${latency}ms\n✅ Bot is operational`);
  }
};
