import type { Logger } from "pino"

import { DoraException } from "./exceptions/DoraException"
import { logger } from "./logger"

const logError = (err: unknown, actionLogger: Logger) => {
  if (!(err instanceof DoraException)) {
    actionLogger.error({ error: err }, `Failed action`)
    return
  }

  // Spreading err automatically skips stack trace and message. Change to not spread (just err) to include them.
  const infoContext = { reason: err.message, ...err }

  switch (err.severity) {
    case DoraException.Severity.Info:
      actionLogger.info(infoContext, `Early exited action`)
      break
    case DoraException.Severity.Debug:
      actionLogger.debug(infoContext, `Early exited action`)
      break
    case DoraException.Severity.Warn:
      actionLogger.warn(
        { reason: err.message, error: err },
        `Early exited action with warning`,
      )
      break
    default:
      actionLogger.error({ error: err }, `Failed action`)
  }
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
