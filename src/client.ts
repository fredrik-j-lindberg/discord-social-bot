import { Client, GatewayIntentBits } from "discord.js";

import { env } from "./env";
import { registerEvents } from "./events";
import { logger } from "./lib/logger";
import { initCommands } from "./router/commandRouter";
import { initModals } from "./router/modalRouter";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

export const initDiscordClient = async () => {
  await initCommands();
  await initModals();
  registerEvents();
  logger.info("Logging in to Discord...");
  try {
    await client.login(env.DISCORD_BOT_TOKEN);
    logger.info("Logged in to Discord!");
  } catch (e) {
    logger.error(e);
  }
};
