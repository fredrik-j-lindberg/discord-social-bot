import { REST, Routes } from "discord.js";
import { env } from "../src/env";
import { logger } from "~/lib/logger";
import { getAllCommands } from "~/router/commandRouter";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

(async () => {
  const commands = await getAllCommands();
  logger.info(
    {
      commands: commands.map((cmd) => cmd.data.name),
      clientId: env.DISCORD_BOT_CLIENT_ID,
    },
    "Started refreshing application (/) commands.",
  );

  await rest.put(Routes.applicationCommands(env.DISCORD_BOT_CLIENT_ID), {
    body: commands.map((cmd) => cmd.data.toJSON()),
  });

  logger.info("Successfully reloaded application (/) commands.");
})().catch((err) => {
  logger.error(err, "Failed to refresh application (/) commands");
});
