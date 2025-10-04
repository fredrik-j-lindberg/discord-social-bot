import { actionWrapper } from "~/lib/actionWrapper"
import {
  getAllGuildMemberData,
  type MemberData,
  setMemberData,
} from "~/lib/database/memberDataService"
import { getGuild } from "~/lib/discord/guilds"
import {
  sendDebugInactivitySummaryToUser,
  sendInactivityNotice,
} from "~/lib/discord/sendMessage"
import { DoraException } from "~/lib/exceptions/DoraException"
import { subtractDaysFromDate } from "~/lib/helpers/date"

import { type GuildConfig, guildConfigs } from "../../guildConfigs"

export const inactivityMonitor = async () => {
  for (const guildConfig of Object.values(guildConfigs)) {
    await actionWrapper({
      action: () => handleActivitySummary({ guildConfig }),
      actionDescription: "Handle inactivity summary",
      swallowError: true,
    })
  }
}

const handleActivitySummary = async ({
  guildConfig,
}: {
  guildConfig: GuildConfig
}) => {
  if (!guildConfig.inactivityMonitoring) {
    return
  }

  const { daysUntilInactive, debugUserId } = guildConfig.inactivityMonitoring

  const thresholdDate = subtractDaysFromDate(new Date(), daysUntilInactive)

  const guild = await getGuild(guildConfig.guildId)
  const members = await guild.members.fetch()
  const membersData = await getAllGuildMemberData(guild.id)

  const memberDataById = new Map(membersData.map((data) => [data.userId, data]))

  const inactiveMembers = new Map<
    string,
    MemberData | { userId: string; username: string }
  >()
  for (const member of members.values()) {
    if (member.user.bot) {
      continue // Ignore bots
    }
    const memberData = memberDataById.get(member.id)

    if (memberData && memberData.inactiveSince) {
      continue // Already marked as inactive, skip
    }

    const latestActivity = memberData?.latestActivityAt
    if (latestActivity && latestActivity > thresholdDate) {
      continue // Active member, disregard
    }

    inactiveMembers.set(
      member.id,
      memberData ?? { userId: member.id, username: member.user.username },
    )
  }

  const debugMember = members.find((member) => member.id === debugUserId)

  if (!debugMember) {
    throw new DoraException(
      "Debug member not found for inactivity summary, are they part of the guild?",
      DoraException.Type.NotFound,
      { metadata: { debugUserId, guildId: guild.id } },
    )
  }

  for (const memberData of inactiveMembers.values()) {
    await setMemberData({
      memberData: {
        guildId: guild.id,
        userId: memberData.userId,
        username: memberData.username,
        inactiveSince: new Date(),
      },
    })
    await sendInactivityNotice({
      inactiveMember: memberData,
      debugUser: debugMember.user,
      guildName: guild.name,
      thresholdDate,
      inactivityConfig: guildConfig.inactivityMonitoring,
    })
  }

  await sendDebugInactivitySummaryToUser({
    inactiveMembers: Array.from(inactiveMembers.values()),
    debugUser: await guild.client.users.fetch(debugUserId),
    guildName: guild.name,
    thresholdDate,
    inactivityConfig: guildConfig.inactivityMonitoring,
  })
}
