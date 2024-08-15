import { ChatInputCommandInteraction } from "discord.js";
import { DoraException } from "~/lib/exceptions/DoraException";

export const commandRouter = async (
  interaction: ChatInputCommandInteraction,
) => {
  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
    return;
  }

  throw new DoraException("Unknown command", DoraException.Type.NotFound, {
    severity: DoraException.Severity.Info,
  });
};
