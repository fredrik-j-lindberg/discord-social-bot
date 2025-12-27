import build from "pino-abstract-transport"
import z from "zod"

import { sendWebhookMessage } from "./webhook"

const logSchema = z.looseObject({
  serviceName: z.string().optional(),
  level: z.number().optional(),
  severity: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
  time: z.number().optional(),
  guildId: z.string().optional(),
  msg: z.string(),
  error: z
    .looseObject({
      message: z.string().optional(),
      name: z.string().optional(),
      stack: z.string().optional(),
      cause: z.any().optional(),
    })
    .optional(),
  hostname: z.string().optional(),
  pid: z.number().optional(),
})

export type DiscordLog = z.infer<typeof logSchema>

const process = async ({
  log,
  options,
}: {
  log: DiscordLog
  options: { guildId: string; webhookUrl: string }
}) => {
  if (!log.guildId) {
    return // No Guild ID provided in log, not able to send to Discord
  }

  const { webhookUrl, guildId } = options
  if (guildId !== log.guildId) {
    return // The log is not relevant for this guild transport
  }

  // As this transport is handled in a separate thread, instead of using our regular methods to send messages,
  // we simply use the webhook URL directly. This makes sure we avoid having to log-in as well as conflicts
  // that can arise between this thread and the main thread (if e.g. we log in this thread, causing a loop)
  await sendWebhookMessage({ webhookUrl, log })
}

export const createTransport = (options: {
  guildId: string
  webhookUrl: string
}) => {
  return build(async (iterable) => {
    await iterable.forEach(async (log) => {
      try {
        const parsedLog = logSchema.parse(log)

        await process({
          log: parsedLog,
          options,
        })
      } catch (err) {
        console.error(err)
      }
    })
  })
}

export default createTransport
