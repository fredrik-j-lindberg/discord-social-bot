import {
  type ClientEvents,
  GuildScheduledEvent,
  type PartialGuildScheduledEvent,
} from "discord.js"

import { actionWrapper } from "~/lib/actionWrapper"
import { addRole, removeRole } from "~/lib/discord/roles"
import { extractRoleIdFromEventDescription } from "~/lib/discord/scheduledEvents/eventDescriptionUtils"
import { DoraException } from "~/lib/exceptions/DoraException"
import { assertHasDefinedProperty, assertIsDefined } from "~/lib/validation"

import { registerEvent } from "../lib/discord/events/registerEvent"

const metadataSelector = (
  ...[scheduledEvent, user]: ClientEvents["guildScheduledEventUserAdd"]
) => ({
  user: user.tag,
  guild: scheduledEvent.guild?.name,
  scheduledEvent: scheduledEvent.name,
})

/**
 * Validates that scheduled event is relevant for adding/removing roles
 *
 * @returns The validated scheduled event and role id
 * @throws DoraException of varying severity if the event does not pass assertions needed to proceed
 */
const validateScheduledEventForRoleChange = (
  scheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent,
) => {
  assertHasDefinedProperty(
    scheduledEvent,
    "guild",
    "Event triggered without associated guild",
  )

  const roleId = extractRoleIdFromEventDescription(scheduledEvent)
  assertIsDefined(
    roleId,
    "Unable to find roleId in scheduled event description",
    DoraException.Severity.Info,
  )

  return { scheduledEvent, roleId }
}

export const registerScheduledEvents = () => {
  registerEvent({
    event: "guildScheduledEventUserAdd",
    listener: async (unparsedScheduledEvent, user) => {
      const { scheduledEvent, roleId } = validateScheduledEventForRoleChange(
        unparsedScheduledEvent,
      )

      await actionWrapper({
        action: () => addRole({ roleId, guild: scheduledEvent.guild, user }),
        actionDescription: "Add role to user",
        meta: { roleId: roleId },
      })
    },
    metadataSelector,
  })

  registerEvent({
    event: "guildScheduledEventUserRemove",
    listener: async (unparsedScheduledEvent, user) => {
      const { scheduledEvent, roleId } = validateScheduledEventForRoleChange(
        unparsedScheduledEvent,
      )

      await actionWrapper({
        action: () => removeRole({ roleId, guild: scheduledEvent.guild, user }),
        actionDescription: "Remove role from user",
        meta: { roleId: roleId },
      })
    },
    metadataSelector,
  })
}
