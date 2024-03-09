import { registerEvent } from "./utils";

export const registerInteractionEvent = () => {
  registerEvent({
    event: "interactionCreate",
    listener: async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return {
          status: "skipped",
          reason: "Not a command",
        };
      }

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
    },
    metadataSelector: (interaction) => ({
      user: interaction.user.tag,
      command: interaction.isChatInputCommand()
        ? interaction.commandName
        : null,
    }),
  });
};
