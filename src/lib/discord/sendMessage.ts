import {
  GuildScheduledEvent,
  MessageFlags,
  type GuildBasedChannel,
  type MessageCreateOptions,
} from "discord.js";
import { assertChannelIsTextBased, assertIsDefined } from "../validation";
import { timeStampToDiscordTimeStamp } from "../helpers/date";

const sendMsg = async (
  channel: GuildBasedChannel | null,
  messagePayload: MessageCreateOptions,
) => {
  assertChannelIsTextBased(
    channel,
    "Channel was not found or is not a text based channel",
  );
  await channel.send(messagePayload);
};

export const sendBirthdayWish = async ({
  userId,
  channel,
}: {
  userId: string;
  channel: GuildBasedChannel | null;
}) => {
  await sendMsg(channel, {
    content: `Happy birthday, <@${userId}>! 🎉`,
    flags: MessageFlags.SuppressNotifications,
  });
};

export const sendEventReminder = async ({
  scheduledEvent,
  channel,
}: {
  scheduledEvent: GuildScheduledEvent;
  channel: GuildBasedChannel | null;
}) => {
  const subscribers = await scheduledEvent.fetchSubscribers();
  const interestedUsers = subscribers.map((subscriber) => subscriber.user);

  const eventStartTimestamp = scheduledEvent.scheduledStartTimestamp;
  assertIsDefined(eventStartTimestamp, "No start timestamp found for event");

  const nameWithoutEmojis = removeEmojis(scheduledEvent.name); // Emojis break the markdown link
  const relativeDateFormat = timeStampToDiscordTimeStamp(eventStartTimestamp);
  await sendMsg(channel, {
    content: `[${nameWithoutEmojis}](${scheduledEvent.url}) will take place ${relativeDateFormat}. Currently set as interested: ${interestedUsers.join(" ")}`,
  });
};

const removeEmojis = (input: string) => {
  // Regex stolen from here: https://stackoverflow.com/a/40763403
  const regexMatchingAllEmojis =
    /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g;
  const withoutEmojis = input.replace(regexMatchingAllEmojis, "");
  const withoutDoubleSpaces = withoutEmojis.replace("  ", " "); // <text> <emoji> <text> will result in double spaces
  return withoutDoubleSpaces.trim();
};
