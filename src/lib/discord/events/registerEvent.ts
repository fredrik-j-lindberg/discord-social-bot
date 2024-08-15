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
