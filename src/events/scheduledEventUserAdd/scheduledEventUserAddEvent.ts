import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerScheduledEventUserAddEvent = () => {
  return registerEventListeners({
    event: Events.GuildScheduledEventUserAdd,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (scheduledEvent, user) => ({
      user: user.tag,
      guild: scheduledEvent.guild?.name,
      scheduledEvent: scheduledEvent.name,
    }),
  })
}
