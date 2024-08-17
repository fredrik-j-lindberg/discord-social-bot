import path from "node:path";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { z } from "zod";
import { logger } from "~/lib/logger";
import { DoraException } from "~/lib/exceptions/DoraException";
import { fileURLToPath } from "url";
import { importFolderModules } from "~/lib/helpers/files";
import type { ClientWithCommands } from "~/client";

export type Command = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const folderPath = path.join(__dirname, "commands");

const commandSchema = z.object({
  data: z.object({ name: z.string(), toJSON: z.function() }).passthrough(),
  execute: z.function(),
});

export const getAllCommands = async () => {
  const commands = await importFolderModules(folderPath);
  return commands.map((command) => {
    const parsedCommand = commandSchema.parse(command);
    return parsedCommand as unknown as Command; // This is to avoid specifying all required props of Command in the schema
  });
};

const commands: Record<string, Command> = {};
/**
 * Imports the relevant command files and sets them on the client
 */
export const initCommands = async (client: ClientWithCommands) => {
  try {
    const allCommands = await getAllCommands();
    allCommands.forEach((command) => {
      commands[command.data.name] = command;
      // TODO: do I really need to set the commands on the client?
      // Keeping for now to see if it is used later in guide. When removing, revert client type as well
      client.commands.set(command.data.name, command);
    });
    logger.info("Commands initialized");
  } catch (err) {
    throw new DoraException(
      "Failed to initialize commands",
      DoraException.Type.Unknown,
      { cause: err },
    );
  }
};

export const commandRouter = async (
  interaction: ChatInputCommandInteraction,
) => {
  const command = commands[interaction.commandName];
  if (!command) {
    throw new DoraException("Unknown command", DoraException.Type.NotFound, {
      severity: DoraException.Severity.Info,
      metadata: { commandName: interaction.commandName },
    });
  }
  await command.execute(interaction);
};
