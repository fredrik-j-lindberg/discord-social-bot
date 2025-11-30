import pino, {
  type DestinationStream,
  type LoggerOptions,
  type TransportTargetOptions,
} from "pino"

import { staticGuildConfigs } from "../../../guildConfigs"
import { hasDefinedProperty } from "../validation"
import { getConsolePrettyTarget } from "./consoleTarget"
import { getDiscordTargets } from "./discordTargets"

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

const multistream = pino.multistream({
  level: "debug",
  stream: convertTransportToStream([getConsolePrettyTarget()]),
})

export const logger = pino(loggerOptions, multistream)

export const setDiscordLoggers = () => {
  const guildConfigs = staticGuildConfigs
  const logConfigs = Object.values(guildConfigs)
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
