import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerReactionAddEvent = () => {
  return registerEventListeners({
    event: Events.MessageReactionAdd,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (reaction, user) => {
      return {
        user: user.username,
        guildId: reaction.message.guildId,
        emoji: reaction.emoji.name,
        channel: reaction.message.channelId,
      }
    },
  })
}
