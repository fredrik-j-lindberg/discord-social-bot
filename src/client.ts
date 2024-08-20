import { Client, GatewayIntentBits } from "discord.js";
import { initCommands } from "./router/commandRouter";
import { registerEvents } from "./events";
import { env } from "./env";

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
  registerEvents();
  await client.login(env.DISCORD_BOT_TOKEN);
};
