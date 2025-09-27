import type { Events, Message, PartialMessage } from "discord.js"

import { addMemberReactionToStats } from "~/lib/database/memberDataService"
import type { EventListener } from "~/lib/discord/events/registerEvent"
import { assertHasDefinedProperty } from "~/lib/validation"

const getFullMessage = async (message: Message | PartialMessage) => {
  if (!message.partial) return message
  return await message.fetch()
}

export default {
  data: { name: "reactionCounterAdd" },
  execute: async (reaction, user) => {
    const message = await getFullMessage(reaction.message)

    assertHasDefinedProperty(
      message,
      "guild",
      "Reaction added for a message not linked to guild, can't be added to stats",
    )

    assertHasDefinedProperty(
      user,
      "username",
      "Reaction added for a user without username, can't be added to stats",
    )

    await addMemberReactionToStats({
      coreMemberData: {
        guildId: message.guild.id,
        userId: user.id,
        username: user.username,
      },
      reactionTimestamp: new Date(),
    })
  },
} satisfies EventListener<Events.MessageReactionAdd>
