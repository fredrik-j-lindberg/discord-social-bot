import type { Logger } from "pino"

import { DoraException } from "./exceptions/DoraException"
import { logger } from "./logger"

const logError = (err: unknown, actionLogger: Logger) => {
  if (!(err instanceof DoraException)) {
    actionLogger.error(err, `Failed action`)
    return
  }
  if (
    err.severity === DoraException.Severity.Info ||
    err.severity === DoraException.Severity.Debug
  ) {
    // Spreading err automatically skips stack trace and message. Change to not spread (just err) to include them.
    actionLogger.debug({ reason: err.message, ...err }, `Skipped action`)
    return
  }
  if (err.severity === DoraException.Severity.Warn) {
    actionLogger.warn(
      { reason: err.message, err },
      `Skipped action with warning`,
    )
    return
  }
  actionLogger.error(err, `Failed action`)
}

interface ActionWrapperArgs<TActionResponse> {
  action: () => Promise<TActionResponse> | TActionResponse
  actionDescription: string
  meta?: Record<string, string | null | undefined>
}

/**
 * Wraps action and handles errors and logging
 */
export function actionWrapper<TActionResponse>(
  args: ActionWrapperArgs<TActionResponse> & { swallowError: true },
): Promise<TActionResponse | undefined>

export function actionWrapper<TActionResponse>(
  args: ActionWrapperArgs<TActionResponse> & { swallowError?: false },
): Promise<TActionResponse>

export async function actionWrapper<TActionResponse>({
  action,
  actionDescription,
  meta = {},
  swallowError = false,
}: ActionWrapperArgs<TActionResponse> & {
  /** With it set to true, error does not bubble up and the response is undefined */
  swallowError?: boolean
}): Promise<TActionResponse | undefined> {
  const actionLogger = logger.child({ ...meta, action: actionDescription })
  actionLogger.debug(`Running action`)
  try {
    const actionResult = await action()
    actionLogger.debug(`Successfully ran action`)
    return actionResult
  } catch (err) {
    logError(err, actionLogger)

    if (swallowError) return

    throw err
  }
}
