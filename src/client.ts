import { Client, GatewayIntentBits, Partials } from "discord.js"

import { env } from "./env"
import { logger } from "./lib/logger"

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
})

export const loginBot = async () => {
  logger.debug("Logging in to Discord...")
  try {
    await client.login(env.DISCORD_BOT_TOKEN)
    logger.debug("Logged in to Discord!")
  } catch (e) {
    logger.error(e)
  }
}
