import { ClientEvents, Awaitable } from "discord.js";
import { client } from "~/client";
import { DoraException } from "~/lib/exceptions/DoraException";
import { logger } from "~/lib/logger";

type EventListenerReturnValue = {
  metadata?: Record<string, string>;
} & (
  | {
      status: "completed";
      actionTaken: string;
    }
  | { status: "skipped"; reason: string }
);

type EventListener<TEvent extends keyof ClientEvents> = (
  ...args: ClientEvents[TEvent]
) => Awaitable<EventListenerReturnValue>;

type RegisterEventParams<
  TEvent extends keyof ClientEvents = keyof ClientEvents,
> = {
  event: TEvent;
  listener: EventListener<TEvent>;
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
    const eventLogger = logger.child({ ...metadata, event: String(event) });
    eventLogger.info(`${String(event)}: Registered event`);

    try {
      const result = await listener(...eventArgs);

      if (result.status === "skipped") {
        eventLogger.info(
          { reason: result.reason, ...result.metadata },
          `${String(event)}: Skipped handling event`,
        );
        return;
      }
      eventLogger.info(
        { ...result.metadata, actionTaken: result.actionTaken },
        `${String(event)}: Successfully handled event`,
      );
    } catch (err) {
      if (err instanceof DoraException) {
        if (err.severity === DoraException.Severity.Info) {
          eventLogger.info(
            { reason: err.message },
            `${String(event)}: Skipped handling event`,
          );
          return;
        }
      }
      eventLogger.error(err, `${String(event)}: Failed to handle event`);
    }
  });
};

export const extractDataFromEventDescription = ({
  description,
  selector,
}: {
  description: string | null;
  selector: string;
}) => {
  const regex = new RegExp(`${selector}="([^"]+)"`);
  const match = description?.match(regex);
  return match?.[1];
};

export const extractRoleIdFromEventDescription = (description: string | null) =>
  extractDataFromEventDescription({ description, selector: "roleId" });