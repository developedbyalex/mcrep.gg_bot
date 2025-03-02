const { EmbedBuilder, time } = require('discord.js');

/**
 * Create a moderation log embed
 * @param {Object} options - Options for the embed
 * @param {string} options.action - The moderation action (e.g., "Warn", "Kick", "Ban")
 * @param {Object} options.moderator - The moderator who performed the action
 * @param {Object} options.user - The user who was moderated
 * @param {string} options.reason - The reason for the moderation
 * @returns {EmbedBuilder} The created embed
 */
function createModerationEmbed({ action, moderator, user, reason }) {
  const now = new Date();
  const formattedDate = time(now, 'f'); // Discord's default date format
  const shortDate = time(now, 'd'); // Short date format (e.g., 01/01/2023)
  
  const embed = new EmbedBuilder()
    .setTitle(`${action} | Case`)
    .setColor(getActionColor(action))
    .setTimestamp()
    .addFields(
      { 
        name: 'Moderator', 
        value: `<@${moderator.id}> (${moderator.username})`, 
        inline: true 
      },
      { 
        name: 'User', 
        value: `<@${user.id}> (${user.username})`, 
        inline: true 
      },
      { 
        name: 'Date', 
        value: `${shortDate} ${formattedDate}`, 
        inline: true 
      },
      { 
        name: 'Reason', 
        value: `\`${reason}\`` 
      }
    );
  
  return embed;
}

/**
 * Get color for different moderation actions
 * @param {string} action - The moderation action
 * @returns {number} The color code
 */
function getActionColor(action) {
  switch (action.toLowerCase()) {
    case 'warn':
      return 0xFFD700; // Gold
    case 'kick':
      return 0xFFA500; // Orange
    case 'ban':
      return 0xFF0000; // Red
    case 'note':
      return 0x00BFFF; // Deep Sky Blue
    case 'nuke':
      return 0xFF1493; // Deep Pink
    default:
      return 0x5865F2; // Discord Blurple
  }
}

module.exports = {
  createModerationEmbed
}; 