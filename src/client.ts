import { Client, Collection, GatewayIntentBits } from "discord.js";
import { Command, initCommands } from "./router/commandRouter";
import { registerEvents } from "./events";
import { env } from "./env";

export interface ClientWithCommands extends Client {
  commands: Collection<string, Command>;
}
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
}) as ClientWithCommands;
client.commands = new Collection();

export const initDiscordClient = async () => {
  await initCommands(client);
  registerEvents();
  await client.login(env.DISCORD_BOT_TOKEN);
};
