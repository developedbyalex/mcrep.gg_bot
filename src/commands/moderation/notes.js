const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, time } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const { createModerationEmbed } = require('../../utils/moderation');
const { getUserNotes, addUserNote, removeUserNote } = require('../../utils/database');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('Manage notes for users')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a note to a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to add a note to')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('note')
            .setDescription('The note content')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a note from a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to remove a note from')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('note_id')
            .setDescription('The ID of the note to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View notes for a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to view notes for')
            .setRequired(true)))
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
    
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    
    // Get logs channel
    const logsChannel = client.channels.cache.get(config.channels.logs);
    
    if (!logsChannel) {
      return interaction.reply({
        content: 'Error: Logs channel not found. Please check the configuration.',
        ephemeral: true
      });
    }
    
    try {
      switch (subcommand) {
        case 'add': {
          const noteContent = interaction.options.getString('note');
          
          // Add the note
          const newNote = await addUserNote(
            targetUser.id, 
            noteContent, 
            interaction.user.id, 
            interaction.user.username
          );
          
          // Create and send the embed to logs channel
          const embed = createModerationEmbed({
            action: 'Note Added',
            moderator: interaction.user,
            user: targetUser,
            reason: noteContent
          });
          
          await logsChannel.send({ embeds: [embed] });
          
          return interaction.reply({
            content: `Successfully added note to ${targetUser.username} with ID: \`${newNote._id}\``,
            ephemeral: true
          });
        }
        
        case 'remove': {
          const noteId = interaction.options.getString('note_id');
          
          // Remove the note
          const removed = await removeUserNote(targetUser.id, noteId);
          
          if (!removed) {
            return interaction.reply({
              content: `Error: Could not find note with ID \`${noteId}\` for ${targetUser.username}.`,
              ephemeral: true
            });
          }
          
          // Create and send the embed to logs channel
          const embed = createModerationEmbed({
            action: 'Note Removed',
            moderator: interaction.user,
            user: targetUser,
            reason: `Note ID: ${noteId}`
          });
          
          await logsChannel.send({ embeds: [embed] });
          
          return interaction.reply({
            content: `Successfully removed note with ID \`${noteId}\` from ${targetUser.username}.`,
            ephemeral: true
          });
        }
        
        case 'view': {
          // Get the user's notes
          const notes = await getUserNotes(targetUser.id);
          
          if (notes.length === 0) {
            return interaction.reply({
              content: `${targetUser.username} has no notes.`,
              ephemeral: true
            });
          }
          
          // Create an embed to display the notes
          const embed = new EmbedBuilder()
            .setTitle(`Notes for ${targetUser.username}`)
            .setColor(0x00BFFF)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();
          
          // Add each note to the embed
          notes.forEach((note, index) => {
            embed.addFields({
              name: `Note #${index + 1} (ID: ${note._id})`,
              value: `**Content:** ${note.content}\n**Added by:** <@${note.moderatorId}> (${note.moderatorName})\n**Date:** ${time(note.timestamp, 'f')}`
            });
          });
          
          return interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error('Error in notes command:', error);
      return interaction.reply({
        content: 'There was an error while executing this command. Please try again later.',
        ephemeral: true
      });
    }
  },
}; 