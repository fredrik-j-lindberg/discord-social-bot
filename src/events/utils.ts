import { ClientEvents } from "discord.js";
import { client } from "~/client";
import { actionWrapper } from "~/lib/actionWrapper";

type EventListener<TEvent extends keyof ClientEvents> = (
  ...args: ClientEvents[TEvent]
) => Promise<void> | void;

type RegisterEventParams<
  TEvent extends keyof ClientEvents = keyof ClientEvents,
> = {
  /** Discord event to listen for */
  event: TEvent;
  /** Callback that will be called when the event is triggered */
  listener: EventListener<TEvent>;
  /** Selector that picks relevant data from event to serve as context for logs */
  metadataSelector?: (
    ...args: ClientEvents[TEvent]
  ) => Record<string, string | null | undefined>;
};

export const registerEvent = <TEvent extends keyof ClientEvents>({
  event,
  listener,
  metadataSelector,
}: RegisterEventParams<TEvent>) => {
  client.on(event, async (...eventArgs) => {
    const metadata = metadataSelector?.(...eventArgs) || {};

    await actionWrapper({
      action: () => listener(...eventArgs),
      meta: { ...metadata, event: String(event) },
      actionDescription: "Handling discord.js event",
      swallowError: true,
    });
  });
};

export const extractDataFromEventDescription = ({
  description,
  selector,
}: {
  description: string | null;
  selector: string;
}) => {
  const regex = new RegExp(`${selector}="([^"]+)"`); // Matches for example: roleId="12345", channelId="12345" or shouldRemind="true"
  const match = description?.match(regex);
  return match?.[1];
};

export const extractRoleIdFromEventDescription = (description: string | null) =>
  extractDataFromEventDescription({ description, selector: "roleId" });

export const extractChannelIdFromEventDescription = (
  description: string | null,
) => extractDataFromEventDescription({ description, selector: "channelId" });

export const extractShouldRemindFromEventDescription = (
  description: string | null,
) => {
  const shouldRemind = extractDataFromEventDescription({
    description,
    selector: "shouldRemind",
  });
  return shouldRemind === "true";
};

export const extractLatestReminderFromEventDescription = (
  description: string | null,
) => {
  const latestReminderAt = extractDataFromEventDescription({
    description,
    selector: "latestReminderAt",
  });

  if (!latestReminderAt) return undefined;
  return parseInt(latestReminderAt);
};
