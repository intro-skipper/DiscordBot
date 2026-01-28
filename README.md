# Intro Skipper Support Bot

A Discord bot that answers common support questions about the [Intro Skipper](https://github.com/intro-skipper/intro-skipper) Jellyfin plugin using AI.

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Create a `.env` file with the following:

```env
# Discord Bot (from https://discord.com/developers/applications)
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id

# Optional: For faster command registration during development
DISCORD_GUILD_ID=your_test_server_id

# Kilo Code API Key
KILO_API_KEY=your_kilo_api_key
```

### 3. Deploy slash commands

```bash
bun run deploy-commands
```

### 4. Start the bot

```bash
bun run dev    # Development (auto-reload)
bun run start  # Production
```

## Commands

| Command | Description |
|---------|-------------|
| `/ask <question>` | Ask a question about Intro Skipper |
| `/help` | Show help and useful links |

## Customizing the FAQ

Edit `faq.md` to add or modify questions and answers. The bot reads this file at startup and uses AI to match user questions to relevant FAQ entries.
