import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerMessageCreateEvent = () => {
  return registerEventListeners({
    event: Events.MessageCreate,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (message) => {
      return {
        user: message.author.username,
        guildId: message.guildId,
        contentStart: `${message.content.substring(0, 5)}...`,
        channel: message.channelId,
      }
    },
  })
}
