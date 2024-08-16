import { DoraException } from "./exceptions/DoraException";
import { logger } from "./logger";

/**
 * Wraps action and handles errors and logging
 */
export const actionWrapper = async <TActionResponse>({
  action,
  actionDescription,
  meta = {},
  /** With it set to true, error does not bubble up and the response is undefined */
  swallowError = false,
}: {
  action: () => Promise<TActionResponse> | TActionResponse;
  actionDescription: string;
  meta?: Record<string, string>;
  swallowError?: boolean;
}): Promise<TActionResponse | undefined> => {
  const actionLogger = logger.child({ ...meta, action: actionDescription });
  actionLogger.info(`Running action`);
  try {
    const actionResult = await action();
    actionLogger.info(`Successfully ran action`);
    return actionResult;
  } catch (err) {
    if (!(err instanceof DoraException)) {
      actionLogger.error(err, `Failed action`);
      return;
    }
    if (err.severity === DoraException.Severity.Info) {
      // Spreading err automatically skips stack trace and message. Change to not spread (just err) to include them.
      actionLogger.info({ reason: err.message, ...err }, `Skipped action`);
      return;
    }
    if (err.severity === DoraException.Severity.Warn) {
      actionLogger.warn(
        { reason: err.message, err },
        `Skipped action with warning`,
      );
      return;
    }
    actionLogger.error(err, `Failed action`);
    if (!swallowError) throw err;
  }
};
