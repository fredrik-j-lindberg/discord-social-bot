import { REST, Routes } from "discord.js";
import { env } from "../src/env";
import { logger } from "~/lib/logger";
import { commands } from "~/commands/commandRouter";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

(async () => {
  logger.info(
    { commands: commands.map((cmd) => cmd.name) },
    "Started refreshing application (/) commands.",
  );

  await rest.put(Routes.applicationCommands(env.DISCORD_BOT_CLIENT_ID), {
    body: commands,
  });

  logger.info("Successfully reloaded application (/) commands.");
})().catch((err) => {
  logger.error(err, "Failed to refresh application (/) commands");
});
