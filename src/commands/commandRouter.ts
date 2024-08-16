import { ChatInputCommandInteraction } from "discord.js";
import { DoraException } from "~/lib/exceptions/DoraException";
import { pingCommand } from "./ping";
import { Command } from "./types";
import { piiCommand } from "./pii";
import { birthdaysCommand } from "./birthdays";

export const commands: Command[] = [pingCommand, piiCommand, birthdaysCommand];

export const commandRouter = async (
  interaction: ChatInputCommandInteraction,
) => {
  const command = commands.find(
    (command) => command.name === interaction.commandName,
  );
  if (!command) {
    throw new DoraException("Unknown command", DoraException.Type.NotFound, {
      severity: DoraException.Severity.Info,
      metadata: { commandName: interaction.commandName },
    });
  }
  await command.listener(interaction);
};
