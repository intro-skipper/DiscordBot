import { REST, Routes, SlashCommandBuilder } from "discord.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables");
  process.exit(1);
}

// Type narrowing ensures these are strings after the check above
const token: string = DISCORD_TOKEN;
const clientId: string = DISCORD_CLIENT_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask a question about Intro Skipper for Jellyfin")
    .addStringOption((option) =>
      option.setName("question").setDescription("Your question").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show help information about the Intro Skipper support bot"),
].map((command) => command.toJSON());

const rest = new REST().setToken(token);

async function deployCommands() {
  try {
    console.log(`Deploying ${commands.length} slash commands...`);

    if (DISCORD_GUILD_ID) {
      // Deploy to specific guild (instant, good for testing)
      await rest.put(Routes.applicationGuildCommands(clientId, DISCORD_GUILD_ID), {
        body: commands,
      });
      console.log(`✅ Commands deployed to guild ${DISCORD_GUILD_ID}`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log("✅ Commands deployed globally (may take up to 1 hour to appear)");
    }
  } catch (error) {
    console.error("Failed to deploy commands:", error);
    process.exit(1);
  }
}

deployCommands();
