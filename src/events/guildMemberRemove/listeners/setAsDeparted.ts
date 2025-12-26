import type { Events } from "discord.js"

import type { EventListener } from "~/lib/discord/events/registerEvent"
import { setDoraMemberAsDeparted } from "~/lib/helpers/doraMember"
import { logger } from "~/lib/logger"

export default {
  data: { name: "setAsDeparted" },
  execute: async (member) => {
    await setDoraMemberAsDeparted({
      userId: member.user.id,
      guildId: member.guild.id,
      username: member.user.username,
      displayName: member.displayName,
    })
    logger.info(
      { guildId: member.guild.id, userId: member.user.id },
      "Member was removed from the guild and was set as departed in Dora member data",
    )
  },
} satisfies EventListener<Events.GuildMemberRemove>
