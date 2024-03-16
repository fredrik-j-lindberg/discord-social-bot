import { Guild, GuildScheduledEvent } from "discord.js";
import { client } from "~/client";
import {
  extractChannelIdFromEventDescription,
  extractLatestReminderFromEventDescription,
  extractShouldRemindFromEventDescription,
} from "~/events/utils";
import { DoraException } from "../exceptions/DoraException";
import { logger } from "../logger";
import {
  assertIsDefined,
  assertIsBefore,
  assertChannelIsTextBased,
  assertIsTruthy,
} from "../validation";
import { sendEventReminder } from "./sendMessage";

export const announceRelevantScheduledEventsForAllGuilds = async () => {
  const oAuth2Guilds = await client.guilds.fetch();
  for (const [, oAuth2Guild] of oAuth2Guilds) {
    const guild = await oAuth2Guild.fetch();
    await announceRelevantScheduledEvents({ guild });
  }
};

const announceRelevantScheduledEvents = async ({ guild }: { guild: Guild }) => {
  const scheduledEvents = await guild.scheduledEvents.fetch();
  for (const [, scheduledEvent] of scheduledEvents) {
    const reminderLogger = logger.child({
      scheduledEvent: scheduledEvent.name,
    });
    try {
      await remindOfScheduledEvent({ guild, scheduledEvent });
      reminderLogger.info("Successfully reminded of event");
    } catch (err) {
      if (!(err instanceof DoraException)) {
        reminderLogger.error(err, "Failed to handle potential event reminder");
        continue;
      }
      if (err.severity === DoraException.Severity.Info) {
        reminderLogger.info(
          { reason: err.message, error: err },
          "Skipped reminding of event",
        );
        continue;
      }
      if (err.severity === DoraException.Severity.Warn) {
        reminderLogger.warn(
          { reason: err.message, error: err },
          "Was not able to handle potential event event",
        );
        continue;
      }
      reminderLogger.error(err, "Failed to handle potential event reminder");
    }
  }
};

const remindOfScheduledEvent = async ({
  guild,
  scheduledEvent,
}: {
  guild: Guild;
  scheduledEvent: GuildScheduledEvent;
}) => {
  const channelId = extractChannelIdFromEventDescription(
    scheduledEvent.description,
  );
  assertIsDefined(
    channelId,
    "No channelId found in event description",
    DoraException.Severity.Info,
  );
  const shouldRemind = extractShouldRemindFromEventDescription(
    scheduledEvent.description,
  );
  assertIsTruthy(
    shouldRemind,
    "No shouldRemind flag in event description was not found or it was set to false",
    DoraException.Severity.Info,
  );

  assertThatEventIsWithinReminderWindow({ scheduledEvent });

  const channel = await guild.channels.fetch(channelId);
  assertChannelIsTextBased(
    channel,
    "Channel in event description does not exist or is not a text based channel",
    DoraException.Severity.Warn,
  );
  await sendEventReminder({ scheduledEvent, channel });
  await updateLatestReminderAt(scheduledEvent);
};

const updateLatestReminderAt = async (scheduledEvent: GuildScheduledEvent) => {
  const scheduledEventDescription = scheduledEvent.description?.replace(
    /\nlatestReminderAt=".*"/,
    "",
  );
  await scheduledEvent.setDescription(
    scheduledEventDescription + `\nlatestReminderAt="${Date.now()}"`,
  );
};

const assertThatEventIsWithinReminderWindow = ({
  scheduledEvent,
}: {
  scheduledEvent: GuildScheduledEvent;
}) => {
  const eventStartTimestamp = scheduledEvent.scheduledStartTimestamp;
  assertIsDefined(eventStartTimestamp, "No start timestamp found for event");

  const currentTime = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const reminderWindowTimestamp = currentTime + oneDay;
  const previousReminderWindowTimestamp = eventStartTimestamp - oneDay;
  const latestReminderAtTimestamp = extractLatestReminderFromEventDescription(
    scheduledEvent.description,
  );
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
  );
  assertIsBefore(
    eventStartTimestamp,
    reminderWindowTimestamp,
    "Event is not within eligible time window for reminding",
    DoraException.Severity.Info,
    {
      eventStart: new Date(eventStartTimestamp).toISOString(),
      reminderWindow: new Date(reminderWindowTimestamp).toISOString(),
    },
  );
};
