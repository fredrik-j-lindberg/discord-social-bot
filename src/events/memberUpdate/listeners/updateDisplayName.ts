import type { Events } from "discord.js"

import { setUserData } from "~/lib/database/userData"
import type { EventListener } from "~/lib/discord/events/registerEvent"

export default {
  data: { name: "updateDisplayName" },
  execute: (_oldMember, newMember) => {
    void setUserData({
      userData: {
        guildId: newMember.guild.id,
        userId: newMember.user.id,
        username: newMember.user.username,
        displayName: newMember.displayName,
      },
    })
  },
} satisfies EventListener<Events.GuildMemberUpdate>
