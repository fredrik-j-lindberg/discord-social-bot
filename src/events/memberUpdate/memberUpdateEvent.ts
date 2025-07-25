import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerMemberUpdateEvent = () => {
  return registerEventListeners({
    event: Events.GuildMemberUpdate,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (_oldMember, newMember) => ({
      user: newMember.user.tag,
    }),
  })
}
