module.exports = {
  config: {
    name: "uid",
    aliases: ["id", "myid"],
    author: "IRFAN",
    description: "Get user ID with profile picture",
    prefix: false,
    cooldown: 3
  },

  run: async (ctx) => {
    const { event, senderId } = ctx;
    
    let targetUserId = senderId;
    let displayName = "Your";
    
    // Check if replying to someone
    if (event.message?.reply_to?.mid) {
      // In real implementation, you would fetch the replied user's ID
      // For now, we'll use sender's ID
      displayName = "Their";
    }
    
    // Check if mentioned someone
    if (event.message?.mentions && event.message.mentions.length > 0) {
      targetUserId = event.message.mentions[0].id;
      displayName = "Their";
    }
    
    const profilePic = `https://graph.facebook.com/${targetUserId}/picture?type=large&width=500&height=500`;
    
    await ctx.reply({
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: `${displayName} User ID`,
            subtitle: `ID: ${targetUserId}`,
            image_url: profilePic,
            buttons: [
              {
                type: "web_url",
                url: profilePic,
                title: "📸 View Profile Picture"
              },
              {
                type: "postback",
                title: "📋 Copy ID",
                payload: JSON.stringify({ type: "copy_uid", uid: targetUserId })
              }
            ]
          }]
        }
      }
    });
  },

  postbacks: {
    copy_uid: async (ctx) => {
      const uid = ctx.payloadData.uid;
      await ctx.reply(`📋 User ID: ${uid}\n\nYou can copy this ID from above.`);
      return true;
    }
  }
};