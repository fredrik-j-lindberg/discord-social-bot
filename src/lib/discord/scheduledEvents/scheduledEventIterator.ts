import { Guild, GuildScheduledEvent } from "discord.js";

import { actionWrapper } from "~/lib/actionWrapper";

interface ScheduledEventIterationResult<TActionResult> {
  result: TActionResult | undefined;
  scheduledEvent: GuildScheduledEvent;
}

/**
 * Runs specified action for each individual event
 *
 * @returns Array of objects, containing the result from each action and the corresponding event
 */
export const scheduledEventIterator = async <TActionResult>({
  guild,
  action,
  actionDescription,
  meta,
}: {
  /** Guild to get events from */
  guild: Guild;
  /** Action to run for each event */
  action: (
    scheduledEvent: GuildScheduledEvent,
  ) => Promise<TActionResult> | TActionResult;
  /** Description of action for log context */
  actionDescription: string;
  /** Relevant data to serve as additional context for logs */
  meta?: Record<string, string>;
}): Promise<ScheduledEventIterationResult<TActionResult>[]> => {
  const scheduledEvents = await guild.scheduledEvents.fetch();
  const result = [];
  for (const [, scheduledEvent] of scheduledEvents) {
    const actionResult = await actionWrapper({
      action: () => action(scheduledEvent),
      meta: { ...meta, scheduledEvent: scheduledEvent.name },
      actionDescription,
      swallowError: true,
    });
    result.push({ result: actionResult, scheduledEvent });
  }
  return result;
};
