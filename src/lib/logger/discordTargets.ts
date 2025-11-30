import type { TransportTargetOptions } from "pino"

import { staticGuildConfigs } from "../../../guildConfigs"

export const getDiscordTargets = () => {
  const targets: TransportTargetOptions[] = []

  Object.values(staticGuildConfigs).forEach((config) => {
    if (!config.logs) return

    targets.push({
      target: "./discordTransport/discordTransport",
      level: config.logs.levelThreshold,
      options: {
        guildId: config.guildId,
        webhookUrl: config.logs.webhookUrl,
      },
    })
  })

  return targets
}
