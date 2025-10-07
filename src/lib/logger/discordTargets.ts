import type { TransportTargetOptions } from "pino"

import { guildConfigs } from "../../../guildConfigs"

export const getDiscordTargets = () => {
  const targets: TransportTargetOptions[] = []

  Object.values(guildConfigs).forEach((config) => {
    if (!config.logs) return

    targets.push({
      target: "./discordTransport",
      level: config.logs.levelThreshold,
      options: {
        guildId: config.guildId,
        webhookUrl: config.logs.webhookUrl,
      },
    })
  })

  return targets
}
