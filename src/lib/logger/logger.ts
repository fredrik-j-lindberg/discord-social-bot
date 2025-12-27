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
  formatters: {
    // By default pino only outputs the numeric log level, we want the string label as well and for now choose to call it "severity"
    // Apart from making the json logs more readable this will also allow third party services like Loki to parse and display the log level label correctly
    level(label, number) {
      return { level: number, severity: label }
    },
  },
  base: {
    // Will help identify and group logs from this service (becomes service name in Loki for example)
    serviceName: "dora-bot",
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
