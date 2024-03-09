import { ClientEvents, Awaitable } from "discord.js";
import { client } from "~/client";
import { DoraException } from "~/lib/exceptions/DoraException";
import { logger } from "~/lib/logger";

type RegisterEventParams<
  TEvent extends keyof ClientEvents = keyof ClientEvents,
> = {
  event: TEvent;
  listener: (...args: ClientEvents[TEvent]) => Awaitable<
    { metadata?: Record<string, string> } & (
      | {
          status: "completed";
          actionTaken: string;
        }
      | { status: "skipped"; reason: string }
    )
  >;
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
        // If the error is external, we don't want to log it as an error as we did nothing wrong on our end
        if (err.responsible === DoraException.Responsible.External) {
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

export const extractRoleIdFromEventDescription = (
  description: string | null,
) => {
  const regex = /roleId="([^"]+)"/;
  const match = description?.match(regex);
  return match?.[1];
};
