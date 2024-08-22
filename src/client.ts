import { Client, GatewayIntentBits } from "discord.js";
import { initCommands } from "./router/commandRouter";
import { registerEvents } from "./events";
import { env } from "./env";
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
  await client.login(env.DISCORD_BOT_TOKEN);
};
