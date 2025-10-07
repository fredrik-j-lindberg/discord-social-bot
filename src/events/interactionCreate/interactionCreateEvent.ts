import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerInteractionCreateEvent = () => {
  return registerEventListeners({
    event: Events.InteractionCreate,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (interaction) => ({
      user: interaction.user.tag,
      guildId: interaction.guildId,
      command: interaction.isChatInputCommand()
        ? interaction.commandName
        : null,
      modal: interaction.isModalSubmit() ? interaction.customId : null,
    }),
  })
}
