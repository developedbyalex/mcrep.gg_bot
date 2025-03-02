const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { connectToDatabase } = require('./utils/database');
const { startStatusRotation } = require('./utils/statusManager');

// Load config
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Create collections for commands
client.commands = new Collection();
client.commandArray = [];

// Function to recursively load commands from folders
const loadCommands = (dir) => {
  const commandFolders = fs.readdirSync(dir);
  
  for (const folder of commandFolders) {
    const folderPath = path.join(dir, folder);
    const stats = fs.statSync(folderPath);
    
    if (stats.isDirectory()) {
      // If it's a directory, recursively load commands from it
      loadCommands(folderPath);
    } else if (folder.endsWith('.js')) {
      // If it's a JS file, load it as a command
      const command = require(folderPath);
      
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        client.commandArray.push(command.data.toJSON());
        console.log(`Loaded command: ${command.data.name}`);
      } else {
        console.log(`[WARNING] The command at ${folderPath} is missing a required "data" or "execute" property.`);
      }
    }
  }
};

// Load all commands
loadCommands(path.join(__dirname, 'commands'));

// Function to register slash commands
async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');
    
    const rest = new REST({ version: '10' }).setToken(config.bot.token);
    
    await rest.put(
      Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
      { body: client.commandArray },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Connect to MongoDB
  await connectToDatabase();
  
  // Register slash commands when the bot is ready
  await registerCommands();
  
  // Start status rotation
  startStatusRotation(client, config.settings.status_interval);
});

// Handle interactions (slash commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ 
      content: 'There was an error while executing this command!', 
      ephemeral: true 
    });
  }
});

// Login to Discord with your client's token
client.login(config.bot.token); 