import path from "node:path";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { logger } from "~/lib/logger";
import { DoraException } from "~/lib/exceptions/DoraException";
import { fileURLToPath } from "url";
import { importFolderModules } from "~/lib/helpers/files";
import type { ClientWithCommands } from "~/client";
import { DoraUserException } from "~/lib/exceptions/DoraUserException";

export type Command = {
  /**
   * This contains a lot more properties than what has been set so far in the interest of keeing the type narrow
   *
   * Grab more properties from SlashCommandBuilder if needed
   */
  data: {
    name: SlashCommandBuilder["name"];
    toJSON: SlashCommandBuilder["toJSON"];
  };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
  deferReply: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const folderPath = path.join(__dirname, "commands");

export const getAllCommands = async () => {
  return await importFolderModules<Command>(folderPath);
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

  if (command.deferReply) {
    await interaction.deferReply();
  }
  try {
    await command.execute(interaction);
  } catch (err) {
    let errorMessage = `Failed to process command :(`;
    if (err instanceof DoraUserException) {
      errorMessage = err.message;
    }
    if (command.deferReply) {
      await interaction.editReply(errorMessage);
      throw err;
    }
    await interaction.reply(errorMessage);
    throw err;
  }
};
