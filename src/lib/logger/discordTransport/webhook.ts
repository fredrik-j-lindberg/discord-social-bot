import { EmbedBuilder, WebhookClient } from "discord.js"

import type { DiscordLog } from "./discordTransport"

const isValidDate = (date: Date) =>
  date instanceof Date && !isNaN(date.getTime())

const formatTimestamp = (date: Date | string | number | null | undefined) => {
  if (!date) return "Missing"

  const d = new Date(date)
  if (!isValidDate(d)) {
    return "Invalid"
  }
  return d.toISOString()
}

const logLevelToEmbedColor = {
  trace: 0x808080,
  debug: 0x008000,
  info: 0x00bfff,
  warn: 0xffa500,
  error: 0xff4500,
  fatal: 0xff0000,
} as const

export const sendWebhookMessage = async ({
  webhookUrl,
  log,
}: {
  webhookUrl: string
  log: DiscordLog
}) => {
  const webhookClient = new WebhookClient({
    url: webhookUrl,
  })

  const color = logLevelToEmbedColor[log.level]
  const embed = new EmbedBuilder().setColor(color).addFields([
    { name: "Message", value: log.msg },
    {
      name: "Timestamp",
      value: formatTimestamp(log.time),
      inline: true,
    },
    {
      name: "Level",
      value: log.level,
      inline: true,
    },
    { name: "Raw", value: JSON.stringify(log) },
  ])

  await webhookClient.send({
    embeds: [embed],
  })
}
