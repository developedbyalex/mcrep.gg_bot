const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const { createModerationEmbed } = require('../../utils/moderation');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for banning the user')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
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
    
    // Get the member object for the target user
    const targetMember = interaction.guild.members.cache.get(targetUser.id);
    
    if (targetMember && !targetMember.bannable) {
      return interaction.reply({
        content: 'Error: I cannot ban this user. They may have higher permissions than me.',
        ephemeral: true
      });
    }
    
    // Create embed for logs channel
    const logsChannel = client.channels.cache.get(config.channels.logs);
    
    if (!logsChannel) {
      return interaction.reply({
        content: 'Error: Logs channel not found. Please check the configuration.',
        ephemeral: true
      });
    }
    
    try {
      // Ban the user
      await interaction.guild.members.ban(targetUser.id, { reason });
      
      // Create and send the embed to logs channel
      const embed = createModerationEmbed({
        action: 'Ban',
        moderator: interaction.user,
        user: targetUser,
        reason: reason
      });
      
      await logsChannel.send({ embeds: [embed] });
      
      // Notify the moderator that the ban was successful
      return interaction.reply({
        content: `Successfully banned ${targetUser.username} for \`${reason}\`.`,
        ephemeral: true
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: `Error: Failed to ban ${targetUser.username}. ${error.message}`,
        ephemeral: true
      });
    }
  },
}; 