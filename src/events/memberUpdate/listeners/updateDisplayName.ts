import type { Events } from "discord.js"

import { setMemberData } from "~/lib/database/memberDataService"
import type { EventListener } from "~/lib/discord/events/registerEvent"

export default {
  data: { name: "updateDisplayName" },
  execute: (_oldMember, newMember) => {
    void setMemberData({
      memberData: {
        guildId: newMember.guild.id,
        userId: newMember.user.id,
        username: newMember.user.username,
        displayName: newMember.displayName,
      },
    })
  },
} satisfies EventListener<Events.GuildMemberUpdate>
