import { Client, GatewayIntentBits } from "discord.js"

import { env } from "./env"
import { registerEvents } from "./events"
import { logger } from "./lib/logger"
import { initCommands } from "./router/commandRouter"
import { initMessageListeners } from "./router/messageRouter"
import { initModals } from "./router/modalRouter"

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

export const initDiscordClient = async () => {
  await initCommands()
  await initModals()
  await initMessageListeners()
  registerEvents()
  logger.info("Logging in to Discord...")
  try {
    await client.login(env.DISCORD_BOT_TOKEN)
    logger.info("Logged in to Discord!")
  } catch (e) {
    logger.error(e)
  }
}
