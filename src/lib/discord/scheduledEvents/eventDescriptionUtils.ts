import {
  GuildScheduledEvent,
  type PartialGuildScheduledEvent,
} from "discord.js"

import { DoraException } from "~/lib/exceptions/DoraException"
import { assertHasDefinedProperty, assertIsDefined } from "~/lib/validation"

type ScheduledEventDescriptionProps = Pick<
  GuildScheduledEvent,
  "description" | "setDescription"
>
const extractDataFromEventDescription = ({
  scheduledEvent: { description },
  selector,
}: {
  scheduledEvent: ScheduledEventDescriptionProps
  selector: string
}) => {
  const regex = new RegExp(`${selector}="([^"]+)"`) // Matches for example: roleId="12345", channelId="12345" or shouldRemind="true"
  const match = description?.match(regex)
  return match?.[1]
}

export const extractRoleIdFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => extractDataFromEventDescription({ scheduledEvent, selector: "roleId" })

export const extractChannelIdFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => extractDataFromEventDescription({ scheduledEvent, selector: "channelId" })

export const extractShouldRemindFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => {
  const shouldRemind = extractDataFromEventDescription({
    scheduledEvent,
    selector: "shouldRemind",
  })
  return shouldRemind === "true"
}

export const extractLatestReminderFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => {
  const latestReminderAt = extractDataFromEventDescription({
    scheduledEvent,
    selector: "latestReminderAt",
  })

  if (!latestReminderAt) return undefined
  return parseInt(latestReminderAt)
}

export const setLatestReminderAtInEventDescription = async (
  scheduledEvent: ScheduledEventDescriptionProps,
) => {
  // Get description without current value if it exists
  const scheduledEventDescription = scheduledEvent.description?.replace(
    /\nlatestReminderAt=".*"/,
    "",
  )

  // Set new description with new value
  await scheduledEvent.setDescription(
    `${scheduledEventDescription}\nlatestReminderAt="${Date.now()}"`,
  )
}

/**
 * Validates that scheduled event is relevant for adding/removing roles
 *
 * @returns The validated scheduled event and role id
 * @throws DoraException of varying severity if the event does not pass assertions needed to proceed
 */
export const validateScheduledEventForRoleChange = (
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
