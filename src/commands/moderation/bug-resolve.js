const { 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resolved')
    .setDescription('Mark a bug report as resolved')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

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

    // Check if command is used in a thread
    if (!interaction.channel.isThread()) {
      return interaction.reply({
        content: 'This command can only be used in bug report threads.',
        ephemeral: true
      });
    }

    // Get the parent message (original bug report)
    const parentMessage = await interaction.channel.fetchStarterMessage();
    if (!parentMessage) {
      return interaction.reply({
        content: 'Could not find the original bug report message.',
        ephemeral: true
      });
    }

    const originalEmbed = parentMessage.embeds[0];
    if (!originalEmbed) {
      return interaction.reply({
        content: 'Could not find the bug report embed.',
        ephemeral: true
      });
    }

    // Create new embed based on original
    const updatedEmbed = EmbedBuilder.from(originalEmbed);
    const timestamp = Math.floor(Date.now() / 1000);

    updatedEmbed
      .setColor('#23b955')
      .addFields({
        name: '✅ Resolved',
        value: `**By:** ${interaction.user}\n**When:** <t:${timestamp}:R>`
      });

    try {
      // Send confirmation first
      await interaction.reply({
        content: 'Bug report has been marked as resolved and the thread will be locked.',
        ephemeral: true
      });

      // Then update the message and thread
      await parentMessage.edit({ embeds: [updatedEmbed] });
      await interaction.channel.setLocked(true);
      await interaction.channel.setArchived(true);
    } catch (error) {
      console.error('Error in bug resolution:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'There was an error resolving the bug report. Please try again.',
          ephemeral: true
        });
      }
    }
  },
}; 