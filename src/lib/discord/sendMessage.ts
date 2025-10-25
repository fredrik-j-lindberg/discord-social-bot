import {
  type GuildBasedChannel,
  GuildMember,
  GuildScheduledEvent,
  type MessageCreateOptions,
  MessageFlags,
  User,
} from "discord.js"

import type { InactivityMemberData } from "~/cron/inactivityCheck"

import type { GuildConfig } from "../../../guildConfigs"
import { addDaysToDate } from "../helpers/date"
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

const getInactivityInfoText = ({
  inactivityConfig,
}: {
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
}) => {
  const { daysUntilInactive, daysAsInactiveBeforeKick } = inactivityConfig
  return `Anyone with no activity for **${daysUntilInactive}** days is considered inactive, once marked as inactive you will be removed from the server after **${daysAsInactiveBeforeKick}** days. All that is needed to lose the inactive status is to send a message in the server!`
}

export const sendDebugInactivitySummaryToUser = async ({
  inactiveMembers,
  debugUser,
  guildName,
  inactivityConfig,
}: {
  inactiveMembers: InactivityMemberData[]
  debugUser: User
  guildName: string
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
}) => {
  if (inactiveMembers.length === 0) {
    return
  }

  const intro = `The following members have been inactive recently in **${guildName}**. They were last seen:`
  const lines = inactiveMembers.map((memberData) => {
    const lastSeenText = memberData.latestActivityAt
      ? createDiscordTimestamp(memberData.latestActivityAt)
      : "N/A"

    const willBeKickedText = createDiscordTimestamp(
      addDaysToDate(
        memberData.inactiveSince || new Date(),
        inactivityConfig.daysAsInactiveBeforeKick,
      ),
    )
    return `**${memberData.displayName}** (${memberData.userId}) - Last seen: ${lastSeenText}, will be kicked: ${willBeKickedText}`
  })

  await debugUser.send({
    content: `${intro}\n\n${lines.join("\n")}\n\n${getInactivityInfoText({ inactivityConfig })}`,
  })
}

export const sendInactivityNotice = async ({
  inactiveMember,
  member,
  guildName,
  inactivityConfig,
}: {
  inactiveMember: InactivityMemberData
  member: GuildMember
  guildName: string
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
}) => {
  const lastSeenText = inactiveMember.latestActivityAt
    ? `were last seen ${createDiscordTimestamp(inactiveMember.latestActivityAt)}`
    : "have no recorded activity"
  const intro = `Hello **${inactiveMember.displayName}** :wave: You are now marked as inactive in the **${guildName}** server as you ${lastSeenText}`
  const info = `_${getInactivityInfoText({ inactivityConfig })}_`

  await member.send({
    content: `${intro}\n\n${info}`,
  })
}

export const sendKickNotice = async ({
  memberData,
  guildName,
  member,
  inactivityConfig: { inviteLink },
}: {
  guildName: string
  memberData: InactivityMemberData
  member: GuildMember
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
}) => {
  const intro = `Hello **${memberData.displayName}** :wave: You have been removed from the **${guildName}** server due to inactivity :cry:`

  if (!inviteLink) {
    await member.send({
      content: intro,
    })
    return
  }

  const rejoinInfo = `_You can re-join the server at any time using the invite link:_ ${inviteLink}`
  await member.send({
    content: `${intro}\n\n${rejoinInfo}`,
  })
}
