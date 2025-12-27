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

const maxDiscordFieldLength = 1000
const truncateString = (
  str: string,
  maxLength: number = maxDiscordFieldLength,
) => {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + "..."
}

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

  const {
    severity,
    msg: logMessage,
    error,
    time,
    level: _level,
    pid: _pid,
    hostname: _hostname,
    serviceName: _serviceName,
    ...restLog
  } = log
  const color = logLevelToEmbedColor[severity]
  const { message: errorMessage, stack: errorStack, ...restError } = error || {}

  const embed = new EmbedBuilder().setColor(color).addFields([
    { name: "Message", value: logMessage },
    {
      name: "Timestamp",
      value: formatTimestamp(time),
      inline: true,
    },
    {
      name: "Level",
      value: severity,
      inline: true,
    },
  ])

  if (error) {
    embed.addFields([
      {
        name: "Error Message",
        value: errorMessage || "N/A",
      },
      {
        name: "Error Stack",
        value: `\`\`\`${truncateString(errorStack || "N/A")}\`\`\``,
      },
    ])
  }

  const unprocessedProperties = {
    ...restLog,
    error: error ? restError : undefined,
  }

  const stringifiedLog = JSON.stringify(unprocessedProperties)
  embed.addFields({
    name: "Unprocessed Log Properties",
    value: `\`\`\`json\n${truncateString(stringifiedLog)}\`\`\``,
  })

  await webhookClient.send({
    embeds: [embed],
  })
}
