import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerMessageCreateEvent = () => {
  return registerEventListeners({
    event: Events.MessageCreate,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (message) => ({
      user: message.interactionMetadata?.user.tag,
    }),
  })
}
