import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerScheduledEventUserRemoveEvent = () => {
  return registerEventListeners({
    event: Events.GuildScheduledEventUserRemove,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (scheduledEvent, user) => ({
      user: user.tag,
      guild: scheduledEvent.guild?.name,
      scheduledEvent: scheduledEvent.name,
    }),
  })
}
