import { Events } from "discord.js"

import { registerEventListeners } from "~/lib/discord/events/registerEvent"

export const registerMemberRemoveEvent = () => {
  return registerEventListeners({
    event: Events.GuildMemberRemove,
    listenerFolder: `${import.meta.dirname}/listeners`,
    metadataSelector: (member) => ({
      user: member.user.tag,
      guildId: member.guild.id,
    }),
  })
}
