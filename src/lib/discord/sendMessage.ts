import { GuildScheduledEvent, TextChannel } from "discord.js";
import { assertIsDefined } from "../validation";

export const sendEventReminder = async ({
  scheduledEvent,
  channel,
}: {
  scheduledEvent: GuildScheduledEvent;
  channel: TextChannel;
}) => {
  const subscribers = await scheduledEvent.fetchSubscribers();
  const interestedUsers = subscribers.map((subscriber) => subscriber.user);

  const eventStartTimestamp = scheduledEvent.scheduledStartTimestamp;
  assertIsDefined(eventStartTimestamp, "No start timestamp found for event");

  const nameWithoutEmojis = removeEmojis(scheduledEvent.name); // Emojis break the markdown link
  await channel.send(
    `[${nameWithoutEmojis}](${scheduledEvent.url}) will take place ${getTimeAwayString(eventStartTimestamp)}. Currently set as interested: ${interestedUsers.join(" ")}`,
  );
};

const getTimeAwayString = (eventStartTimestamp: number) => {
  const daysAway = Math.round(
    (eventStartTimestamp - Date.now()) / (24 * 60 * 60 * 1000),
  );

  const timeStart = getTimeFormatted(eventStartTimestamp);
  if (!daysAway) {
    return `today at ${timeStart}`;
  }
  if (daysAway === 1) {
    return `tomorrow at ${timeStart}`;
  }
  return "in " + daysAway + " days at " + timeStart;
};

const getTimeFormatted = (date: Date | number) => {
  const timeFormat = new Intl.DateTimeFormat("sv-SE", { timeStyle: "short" });
  return timeFormat.format(new Date(date));
};

const removeEmojis = (input: string) => {
  // Regex stolen from here: https://stackoverflow.com/a/40763403
  const regexMatchingAllEmojis =
    /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g;
  const withoutEmojis = input.replace(regexMatchingAllEmojis, "");
  const withoutDoubleSpaces = withoutEmojis.replace("  ", " "); // <text> <emoji> <text> will result in double spaces
  return withoutDoubleSpaces.trim();
};
