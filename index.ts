import {
  Client,
  Events,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
  type Message,
} from "discord.js";
import { askFAQ } from "./kilo";
import { getSupportedVersions, formatSupportedVersions } from "./versions";

// Channel name to listen for direct questions
const SUPPORT_CHANNEL_NAME = "🤖support-bot";

// Wrap URLs in angle brackets to suppress Discord embeds
function suppressEmbeds(text: string): string {
  return text.replace(/(https?:\/\/[^\s<>]+)/g, "<$1>");
}

// Load FAQ content at startup
const faqContent = await Bun.file("faq.md").text();
console.log("📚 FAQ loaded successfully");

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Bot is online as ${readyClient.user.tag}`);
  console.log(`📊 Serving ${readyClient.guilds.cache.size} server(s)`);
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "ask") {
    await handleAskCommand(interaction);
  } else if (commandName === "help") {
    await handleHelpCommand(interaction);
  } else if (commandName === "versions") {
    await handleVersionsCommand(interaction);
  }
});

// Handle direct messages in the support channel
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only respond in the support channel
  const channel = message.channel;
  if (!("name" in channel) || channel.name !== SUPPORT_CHANNEL_NAME) return;

  // Ignore empty messages or messages that are just attachments
  const question = message.content.trim();
  if (!question) return;

  await handleChannelQuestion(message, question);
});

async function handleChannelQuestion(message: Message, question: string) {
  try {
    // Show typing indicator while processing
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    const answer = await askFAQ(faqContent, question);
    const response = suppressEmbeds(answer);

    // Discord has a 2000 character limit for messages
    if (response.length > 1900) {
      await message.reply(response.substring(0, 1900) + "...\n\n*(Response truncated)*");
    } else {
      await message.reply(response);
    }
  } catch (error) {
    console.error("Error handling channel question:", error);
    await message.reply(
      "❌ Sorry, I encountered an error while processing your question. Please try again later."
    );
  }
}

async function handleAskCommand(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString("question", true);

  // Defer reply since AI response may take a moment
  await interaction.deferReply();

  try {
    const answer = await askFAQ(faqContent, question);
    const response = suppressEmbeds(answer);

    // Discord has a 2000 character limit for messages
    if (response.length > 1900) {
      await interaction.editReply(response.substring(0, 1900) + "...\n\n*(Response truncated)*");
    } else {
      await interaction.editReply(response);
    }
  } catch (error) {
    console.error("Error handling ask command:", error);
    await interaction.editReply(
      "❌ Sorry, I encountered an error while processing your question. Please try again later."
    );
  }
}

async function handleVersionsCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const versions = await getSupportedVersions();
    const versionInfo = formatSupportedVersions(versions);

    const message = `# 📦 Supported Jellyfin Versions

${versionInfo}

**Note:** Make sure you're using the correct manifest URL for your Jellyfin version:
- \`https://intro-skipper.org/manifest.json\` (auto-detects your version)`;

    await interaction.editReply(message);
  } catch (error) {
    console.error("Error fetching versions:", error);
    await interaction.editReply(
      "❌ Sorry, I couldn't fetch the version information. Please check <https://github.com/intro-skipper/intro-skipper> for the latest requirements."
    );
  }
}

async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
  const helpMessage = `# Intro Skipper Support Bot 🎬

I'm here to help answer your questions about the Intro Skipper plugin for Jellyfin!

## Commands
- \`/ask <question>\` - Ask me anything about Intro Skipper
- \`/versions\` - Show supported Jellyfin versions
- \`/help\` - Show this help message

## Examples
- \`/ask How do I install Intro Skipper?\`
- \`/ask Why are no intros being detected?\`
- \`/ask What are the system requirements?\`

## Need more help?
- 📖 Wiki: <https://github.com/intro-skipper/intro-skipper/wiki>
- 🐛 Report issues: <https://github.com/intro-skipper/intro-skipper/issues>`;

  await interaction.reply(helpMessage);
}

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN is not set in environment variables");
  console.error("Create a .env file based on .env.example");
  process.exit(1);
}

client.login(token);
