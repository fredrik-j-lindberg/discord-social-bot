import type { Events } from "discord.js"

import type { EventListener } from "~/lib/discord/events/registerEvent"

export default {
  data: { name: "updateDisplayName" },
  execute: (oldMember, newMember) => {
    // TODO: Update display name
    console.log("### fredrik: oldUser.tag", oldMember.user.tag)
    console.log("### fredrik: newUser.tag", newMember.user.tag)
  },
} satisfies EventListener<Events.GuildMemberUpdate>
