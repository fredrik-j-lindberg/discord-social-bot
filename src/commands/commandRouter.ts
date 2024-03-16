import { ChatInputCommandInteraction } from "discord.js";
import { EventListenerReturnValue } from "~/events/utils";

export const commandRouter = async (
  interaction: ChatInputCommandInteraction,
): Promise<EventListenerReturnValue> => {
  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
    return {
      status: "completed",
      actionTaken: "Replied with pong",
    };
  }

  return {
    status: "skipped",
    reason: "Unknown command",
  };
};
