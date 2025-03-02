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
    .setName('suggestion')
    .setDescription('Submit a suggestion for mcrep.gg'),

  async execute(interaction, client) {
    // Create the modal
    const modal = new ModalBuilder()
      .setCustomId('suggestion')
      .setTitle('Submit a Suggestion');

    // Add title input
    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Suggestion Title')
      .setPlaceholder('Enter a brief title for your suggestion')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add content input
    const contentInput = new TextInputBuilder()
      .setCustomId('content')
      .setLabel('Suggestion Content')
      .setPlaceholder('Describe your suggestion in detail')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    // Add inputs to action rows
    const firstRow = new ActionRowBuilder().addComponents(titleInput);
    const secondRow = new ActionRowBuilder().addComponents(contentInput);

    modal.addComponents(firstRow, secondRow);

    // Show the modal
    await interaction.showModal(modal);

    try {
      // Wait for modal submission
      const submission = await interaction.awaitModalSubmit({
        time: 600000, // 10 minutes
        filter: i => i.customId === 'suggestion'
      });

      // Get the suggestions channel
      const suggestionsChannel = client.channels.cache.get(config.suggestions.channel);
      if (!suggestionsChannel) {
        return submission.reply({
          content: 'Error: Suggestions channel not found. Please contact an administrator.',
          ephemeral: true
        });
      }

      const title = submission.fields.getTextInputValue('title');
      const content = submission.fields.getTextInputValue('content');

      // Create embed for the suggestion
      const suggestionEmbed = new EmbedBuilder()
        .setTitle('💡 ' + title)
        .setDescription(content)
        .setColor(config.suggestions.color)
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp()
        .setFooter({
          text: 'React with +1 or -1 to vote on this suggestion'
        });

      // Send the embed and create a thread
      const suggestionMsg = await suggestionsChannel.send({ embeds: [suggestionEmbed] });
      
      // Add reactions
      await suggestionMsg.react(config.suggestions.reactions.upvote);
      await suggestionMsg.react(config.suggestions.reactions.downvote);

      // Create thread for discussion
      const thread = await suggestionMsg.startThread({
        name: `Discussion: ${title}`,
        autoArchiveDuration: 60 * 24, // 24 hours
        rateLimitPerUser: 2, // 2 second slowmode
        reason: 'Suggestion discussion thread',
        flags: ['GUILD_FORUM_POST_CREATE_ATTACHMENTS_ALLOWED', 'GUILD_FORUM_POST_CREATE_EMBEDS_ALLOWED']
      });

      // Add initial thread message
      await thread.send({
        content: `Suggestion created by ${interaction.user}. Use this thread to discuss the suggestion!\n\nYou can attach files and embed links in this thread to provide additional information.`
      });

      // Set up reaction collector to prevent multiple votes
      const collector = suggestionMsg.createReactionCollector({
        filter: (reaction, user) => {
          return [config.suggestions.reactions.upvote, config.suggestions.reactions.downvote].includes(reaction.emoji.id) && !user.bot;
        }
      });

      collector.on('collect', async (reaction, user) => {
        // Get all reactions from this user on this message
        const userReactions = suggestionMsg.reactions.cache.filter(reaction => 
          reaction.users.cache.has(user.id)
        );

        // If user has reacted with both emojis, remove the previous one
        if (userReactions.size > 1) {
          for (const [, reaction] of userReactions) {
            if (reaction.emoji.id !== reaction.emoji.id) {
              await reaction.users.remove(user.id);
            }
          }
        }
      });

      // Reply to the user
      await submission.reply({
        content: 'Your suggestion has been submitted successfully! You can track it in the suggestions channel.',
        ephemeral: true
      });

    } catch (error) {
      if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
        return interaction.followUp({
          content: 'Suggestion submission timed out. Please try again.',
          ephemeral: true
        });
      }
      console.error('Error handling suggestion:', error);
      return interaction.followUp({
        content: 'There was an error submitting your suggestion. Please try again later.',
        ephemeral: true
      });
    }
  },
}; 