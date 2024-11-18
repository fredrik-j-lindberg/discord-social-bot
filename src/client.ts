import { Client, GatewayIntentBits } from "discord.js";
import { initCommands } from "./router/commandRouter";
import { registerEvents } from "./events";
import { env } from "./env";
import { initModals } from "./router/modalRouter";
import { logger } from "./lib/logger";

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
