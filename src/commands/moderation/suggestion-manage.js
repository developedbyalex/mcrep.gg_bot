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
    .setName('suggestions')
    .setDescription('Manage suggestions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('Accept a suggestion')
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for accepting the suggestion')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('deny')
        .setDescription('Deny a suggestion')
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for denying the suggestion')
            .setRequired(true)))
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
        content: 'This command can only be used in suggestion threads.',
        ephemeral: true
      });
    }

    // Get the parent message (original suggestion)
    const parentMessage = await interaction.channel.fetchStarterMessage();
    if (!parentMessage) {
      return interaction.reply({
        content: 'Could not find the original suggestion message.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const reason = interaction.options.getString('reason');
    const originalEmbed = parentMessage.embeds[0];

    if (!originalEmbed) {
      return interaction.reply({
        content: 'Could not find the suggestion embed.',
        ephemeral: true
      });
    }

    // Create new embed based on original
    const updatedEmbed = EmbedBuilder.from(originalEmbed);
    const timestamp = Math.floor(Date.now() / 1000);

    if (subcommand === 'accept') {
      updatedEmbed
        .setColor('#23b955')
        .addFields({
          name: '✅ Accepted',
          value: `**By:** ${interaction.user}\n**Reason:** ${reason}\n**When:** <t:${timestamp}:R>`
        });
    } else {
      updatedEmbed
        .setColor('#e10600')
        .addFields({
          name: '❌ Denied',
          value: `**By:** ${interaction.user}\n**Reason:** ${reason}\n**When:** <t:${timestamp}:R>`
        });
    }

    try {
      // Send confirmation first
      await interaction.reply({
        content: `Suggestion has been ${subcommand}ed and the thread will be locked.`,
        ephemeral: true
      });

      // Then update the message and thread
      await parentMessage.edit({ embeds: [updatedEmbed] });
      await interaction.channel.setLocked(true);
      await interaction.channel.setArchived(true);
    } catch (error) {
      console.error('Error in suggestion management:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'There was an error processing the suggestion. Please try again.',
          ephemeral: true
        });
      }
    }
  },
}; 