import { Guild, GuildScheduledEvent } from "discord.js";
import { DoraException } from "~/lib/exceptions/DoraException";
import { logger } from "~/lib/logger";

export const scheduledEventActionWrapper = async <TActionResult>({
  scheduledEvent,
  action,
  meta,
}: {
  /** Event to run action on */
  scheduledEvent: GuildScheduledEvent;
  /** Action to run for event */
  action: (
    scheduledEvent: GuildScheduledEvent,
  ) => Promise<TActionResult> | TActionResult;
  /** Relevant data to serve as context for logs */
  meta?: Record<string, string>;
}): Promise<TActionResult | undefined> => {
  const eventActionLogger = logger.child({
    scheduledEvent: scheduledEvent.name,
    ...meta,
  });
  try {
    const actionResult = await action(scheduledEvent);
    eventActionLogger.info("Successfully handled scheduled event action");
    return actionResult;
  } catch (err) {
    if (!(err instanceof DoraException)) {
      eventActionLogger.error(err, "Failed to handle scheduled event action");
      return;
    }
    if (err.severity === DoraException.Severity.Info) {
      eventActionLogger.info(
        { reason: err.message, error: err },
        "Skipped handling of scheduled event",
      );
      return;
    }
    if (err.severity === DoraException.Severity.Warn) {
      eventActionLogger.warn(
        { reason: err.message, error: err },
        "Was not able to run scheduled event action",
      );
      return;
    }
    eventActionLogger.error(err, "Failed to handle scheduled event action");
  }
};

type ScheduledEventIterationResult<TActionResult> = {
  result: TActionResult | undefined;
  scheduledEvent: GuildScheduledEvent;
};
export const scheduledEventIterator = async <TActionResult>({
  guild,
  action,
  meta,
}: {
  /** Guild to get events from */
  guild: Guild;
  /** Action to run for each event */
  action: (
    scheduledEvent: GuildScheduledEvent,
  ) => Promise<TActionResult> | TActionResult;
  /** Relevant data to serve as context for logs */
  meta?: Record<string, string>;
}): Promise<ScheduledEventIterationResult<TActionResult>[]> => {
  const scheduledEvents = await guild.scheduledEvents.fetch();
  const result = [];
  for (const [, scheduledEvent] of scheduledEvents) {
    const actionResult = await scheduledEventActionWrapper({
      scheduledEvent,
      action,
      meta,
    });
    result.push({ result: actionResult, scheduledEvent });
  }
  return result;
};
