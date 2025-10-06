import type { Events } from "discord.js"

import { actionWrapper } from "~/lib/actionWrapper"
import type { EventListener } from "~/lib/discord/events/registerEvent"
import { addRole } from "~/lib/discord/roles"
import { validateScheduledEventForRoleChange } from "~/lib/discord/scheduledEvents/eventDescriptionUtils"

export default {
  data: { name: "addEventUserRole" },
  execute: async (unparsedScheduledEvent, user) => {
    const { scheduledEvent, roleId } = validateScheduledEventForRoleChange(
      unparsedScheduledEvent,
    )

    await actionWrapper({
      action: () => addRole({ roleId, guild: scheduledEvent.guild, user }),
      actionDescription: "Add role to user",
      meta: { roleId },
    })
  },
} satisfies EventListener<Events.GuildScheduledEventUserAdd>
