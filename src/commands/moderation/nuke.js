const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const { createModerationEmbed } = require('../../utils/moderation');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// Nuke GIF URLs
const NUKE_GIFS = [
  'https://media.tenor.com/9SQD7qR0nYcAAAAC/nuke-explosion.gif',
  'https://media.tenor.com/MqyLhqPmRDkAAAAC/nuke-nuclear-explosion.gif',
  'https://media.tenor.com/ZROOT_qxLYgAAAAC/explosion-mushroom-cloud.gif',
  'https://media.tenor.com/8DaE6qzF0DwAAAAC/nuke-explosion.gif'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Bulk delete messages in the channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (max 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false))
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

    // Get amount of messages to delete (default to 100 if not specified)
    const amount = interaction.options.getInteger('amount') || 100;

    // Defer the reply since this might take a moment
    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch and delete messages
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      const deletedCount = messages.size;
      await interaction.channel.bulkDelete(messages, true);

      // Get logs channel
      const logsChannel = client.channels.cache.get(config.channels.logs);
      
      if (logsChannel) {
        // Create and send the embed to logs channel
        const embed = createModerationEmbed({
          action: 'Nuke',
          moderator: interaction.user,
          user: { id: interaction.channel.id, username: `#${interaction.channel.name}` },
          reason: `Deleted ${deletedCount} messages`
        });
        
        await logsChannel.send({ embeds: [embed] });
      }

      // Send confirmation message in the channel with a random nuke GIF
      const nukeEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('💥 Channel Nuked!')
        .setDescription(`**${deletedCount} messages** were deleted by ${interaction.user}`)
        .setImage(NUKE_GIFS[Math.floor(Math.random() * NUKE_GIFS.length)])
        .setTimestamp();

      await interaction.channel.send({ embeds: [nukeEmbed] });

      // Send success message to the moderator
      await interaction.editReply({
        content: `Successfully deleted ${deletedCount} messages.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error in nuke command:', error);
      
      if (error.code === 50034) {
        await interaction.editReply({
          content: 'Error: Cannot delete messages older than 14 days.',
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: 'There was an error trying to delete messages. Make sure the messages are not older than 14 days.',
          ephemeral: true
        });
      }
    }
  },
}; 