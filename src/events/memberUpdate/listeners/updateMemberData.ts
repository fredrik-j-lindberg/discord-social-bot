import type { Events } from "discord.js"

import { setMemberData } from "~/lib/database/memberDataService"
import type { EventListener } from "~/lib/discord/events/registerEvent"

export default {
  data: { name: "updateMemberData" },
  execute: (_oldMember, newMember) => {
    const roleIds = newMember.roles.cache.map((role) => role.id)
    void setMemberData({
      memberData: {
        guildId: newMember.guild.id,
        userId: newMember.user.id,
        username: newMember.user.username,
        displayName: newMember.displayName,
        roleIds,
      },
    })
  },
} satisfies EventListener<Events.GuildMemberUpdate>
