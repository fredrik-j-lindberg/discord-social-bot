import { commandRouter } from "~/commands/commandRouter";
import { registerEvent } from "./utils";

export const registerInteractionEvent = () => {
  registerEvent({
    event: "interactionCreate",
    listener: async (interaction) => {
      if (interaction.isChatInputCommand()) {
        return await commandRouter(interaction);
      }
      return {
        status: "skipped",
        reason: "Not a command",
      };
    },
    metadataSelector: (interaction) => ({
      user: interaction.user.tag,
      command: interaction.isChatInputCommand()
        ? interaction.commandName
        : null,
    }),
  });
};
