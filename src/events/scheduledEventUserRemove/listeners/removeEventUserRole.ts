import type { Events } from "discord.js"

import { actionWrapper } from "~/lib/actionWrapper"
import type { EventListener } from "~/lib/discord/events/registerEvent"
import { removeRole } from "~/lib/discord/roles"
import { validateScheduledEventForRoleChange } from "~/lib/discord/scheduledEvents/eventDescriptionUtils"
import { getMember } from "~/lib/discord/user"

export default {
  data: { name: "removeEventUserRole" },
  execute: async (unparsedScheduledEvent, user) => {
    const { scheduledEvent, roleId } = validateScheduledEventForRoleChange(
      unparsedScheduledEvent,
    )

    const member = await getMember({
      guild: scheduledEvent.guild,
      userId: user.id,
    })

    await actionWrapper({
      action: () => removeRole({ roleId, guild: scheduledEvent.guild, member }),
      actionDescription: "Remove role from user",
      meta: { roleId, guildId: scheduledEvent.guildId, userId: user.id },
    })
  },
} satisfies EventListener<Events.GuildScheduledEventUserRemove>
