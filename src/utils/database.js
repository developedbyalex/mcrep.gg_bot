const mongoose = require('mongoose');
const yaml = require('js-yaml');
const fs = require('fs');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// Note Schema
const noteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  content: { type: String, required: true },
  moderatorId: { type: String, required: true },
  moderatorName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create indexes for better query performance
noteSchema.index({ userId: 1 });

// Create the Note model
const Note = mongoose.model('Note', noteSchema);

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(config.database.mongodb_uri, {
      dbName: config.database.name
    });
    console.log('Connected to MongoDB Atlas successfully!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

/**
 * Get all notes for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of notes
 */
async function getUserNotes(userId) {
  try {
    const notes = await Note.find({ userId }).sort({ timestamp: -1 });
    return notes;
  } catch (error) {
    console.error('Error getting user notes:', error);
    return [];
  }
}

/**
 * Add a note to a user
 * @param {string} userId - The user ID
 * @param {string} content - The note content
 * @param {string} moderatorId - The moderator's ID
 * @param {string} moderatorName - The moderator's name
 * @returns {Promise<Object>} The added note
 */
async function addUserNote(userId, content, moderatorId, moderatorName) {
  try {
    const newNote = new Note({
      userId,
      content,
      moderatorId,
      moderatorName,
      timestamp: new Date()
    });
    
    await newNote.save();
    return newNote;
  } catch (error) {
    console.error('Error adding user note:', error);
    throw error;
  }
}

/**
 * Remove a note from a user
 * @param {string} userId - The user ID
 * @param {string} noteId - The note ID to remove
 * @returns {Promise<boolean>} Whether the note was removed
 */
async function removeUserNote(userId, noteId) {
  try {
    const result = await Note.findOneAndDelete({ 
      _id: noteId,
      userId: userId 
    });
    return !!result;
  } catch (error) {
    console.error('Error removing user note:', error);
    return false;
  }
}

module.exports = {
  connectToDatabase,
  getUserNotes,
  addUserNote,
  removeUserNote
}; 