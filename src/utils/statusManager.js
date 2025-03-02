const { ActivityType } = require('discord.js');

// Status configurations
const STATUSES = [
  {
    text: 'mcrep.gg',
    type: ActivityType.Watching
  }
];

let currentStatusIndex = 0;

/**
 * Update the bot's status
 * @param {Client} client - Discord.js client instance
 */
function updateStatus(client) {
  const status = STATUSES[currentStatusIndex];
  
  client.user.setActivity(status.text, { type: status.type });
  
  // Move to next status (loop back to start if at end)
  currentStatusIndex = (currentStatusIndex + 1) % STATUSES.length;
}

/**
 * Start rotating the bot's status
 * @param {Client} client - Discord.js client instance
 * @param {number} interval - Interval in milliseconds between status changes
 */
function startStatusRotation(client, interval = 60000) { // Default to 1 minute
  // Set initial status
  updateStatus(client);
  
  // Start the rotation
  setInterval(() => {
    updateStatus(client);
  }, interval);
}

module.exports = {
  startStatusRotation
}; 