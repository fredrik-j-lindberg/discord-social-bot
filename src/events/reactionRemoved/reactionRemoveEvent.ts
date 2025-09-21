import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerReactionRemoveEvent = () => {
  return registerEventListeners({
    event: Events.MessageReactionRemove,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (reaction, user) => {
      return {
        user: user.username,
        emoji: reaction.emoji.name,
        channel: reaction.message.channelId,
      }
    },
  })
}
