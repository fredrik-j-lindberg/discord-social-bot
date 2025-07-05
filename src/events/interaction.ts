import { DoraException } from "~/lib/exceptions/DoraException"
import { commandRouter } from "~/router/commandRouter"
import { modalRouter } from "~/router/modalRouter"

import { registerEvent } from "../lib/discord/events/registerEvent"

export const registerInteractionEvent = () => {
  registerEvent({
    event: "interactionCreate",
    listener: async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await commandRouter(interaction)
        return
      }
      if (interaction.isModalSubmit()) {
        await modalRouter(interaction)
        return
      }

      throw new DoraException(
        "Interaction was not deemed relevant",
        DoraException.Type.Unknown,
        { severity: DoraException.Severity.Info },
      )
    },
    metadataSelector: (interaction) => ({
      user: interaction.user.tag,
      command: interaction.isChatInputCommand()
        ? interaction.commandName
        : null,
      modal: interaction.isModalSubmit() ? interaction.customId : null,
    }),
  })
}
