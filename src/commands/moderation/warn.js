const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const { createModerationEmbed } = require('../../utils/moderation');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for the warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction, client) {
    // Check if user has moderator role
    const member = interaction.member;
    const moderatorRole = config.roles.moderator;
    
    if (!member.roles.cache.has(moderatorRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }
    
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    
    // Create embed for logs channel
    const logsChannel = client.channels.cache.get(config.channels.logs);
    
    if (!logsChannel) {
      return interaction.reply({
        content: 'Error: Logs channel not found. Please check the configuration.',
        ephemeral: true
      });
    }
    
    // Create and send the embed to logs channel
    const embed = createModerationEmbed({
      action: 'Warn',
      moderator: interaction.user,
      user: targetUser,
      reason: reason
    });
    
    await logsChannel.send({ embeds: [embed] });
    
    // Notify the moderator that the warning was successful
    return interaction.reply({
      content: `Successfully warned ${targetUser.username} for \`${reason}\`.`,
      ephemeral: true
    });
  },
}; 