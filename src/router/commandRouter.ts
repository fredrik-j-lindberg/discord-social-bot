import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { logger } from "~/lib/logger";
import { DoraException } from "~/lib/exceptions/DoraException";
import {
  importFolderModules,
  triggerExecutionMappedToInteraction,
} from "./routerHelper";

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

export const getAllCommands = async () => {
  return await importFolderModules<Command>("commands");
};

let commands: Record<string, Command>;
export const initCommands = async () => {
  commands = await getAllCommands();
  logger.info("Commands initialized");
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

  await triggerExecutionMappedToInteraction({
    execute: command.execute,
    deferReply: command.deferReply,
    interaction,
    context: "command",
  });
};
