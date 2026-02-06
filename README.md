# Intro Skipper Support Bot

A Discord bot that answers common support questions about the [Intro Skipper](https://github.com/intro-skipper/intro-skipper) Jellyfin plugin using AI.

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Discord Bot Setup

#### Create the Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and add a bot

#### Enable Privileged Gateway Intents

In the Developer Portal under **Bot** → **Privileged Gateway Intents**, enable:

- ✅ **Server Members Intent** — Required to check member roles (e.g., Developer role detection)
- ✅ **Message Content Intent** — Required to read message content in the support channel

#### Invite the Bot

Use the following URL to invite the bot to your server (replace `YOUR_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147552320&scope=bot%20applications.commands
```

**Permissions Integer: `2147552320`**

This includes the following permissions:

| Permission               | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| View Channels            | Read channel information                      |
| Send Messages            | Send bot responses                            |
| Read Message History     | Fetch referenced messages for reply detection |
| Add Reactions            | Add 👍/👎 rating reactions to responses       |
| Use Application Commands | Support slash commands                        |

### 3. Configure environment variables

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

### 4. Deploy slash commands

```bash
bun run deploy-commands
```

### 5. Start the bot

```bash
bun run dev    # Development (auto-reload)
bun run start  # Production
```

## Commands

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `/ask <question>`  | Ask a question about Intro Skipper |
| `/help`            | Show help and useful links         |

## Customizing the FAQ

Edit `faq.md` to add or modify questions and answers. The bot reads this file at startup and uses AI to match user questions to relevant FAQ entries.
