import { Guild, GuildScheduledEvent } from "discord.js";
import { client } from "~/client";
import {
  extractChannelIdFromEventDescription,
  extractLatestReminderFromEventDescription,
  extractShouldRemindFromEventDescription,
} from "~/events/utils";
import { DoraException } from "./exceptions/DoraException";
import { logger } from "./logger";
import {
  assertIsDefined,
  assertIsBefore,
  assertChannelIsTextBased,
  assertIsTruthy,
} from "./validation";

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
      await announceScheduledEventIfRelevant({ guild, scheduledEvent });
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

const announceScheduledEventIfRelevant = async ({
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
    "No channelId found in event description, skipping potential event reminder",
    DoraException.Severity.Info,
  );
  const shouldRemind = extractShouldRemindFromEventDescription(
    scheduledEvent.description,
  );
  assertIsTruthy(
    shouldRemind,
    "No shouldRemind flag in event description was not found or it was set to false, skipping pontential event reminder",
    DoraException.Severity.Info,
  );

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

  const channel = await guild.channels.fetch(channelId);
  assertChannelIsTextBased(
    channel,
    "Channel in event description does not exist or is not a text based channel",
    DoraException.Severity.Warn,
  );
  const hoursAway = Math.round(
    (eventStartTimestamp - currentTime) / (60 * 60 * 1000),
  );
  const scheduledEventDescription = scheduledEvent.description?.replace(
    /\nlatestReminderAt=".*"/,
    "",
  );
  await scheduledEvent.setDescription(
    scheduledEventDescription + `\nlatestReminderAt="${Date.now()}"`,
  );
  const subscribers = await scheduledEvent.fetchSubscribers();
  const interestedUsers = subscribers.map((subscriber) => subscriber.user);
  const nameWithoutEmojis = removeEmojis(scheduledEvent.name); // Emojis break the markdown link
  await channel.send(
    `[${nameWithoutEmojis}](${scheduledEvent.url}) will take place in ${hoursAway} hours. Currently set as interested: ${interestedUsers.join(" ")}`,
  );
};

const removeEmojis = (input: string) => {
  // Stolen from here: https://stackoverflow.com/a/40763403
  const regex =
    /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g;
  const withoutEmojis = input.replace(regex, "");
  const withoutDoubleSpaces = withoutEmojis.replace("  ", " "); // <text> <emoji> <text> will result in double spaces
  return withoutDoubleSpaces.trim();
};
