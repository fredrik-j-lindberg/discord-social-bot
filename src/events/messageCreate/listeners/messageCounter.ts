import type { Events } from "discord.js"

import { addMemberMessageToStats } from "~/lib/database/memberDataService"
import type { EventListener } from "~/lib/discord/events/registerEvent"
import { assertHasDefinedProperty } from "~/lib/validation"

export default {
  data: { name: "messageCounterAdd" },
  execute: async (message) => {
    assertHasDefinedProperty(
      message,
      "guild",
      "Message without guild, can't be added to stats",
    )

    await addMemberMessageToStats({
      coreMemberData: {
        guildId: message.guild.id,
        userId: message.author.id,
        username: message.author.username,
        displayName: message.member?.displayName,
      },
      messageTimestamp: message.createdAt,
    })
  },
} satisfies EventListener<Events.MessageCreate>
