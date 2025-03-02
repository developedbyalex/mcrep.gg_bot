const { 
  SlashCommandBuilder, 
  ModalBuilder, 
  ActionRowBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message')
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

    // Create the modal
    const modal = new ModalBuilder()
      .setCustomId('embedCreator')
      .setTitle('Create Embed');

    // Add color input
    const colorInput = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Embed Color (Hex)')
      .setPlaceholder('#9600ff')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add title input
    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Embed Title')
      .setPlaceholder('Enter the title for your embed')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add content input
    const contentInput = new TextInputBuilder()
      .setCustomId('content')
      .setLabel('Embed Content')
      .setPlaceholder('Enter the main content for your embed')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    // Add inputs to action rows
    const firstRow = new ActionRowBuilder().addComponents(colorInput);
    const secondRow = new ActionRowBuilder().addComponents(titleInput);
    const thirdRow = new ActionRowBuilder().addComponents(contentInput);

    modal.addComponents(firstRow, secondRow, thirdRow);

    // Show the modal
    await interaction.showModal(modal);

    try {
      // Wait for modal submission
      const submission = await interaction.awaitModalSubmit({
        time: 600000, // 10 minutes
        filter: i => i.customId === 'embedCreator'
      });

      // Get values from submission
      const color = submission.fields.getTextInputValue('color');
      const title = submission.fields.getTextInputValue('title');
      const content = submission.fields.getTextInputValue('content');

      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(content)
        .setColor(color)
        .setTimestamp();

      // Create dropdown for additional options
      const dropdown = new StringSelectMenuBuilder()
        .setCustomId('embedCustomization')
        .setPlaceholder('Customize your embed...')
        .addOptions([
          {
            label: 'Add Footer',
            description: 'Add a footer to your embed',
            value: 'footer'
          },
          {
            label: 'Add Author',
            description: 'Add an author to your embed',
            value: 'author'
          },
          {
            label: 'Add Image',
            description: 'Add a main image to your embed',
            value: 'image'
          },
          {
            label: 'Add Thumbnail',
            description: 'Add a thumbnail image to your embed',
            value: 'thumbnail'
          },
          {
            label: 'Submit Embed',
            description: 'Post the embed in the channel',
            value: 'submit'
          }
        ]);

      const row = new ActionRowBuilder().addComponents(dropdown);

      // Store the embed data in a temporary object
      client.embedData = client.embedData || {};
      client.embedData[interaction.user.id] = {
        embed: embed,
        channel: interaction.channel
      };

      // Send preview with dropdown
      await submission.reply({
        content: 'Preview of your embed:',
        embeds: [embed],
        components: [row],
        ephemeral: true
      });

      // Create collector for dropdown
      const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId === 'embedCustomization',
        time: 300000 // 5 minutes
      });

      // Handle modal submissions
      client.on('interactionCreate', async (modalInteraction) => {
        if (!modalInteraction.isModalSubmit()) return;
        if (!modalInteraction.customId.startsWith('embed')) return;
        if (modalInteraction.user.id !== interaction.user.id) return;

        const userData = client.embedData[modalInteraction.user.id];
        if (!userData) return;

        switch (modalInteraction.customId) {
          case 'embedFooter': {
            const footerText = modalInteraction.fields.getTextInputValue('footerText');
            userData.embed.setFooter({ text: footerText });
            break;
          }
          case 'embedAuthor': {
            const authorName = modalInteraction.fields.getTextInputValue('authorName');
            userData.embed.setAuthor({ name: authorName });
            break;
          }
          case 'embedImage': {
            const imageUrl = modalInteraction.fields.getTextInputValue('imageUrl');
            userData.embed.setImage(imageUrl);
            break;
          }
          case 'embedThumbnail': {
            const thumbnailUrl = modalInteraction.fields.getTextInputValue('thumbnailUrl');
            userData.embed.setThumbnail(thumbnailUrl);
            break;
          }
        }

        // Send a new message with updated preview
        await modalInteraction.reply({
          content: 'Preview of your embed:',
          embeds: [userData.embed],
          components: [row],
          ephemeral: true
        });
      });

      collector.on('collect', async i => {
        const choice = i.values[0];
        const userData = client.embedData[interaction.user.id];
        
        if (!userData) {
          await i.reply({ content: 'Embed session expired. Please create a new embed.', ephemeral: true });
          return collector.stop();
        }

        switch (choice) {
          case 'footer': {
            const footerModal = new ModalBuilder()
              .setCustomId('embedFooter')
              .setTitle('Add Footer');

            const footerInput = new TextInputBuilder()
              .setCustomId('footerText')
              .setLabel('Footer Text')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const footerRow = new ActionRowBuilder().addComponents(footerInput);
            footerModal.addComponents(footerRow);

            await i.showModal(footerModal);
            break;
          }
          case 'author': {
            const authorModal = new ModalBuilder()
              .setCustomId('embedAuthor')
              .setTitle('Add Author');

            const authorInput = new TextInputBuilder()
              .setCustomId('authorName')
              .setLabel('Author Name')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const authorRow = new ActionRowBuilder().addComponents(authorInput);
            authorModal.addComponents(authorRow);

            await i.showModal(authorModal);
            break;
          }
          case 'image': {
            const imageModal = new ModalBuilder()
              .setCustomId('embedImage')
              .setTitle('Add Image');

            const imageInput = new TextInputBuilder()
              .setCustomId('imageUrl')
              .setLabel('Image URL')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const imageRow = new ActionRowBuilder().addComponents(imageInput);
            imageModal.addComponents(imageRow);

            await i.showModal(imageModal);
            break;
          }
          case 'thumbnail': {
            const thumbnailModal = new ModalBuilder()
              .setCustomId('embedThumbnail')
              .setTitle('Add Thumbnail');

            const thumbnailInput = new TextInputBuilder()
              .setCustomId('thumbnailUrl')
              .setLabel('Thumbnail URL')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const thumbnailRow = new ActionRowBuilder().addComponents(thumbnailInput);
            thumbnailModal.addComponents(thumbnailRow);

            await i.showModal(thumbnailModal);
            break;
          }
          case 'submit': {
            // Send the embed to the channel
            await userData.channel.send({ embeds: [userData.embed] });
            await i.reply({ content: 'Embed has been posted!', ephemeral: true });
            delete client.embedData[interaction.user.id];
            collector.stop();
            break;
          }
        }
      });

      collector.on('end', () => {
        delete client.embedData[interaction.user.id];
      });

    } catch (error) {
      console.error('Error in embed command:', error);
      return interaction.followUp({
        content: 'There was an error creating your embed. Please try again.',
        ephemeral: true
      });
    }
  },
}; 