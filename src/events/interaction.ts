import { commandRouter } from "~/commands/commandRouter";
import { registerEvent } from "../lib/discord/events/registerEvent";
import { DoraException } from "~/lib/exceptions/DoraException";

export const registerInteractionEvent = () => {
  registerEvent({
    event: "interactionCreate",
    listener: async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await commandRouter(interaction);
        return;
      }

      throw new DoraException(
        "Interaction was not deemed relevant",
        DoraException.Type.Unknown,
        { severity: DoraException.Severity.Info },
      );
    },
    metadataSelector: (interaction) => ({
      user: interaction.user.tag,
      command: interaction.isChatInputCommand()
        ? interaction.commandName
        : null,
    }),
  });
};
