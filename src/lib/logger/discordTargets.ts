import { type Level, type TransportTargetOptions } from "pino"

export const getDiscordTargets = (
  logConfigs: {
    guildId: string
    webhookUrl: string
    levelThreshold: Level
  }[],
) => {
  const targets: TransportTargetOptions[] = []

  logConfigs.forEach(({ guildId, webhookUrl, levelThreshold }) => {
    targets.push({
      target: "./discordTransport/discordTransport",
      level: levelThreshold,
      options: {
        guildId,
        webhookUrl,
      },
    })
  })

  return targets
}
