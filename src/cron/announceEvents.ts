import { Guild, GuildScheduledEvent } from "discord.js"

import { client } from "~/client"

import {
  extractChannelIdFromEventDescription,
  extractLatestReminderFromEventDescription,
  extractShouldRemindFromEventDescription,
  setLatestReminderAtInEventDescription,
} from "../lib/discord/scheduledEvents/eventDescriptionUtils"
import { scheduledEventIterator } from "../lib/discord/scheduledEvents/scheduledEventIterator"
import { sendEventReminder } from "../lib/discord/sendMessage"
import { DoraException } from "../lib/exceptions/DoraException"
import {
  assertIsBefore,
  assertIsDefined,
  assertIsTruthy,
} from "../lib/validation"

export const announceRelevantScheduledEventsForAllGuilds = async () => {
  const oAuth2Guilds = await client.guilds.fetch()
  for (const [, oAuth2Guild] of oAuth2Guilds) {
    const guild = await oAuth2Guild.fetch()
    await scheduledEventIterator({
      guild,
      action: (scheduledEvent) =>
        remindOfScheduledEvent({ guild, scheduledEvent }),
      actionDescription: "Announce scheduled event",
    })
  }
}

const remindOfScheduledEvent = async ({
  guild,
  scheduledEvent,
}: {
  guild: Guild
  scheduledEvent: GuildScheduledEvent
}) => {
  const shouldRemind = extractShouldRemindFromEventDescription(scheduledEvent)
  assertIsTruthy(
    shouldRemind,
    "No shouldRemind flag in event description was not found or it was set to false",
    DoraException.Severity.Info,
  )

  const channelId = extractChannelIdFromEventDescription(scheduledEvent)
  assertIsDefined(
    channelId,
    "No channelId found in event description",
    DoraException.Severity.Info,
  )

  assertThatEventIsWithinReminderWindow({ scheduledEvent })

  const channel = await guild.channels.fetch(channelId)
  await sendEventReminder({ scheduledEvent, channel })
  await setLatestReminderAtInEventDescription(scheduledEvent)
}

const assertThatEventIsWithinReminderWindow = ({
  scheduledEvent,
}: {
  scheduledEvent: GuildScheduledEvent
}) => {
  const eventStartTimestamp = scheduledEvent.scheduledStartTimestamp
  assertIsDefined(eventStartTimestamp, "No start timestamp found for event")

  const currentTime = Date.now()
  // TODO: Make this adjustable via event description
  const oneDay = 24 * 60 * 60 * 1000
  const reminderWindowTimestamp = currentTime + oneDay
  const previousReminderWindowTimestamp = eventStartTimestamp - oneDay
  const latestReminderAtTimestamp =
    extractLatestReminderFromEventDescription(scheduledEvent)
  assertIsBefore(
    latestReminderAtTimestamp || 0,
    previousReminderWindowTimestamp,
    "Event has already been reminded of in reminder window",
    DoraException.Severity.Info,
    {
      eventStart: new Date(eventStartTimestamp).toISOString(),
      latestReminderAt: new Date(latestReminderAtTimestamp || 0).toISOString(),
      previousReminderWindow: new Date(
        previousReminderWindowTimestamp,
      ).toISOString(),
    },
  )
  assertIsBefore(
    eventStartTimestamp,
    reminderWindowTimestamp,
    "Event is not within eligible time window for reminding",
    DoraException.Severity.Info,
    {
      eventStart: new Date(eventStartTimestamp).toISOString(),
      reminderWindow: new Date(reminderWindowTimestamp).toISOString(),
    },
  )
}
