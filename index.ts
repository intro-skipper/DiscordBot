import { Client, Events, GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";
import { askFAQ } from "./services/kilo";

// Load FAQ content at startup
const faqContent = await Bun.file("faq.md").text();
console.log("📚 FAQ loaded successfully");

// Discord client setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
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
  }
});

async function handleAskCommand(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString("question", true);

  // Defer reply since AI response may take a moment
  await interaction.deferReply();

  try {
    const answer = await askFAQ(faqContent, question);

    // Discord has a 2000 character limit for messages
    if (answer.length > 1900) {
      await interaction.editReply(answer.substring(0, 1900) + "...\n\n*(Response truncated)*");
    } else {
      await interaction.editReply(answer);
    }
  } catch (error) {
    console.error("Error handling ask command:", error);
    await interaction.editReply(
      "❌ Sorry, I encountered an error while processing your question. Please try again later."
    );
  }
}

async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
  const helpMessage = `# Intro Skipper Support Bot 🎬

I'm here to help answer your questions about the Intro Skipper plugin for Jellyfin!

## Commands
- \`/ask <question>\` - Ask me anything about Intro Skipper
- \`/help\` - Show this help message

## Examples
- \`/ask How do I install Intro Skipper?\`
- \`/ask Why are no intros being detected?\`
- \`/ask What are the system requirements?\`

## Need more help?
- 📖 Wiki: https://github.com/intro-skipper/intro-skipper/wiki
- 💬 Discord: https://discord.intro-skipper.org
- 🐛 Report issues: https://github.com/intro-skipper/intro-skipper/issues`;

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
