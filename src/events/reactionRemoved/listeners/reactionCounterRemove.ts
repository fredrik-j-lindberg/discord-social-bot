import type { Events } from "discord.js"

import { removeMemberReactionFromStats } from "~/lib/database/memberDataService"
import type { EventListener } from "~/lib/discord/events/registerEvent"
import { assertHasDefinedProperty } from "~/lib/validation"

export default {
  data: { name: "reactionCounterRemove" },
  execute: async (reaction, user) => {
    const message = reaction.message
    assertHasDefinedProperty(
      message,
      "guild",
      "Reaction removed for a message not linked to guild, can't be removed from stats",
    )

    assertHasDefinedProperty(
      user,
      "username",
      "Reaction removed for a user without username, can't be removed from stats",
    )

    await removeMemberReactionFromStats({
      coreMemberData: {
        guildId: message.guild.id,
        userId: user.id,
        username: user.username,
      },
    })
  },
} satisfies EventListener<Events.MessageReactionAdd>
