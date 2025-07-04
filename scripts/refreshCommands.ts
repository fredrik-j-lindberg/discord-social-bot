import { REST, Routes } from "discord.js";
import { env } from "../src/env";
import { logger } from "~/lib/logger";
import { type Command, getAllCommands } from "~/router/commandRouter";
import { DoraException } from "~/lib/exceptions/DoraException";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

const makeCmdsRestFriendly = (commands: Command[]) => {
  const json = commands.map((cmd) => {
    try {
      return cmd.data.toJSON();
    } catch (err) {
      throw new DoraException(
        "Failed to parse command",
        DoraException.Type.Unknown,
        { cause: err, metadata: { command: cmd.data } },
      );
    }
  });
  return json;
};

(async () => {
  const commandsMap = await getAllCommands();
  const commandsArray = Object.values(commandsMap);
  logger.info(
    {
      commands: commandsArray.map((cmd) => cmd.data.name),
      clientId: env.DISCORD_BOT_CLIENT_ID,
    },
    "Started refreshing application (/) commands.",
  );
  const jsonCommands = makeCmdsRestFriendly(commandsArray);
  await rest.put(Routes.applicationCommands(env.DISCORD_BOT_CLIENT_ID), {
    body: jsonCommands,
  });

  logger.info("Successfully reloaded application (/) commands.");
})().catch((err: unknown) => {
  logger.error(err, "Failed to refresh application (/) commands");
});
