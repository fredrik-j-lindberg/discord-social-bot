import { ChatInputCommandInteraction } from "discord.js";
import { DoraException } from "~/lib/exceptions/DoraException";
import { pingCommand } from "./ping";
import { Command } from "./types";

export const commands: Command[] = [pingCommand];

export const commandRouter = async (
  interaction: ChatInputCommandInteraction,
) => {
  const command = commands.find(
    (command) => command.name === interaction.commandName,
  );
  if (!command) {
    throw new DoraException("Unknown command", DoraException.Type.NotFound, {
      severity: DoraException.Severity.Info,
    });
  }
  await command.listener(interaction);
};
