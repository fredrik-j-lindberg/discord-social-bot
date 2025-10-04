import {
  type GuildBasedChannel,
  GuildScheduledEvent,
  type MessageCreateOptions,
  MessageFlags,
  User,
} from "discord.js"

import type { GuildConfig } from "../../../guildConfigs"
import { assertChannelIsTextBased, assertIsDefined } from "../validation"
import { createDiscordTimestamp } from "./message"

const sendMsg = async (
  channel: GuildBasedChannel | null,
  messagePayload: MessageCreateOptions,
) => {
  assertChannelIsTextBased(
    channel,
    "Channel was not found or is not a text based channel",
  )
  await channel.send(messagePayload)
}

export const sendBirthdayWish = async ({
  userId,
  channel,
}: {
  userId: string
  channel: GuildBasedChannel | null
}) => {
  await sendMsg(channel, {
    content: `Happy birthday, <@${userId}>! 🎉`,
    flags: MessageFlags.SuppressNotifications,
  })
}

export const sendEventReminder = async ({
  scheduledEvent,
  channel,
}: {
  scheduledEvent: GuildScheduledEvent
  channel: GuildBasedChannel | null
}) => {
  const subscribers = await scheduledEvent.fetchSubscribers()
  const interestedUsers = subscribers.map((subscriber) => subscriber.user)

  const eventStartTimestamp = scheduledEvent.scheduledStartTimestamp
  assertIsDefined(eventStartTimestamp, "No start timestamp found for event")

  const nameWithoutEmojis = removeEmojis(scheduledEvent.name) // Emojis break the markdown link
  const relativeDateFormat = createDiscordTimestamp(eventStartTimestamp)
  await sendMsg(channel, {
    content: `[${nameWithoutEmojis}](${scheduledEvent.url}) will take place ${relativeDateFormat}. Currently set as interested: ${interestedUsers.join(" ")}`,
  })
}

const removeEmojis = (input: string) => {
  // Regex stolen from here: https://stackoverflow.com/a/40763403
  const regexMatchingAllEmojis =
    /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g
  const withoutEmojis = input.replace(regexMatchingAllEmojis, "")
  const withoutDoubleSpaces = withoutEmojis.replace("  ", " ") // <text> <emoji> <text> will result in double spaces
  return withoutDoubleSpaces.trim()
}

interface MemberInactivityData {
  userId: string
  username: string
  latestActivityAt?: Date | null
}

export const sendDebugInactivitySummaryToUser = async ({
  inactiveMembers,
  debugUser,
  guildName,
  thresholdDate,
  inactivityConfig,
}: {
  inactiveMembers: MemberInactivityData[]
  debugUser: User
  guildName: string
  thresholdDate: Date
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
}) => {
  if (inactiveMembers.length === 0) {
    return
  }

  const intro = `The following members have been inactive recently in **${guildName}**. They were last seen:`
  const lines = inactiveMembers.map((memberData) => {
    const lastSeenText = memberData.latestActivityAt
      ? createDiscordTimestamp(memberData.latestActivityAt)
      : "No recorded activity"
    return `**${memberData.username}** (${memberData.userId}) - ${lastSeenText}`
  })
  const outro = `_Based on the guild config anyone with no activity since ${createDiscordTimestamp(thresholdDate)} is considered inactive. Inactive members will be removed from the server after ${inactivityConfig.daysAsInactiveBeforeKick} days._`

  await debugUser.send({
    content: `${intro}\n\n${lines.join("\n")}\n\n${outro}`,
  })
}

export const sendInactivityNotice = async ({
  inactiveMember,
  debugUser,
  guildName,
  thresholdDate,
  inactivityConfig,
}: {
  inactiveMember: MemberInactivityData
  debugUser: User
  guildName: string
  thresholdDate: Date
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
}) => {
  const { daysAsInactiveBeforeKick, daysUntilInactive } = inactivityConfig

  const intro = `Hello **${inactiveMember.username}** :wave: You are now marked as inactive in the **${guildName}** server and will be automatically removed from it after ${daysAsInactiveBeforeKick} days`
  const lastSeenText = inactiveMember.latestActivityAt
    ? `were last seen ${createDiscordTimestamp(inactiveMember.latestActivityAt)}`
    : "have no recorded activity"
  const info = `_Anyone with no activity for ${daysUntilInactive} days (${createDiscordTimestamp(thresholdDate)}) is considered inactive and you ${lastSeenText}. All you need to do to lose the inactive status is to send a message in the server, but you can ofc re-join as well after having been removed!_`

  await debugUser.send({
    content: `${intro}\n\n${info}`,
  })
}
