import { Client } from "discord.js";
import { env } from "./env";
const client = new Client({
  intents: [],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.login(env.DISCORD_BOT_TOKEN);
