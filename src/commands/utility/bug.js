const { 
  SlashCommandBuilder, 
  ModalBuilder, 
  ActionRowBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  EmbedBuilder
} = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bug')
    .setDescription('Report a bug in mcrep.gg'),

  async execute(interaction, client) {
    // Create the modal
    const modal = new ModalBuilder()
      .setCustomId('bugReport')
      .setTitle('Report a Bug');

    // Add inputs based on config questions
    const actionRows = config.bug_report.questions.map(question => {
      const textInput = new TextInputBuilder()
        .setCustomId(question.label.toLowerCase().replace(/\s+/g, '_'))
        .setLabel(question.label)
        .setPlaceholder(question.placeholder)
        .setStyle(question.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(question.required);

      return new ActionRowBuilder().addComponents(textInput);
    });

    modal.addComponents(actionRows);

    // Show the modal
    await interaction.showModal(modal);

    try {
      // Wait for modal submission
      const submission = await interaction.awaitModalSubmit({
        time: 600000, // 10 minutes
        filter: i => i.customId === 'bugReport'
      });

      // Get the bug reports channel
      const bugChannel = client.channels.cache.get(config.bug_report.channel);
      if (!bugChannel) {
        return submission.reply({
          content: 'Error: Bug reports channel not found. Please contact an administrator.',
          ephemeral: true
        });
      }

      // Create embed for the bug report
      const bugEmbed = new EmbedBuilder()
        .setTitle('🐛 New Bug Report')
        .setColor(config.bug_report.color)
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      // Add fields from the submission
      config.bug_report.questions.forEach(question => {
        const fieldId = question.label.toLowerCase().replace(/\s+/g, '_');
        const response = submission.fields.getTextInputValue(fieldId);
        if (response) {
          bugEmbed.addFields({
            name: question.label,
            value: response
          });
        }
      });

      // Send the embed and create a thread
      const bugMessage = await bugChannel.send({ embeds: [bugEmbed] });
      const thread = await bugMessage.startThread({
        name: `Bug Report - ${interaction.user.username}`,
        autoArchiveDuration: 60 * 24, // 24 hours
        rateLimitPerUser: 2, // 2 second slowmode
        reason: 'Bug report thread',
        flags: ['GUILD_FORUM_POST_CREATE_ATTACHMENTS_ALLOWED', 'GUILD_FORUM_POST_CREATE_EMBEDS_ALLOWED']
      });

      // Add initial thread message
      await thread.send({
        content: `Bug report created by ${interaction.user}. Staff will review this report soon.\n\nYou can attach files and embed links in this thread to provide additional information.`
      });

      // Reply to the user
      await submission.reply({
        content: 'Your bug report has been submitted successfully! You can track it in the bug reports channel.',
        ephemeral: true
      });

    } catch (error) {
      if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
        return interaction.followUp({
          content: 'Bug report submission timed out. Please try again.',
          ephemeral: true
        });
      }
      console.error('Error handling bug report:', error);
      return interaction.followUp({
        content: 'There was an error submitting your bug report. Please try again later.',
        ephemeral: true
      });
    }
  },
}; 