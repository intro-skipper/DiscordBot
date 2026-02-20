import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  inlineCode,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Message,
  type MessageReaction,
  type User,
  type GuildMember,
  type PartialMessageReaction,
  type PartialUser,
} from "discord.js";

// Unicode emoji for thumbs up and thumbs down
const THUMBS_UP = "👍";
const THUMBS_DOWN = "👎";
// Unicode emoji for question mark and green checkmark
const QUESTION_MARK = "❓";
const GREEN_CHECKMARK = "✅";
import { askFAQ, formatCost, type FAQResult, getAvailableModels, getCurrentModel, setCurrentModel, type ModelInfo } from "./kilo";
import { getSupportedVersions, formatSupportedVersions } from "./versions";

// Channel name to listen for direct questions
const SUPPORT_CHANNEL_NAME = "🤖support-bot";

// Channel name for developer-triggered questions via reaction
const SUPPORT_REACTION_CHANNEL_NAME = "🛠️support";

// Role name that should be ignored in conversations
const DEVELOPER_ROLE_NAME = "Developer";

// Track messages being processed to prevent duplicate responses
const processingMessages = new Set<string>();

// Wrap URLs in inline code to suppress Discord embeds, but preserve channel mentions
function suppressEmbeds(text: string): string {
  // First, temporarily replace channel mentions with placeholders
  const channelMentions: string[] = [];
  const textWithPlaceholders = text.replace(/<#(\d+)>/g, (match) => {
    channelMentions.push(match);
    return `__CHANNEL_MENTION_${channelMentions.length - 1}__`;
  });

  // Suppress embeds for URLs
  const suppressedText = textWithPlaceholders.replace(/(https?:\/\/[^\s<>]+)/g, (url) => inlineCode(url));

  // Restore channel mentions
  return suppressedText.replace(/__CHANNEL_MENTION_(\d+)__/g, (_, index) => channelMentions[parseInt(index)] ?? "");
}

// Format the cost footer for Discord messages
function formatCostFooter(result: FAQResult): string {
  const costStr = formatCost(result.cost);
  const cachedStr = result.tokens.cached > 0
    ? ` | cached: ${result.tokens.cached}`
    : "";
  return `\n-# 🤖 ${result.model} | ${costStr} | tokens: ${result.tokens.total}${cachedStr} | powered by [Kilo Open Source Sponsorship Program](https://kilo.ai)`;
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
});

// Bot ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Bot is online as ${readyClient.user.tag}`);
  console.log(`📊 Serving ${readyClient.guilds.cache.size} server(s)`);
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  // Handle autocomplete
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "model") {
      await handleModelAutocomplete(interaction);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "ask") {
    await handleAskCommand(interaction);
  } else if (commandName === "help") {
    await handleHelpCommand(interaction);
  } else if (commandName === "versions") {
    await handleVersionsCommand(interaction);
  } else if (commandName === "model") {
    await handleModelCommand(interaction);
  }
});

// Check if a guild member has the Developer role
function hasDeveloperRole(message: Message): boolean {
  return message.member?.roles.cache.some(
    (role) => role.name === DEVELOPER_ROLE_NAME
  ) ?? false;
}

// Check if a guild member has the Developer role (for GuildMember)
function memberHasDeveloperRole(member: GuildMember): boolean {
  return member.roles.cache.some(
    (role) => role.name === DEVELOPER_ROLE_NAME
  );
}

// Handle question mark reactions in the support channel
client.on(Events.MessageReactionAdd, async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
  // Ignore bot reactions
  if (user.bot) return;

  // Only handle question mark reactions
  if (reaction.emoji.name !== QUESTION_MARK) return;

  // Fetch partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Could not fetch reaction:", error);
      return;
    }
  }

  // Fetch partial message if needed
  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch (error) {
      console.error("Could not fetch message:", error);
      return;
    }
  }

  // Check if we're in a guild
  if (!reaction.message.guild) return;

  // Check if the channel is the support channel
  const channel = reaction.message.channel;
  if (!("name" in channel) || channel.name !== SUPPORT_REACTION_CHANNEL_NAME) return;

  // Check if the user who reacted has the Developer role
  const member = await reaction.message.guild.members.fetch(user.id);
  if (!memberHasDeveloperRole(member)) return;

  // Get the message content as the question
  const question = reaction.message.content?.trim();
  if (!question) return;

  // Remove the question mark reaction and add a green checkmark
  try {
    await reaction.users.remove(user.id);
  } catch (error) {
    // This fails if bot lacks "Manage Messages" permission - non-critical
    console.warn("Could not remove reaction (bot may lack 'Manage Messages' permission):", error);
  }
  
  try {
    await reaction.message.react(GREEN_CHECKMARK);
  } catch (error) {
    console.error("Could not add checkmark reaction:", error);
  }

  // Answer the question
  await handleChannelQuestion(reaction.message as Message, question);
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

  // If this is a reply, check for Developer role involvement
  if (message.reference?.messageId) {
    // If a Developer replies to a user message, don't respond (Developer is handling it)
    if (hasDeveloperRole(message)) return;

    try {
      const referencedMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );
      // If a user replies to a Developer message, don't respond (Developer is handling it)
      if (hasDeveloperRole(referencedMessage)) return;
    } catch {
      // If we can't fetch the referenced message, continue normally
    }
  }

  await handleChannelQuestion(message, question);
});

async function handleChannelQuestion(message: Message, question: string) {
  // Prevent duplicate processing of the same message
  if (processingMessages.has(message.id)) {
    return;
  }
  processingMessages.add(message.id);

  try {
    // Show typing indicator while processing
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    // Use channel ID + user ID for conversation context
    const conversationId = `${message.channelId}-${message.author.id}`;
    const result = await askFAQ(faqContent, question, conversationId);
    const response = suppressEmbeds(result.answer) + formatCostFooter(result);

    // Discord has a 2000 character limit for messages
    let replyMessage: Message;
    if (response.length > 1900) {
      replyMessage = await message.reply(response.substring(0, 1900) + "...\n\n*(Response truncated)*");
    } else {
      replyMessage = await message.reply(response);
    }

    // Add thumbs up and thumbs down reactions for rating
    await replyMessage.react(THUMBS_UP);
    await replyMessage.react(THUMBS_DOWN);
  } catch (error) {
    console.error("Error handling channel question:", error);
    await message.reply(
      "❌ Sorry, I encountered an error while processing your question. Please try again later."
    );
  } finally {
    // Clean up after processing (allow re-processing after 30 seconds)
    setTimeout(() => processingMessages.delete(message.id), 30000);
  }
}

async function handleAskCommand(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString("question", true);

  // Defer reply since AI response may take a moment
  await interaction.deferReply();

  try {
    // Use channel ID + user ID for conversation context
    const conversationId = `${interaction.channelId}-${interaction.user.id}`;
    const result = await askFAQ(faqContent, question, conversationId);
    const response = suppressEmbeds(result.answer) + formatCostFooter(result);

    // Discord has a 2000 character limit for messages
    let replyMessage: Message;
    if (response.length > 1900) {
      replyMessage = await interaction.editReply(response.substring(0, 1900) + "...\n\n*(Response truncated)*");
    } else {
      replyMessage = await interaction.editReply(response);
    }

    // Add thumbs up and thumbs down reactions for rating
    await replyMessage.react(THUMBS_UP);
    await replyMessage.react(THUMBS_DOWN);
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
- \`/model\` - View or change the current LLM model
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

async function handleModelCommand(interaction: ChatInputCommandInteraction) {
  const newModel = interaction.options.getString("set");

  // If no model provided, show current model and available models
  if (!newModel) {
    await interaction.deferReply();

    try {
      const currentModel = getCurrentModel();
      const models = await getAvailableModels();

      // Show first 20 models to avoid message length issues
      const displayModels = models.slice(0, 20);
      const modelList = displayModels
        .map((m) => {
          const current = m.id === currentModel ? " ✅" : "";
          return `- \`${m.id}\`${current}`;
        })
        .join("\n");

      const moreInfo = models.length > 20
        ? `\n\n*...and ${models.length - 20} more models available*`
        : "";

      const message = `# 🤖 LLM Model Configuration

**Current model:** \`${currentModel}\`

## Available Models
${modelList}${moreInfo}

Use \`/model set:<model_id>\` to change the model.`;

      await interaction.editReply(message);
    } catch (error) {
      console.error("Error fetching models:", error);
      await interaction.editReply(
        `**Current model:** \`${getCurrentModel()}\`\n\n❌ Could not fetch available models from API.`
      );
    }
    return;
  }

  // Set new model
  setCurrentModel(newModel);
  await interaction.reply(`✅ Model changed to: \`${newModel}\``);
}

// Cache for models to avoid repeated API calls
let cachedModels: ModelInfo[] | null = null;
let modelsCacheTime = 0;
const MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function handleModelAutocomplete(interaction: AutocompleteInteraction) {
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name !== "set") {
    await interaction.respond([]);
    return;
  }

  try {
    // Use cached models if available and not expired
    const now = Date.now();
    if (!cachedModels || now - modelsCacheTime > MODELS_CACHE_TTL) {
      cachedModels = await getAvailableModels();
      modelsCacheTime = now;
    }

    // Filter models based on user input
    const query = focusedOption.value.toLowerCase();
    const filtered = cachedModels
      .filter((m) => m.id.toLowerCase().includes(query))
      .slice(0, 25) // Discord limits to 25 choices
      .map((m) => ({
        name: m.name.length > 100 ? m.id : m.name, // Discord name limit
        value: m.id,
      }));

    await interaction.respond(filtered);
  } catch (error) {
    console.error("Error in model autocomplete:", error);
    await interaction.respond([]);
  }
}

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN is not set in environment variables");
  console.error("Create a .env file based on .env.example");
  process.exit(1);
}

client.login(token);
