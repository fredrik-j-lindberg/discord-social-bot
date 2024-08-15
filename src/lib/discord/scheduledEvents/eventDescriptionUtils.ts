import { GuildScheduledEvent } from "discord.js";

type ScheduledEventDescriptionProps = Pick<
  GuildScheduledEvent,
  "description" | "setDescription"
>;
const extractDataFromEventDescription = ({
  scheduledEvent: { description },
  selector,
}: {
  scheduledEvent: ScheduledEventDescriptionProps;
  selector: string;
}) => {
  const regex = new RegExp(`${selector}="([^"]+)"`); // Matches for example: roleId="12345", channelId="12345" or shouldRemind="true"
  const match = description?.match(regex);
  return match?.[1];
};

export const extractRoleIdFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => extractDataFromEventDescription({ scheduledEvent, selector: "roleId" });

export const extractChannelIdFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => extractDataFromEventDescription({ scheduledEvent, selector: "channelId" });

export const extractShouldRemindFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => {
  const shouldRemind = extractDataFromEventDescription({
    scheduledEvent,
    selector: "shouldRemind",
  });
  return shouldRemind === "true";
};

export const extractLatestReminderFromEventDescription = (
  scheduledEvent: ScheduledEventDescriptionProps,
) => {
  const latestReminderAt = extractDataFromEventDescription({
    scheduledEvent,
    selector: "latestReminderAt",
  });

  if (!latestReminderAt) return undefined;
  return parseInt(latestReminderAt);
};
