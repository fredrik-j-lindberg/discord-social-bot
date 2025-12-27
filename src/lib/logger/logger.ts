import pino, {
  type DestinationStream,
  type LoggerOptions,
  type TransportTargetOptions,
} from "pino"

import { env } from "~/env"

import { getAllGuildConfigs } from "../database/guildConfigService"
import { hasDefinedProperty } from "../validation"
import { getConsolePrettyTarget } from "./consoleTarget"
import { getDiscordTargets } from "./discordTargets"
import { getFileTarget } from "./fileTarget"

const convertTransportToStream = (targets: TransportTargetOptions[]) => {
  return pino.transport({ targets }) as DestinationStream
}

const loggerOptions: LoggerOptions = {
  level: "debug",
  serializers: {
    error: pino.stdSerializers.errWithCause,
    err: pino.stdSerializers.err,
  },
}

const baseTargets: TransportTargetOptions[] = [
  getConsolePrettyTarget(),
  getFileTarget(env.LOG_FILE_PATH),
]

const multistream = pino.multistream({
  level: "debug",
  stream: convertTransportToStream(baseTargets),
})

export const logger = pino(loggerOptions, multistream)

export const setDiscordLoggers = async () => {
  const allGuildConfigs = await getAllGuildConfigs()

  const logConfigs = allGuildConfigs
    .filter((config) => hasDefinedProperty(config, "logs"))
    .map((config) => ({
      guildId: config.guildId,
      webhookUrl: config.logs.webhookUrl,
      levelThreshold: config.logs.levelThreshold,
    }))

  const discordTargets = getDiscordTargets(logConfigs)
  if (discordTargets.length === 0) {
    logger.warn(
      "No Discord logger targets found, no logs will be sent to Discord servers",
    )
  }

  discordTargets.forEach((target) => {
    multistream.add({
      level: target.level || "info",
      stream: convertTransportToStream([target]),
    })
  })

  return logConfigs
}
