import type { User } from "discord.js"

import { actionWrapper } from "~/lib/actionWrapper"
import {
  getAllGuildMemberData,
  setMemberData,
} from "~/lib/database/memberDataService"
import { getGuild } from "~/lib/discord/guilds"
import { addRole } from "~/lib/discord/roles"
import {
  sendDebugInactivitySummaryToUser,
  sendInactivityNotice,
  sendKickNotice,
} from "~/lib/discord/sendMessage"
import { DoraException } from "~/lib/exceptions/DoraException"
import { subtractDaysFromDate } from "~/lib/helpers/date"
import { logger } from "~/lib/logger"

import { type GuildConfig, guildConfigs } from "../../guildConfigs"

export interface InactivityMemberData {
  guildId: string
  userId: string
  username: string
  displayName: string
  latestActivityAt?: Date | null
  inactiveSince?: Date | null
}

export const inactivityMonitor = async () => {
  for (const guildConfig of Object.values(guildConfigs)) {
    await actionWrapper({
      action: () =>
        handleInactivityCheck({
          guildId: guildConfig.guildId,
          inactivityConfig: guildConfig.inactivityMonitoring,
        }),
      meta: { guildId: guildConfig.guildId },
      actionDescription: "Handle inactivity summary",
      swallowError: true,
    })
  }
}

const handleInactivityCheck = async ({
  guildId,
  inactivityConfig,
}: {
  guildId: string
  inactivityConfig?: GuildConfig["inactivityMonitoring"]
}) => {
  if (!inactivityConfig) {
    return
  }

  const { daysUntilInactive, debugUserId } = inactivityConfig

  const inactiveThresholdDate = subtractDaysFromDate(
    new Date(),
    daysUntilInactive,
  )

  const guild = await getGuild(guildId)
  const members = await guild.members.fetch()
  const membersData = await getAllGuildMemberData(guild.id)

  const memberDataById = new Map(membersData.map((data) => [data.userId, data]))

  const inactiveMembers = new Map<string, InactivityMemberData>()
  for (const member of members.values()) {
    if (member.user.bot) {
      continue // Ignore bots
    }
    const memberData = memberDataById.get(member.id)

    const latestActivity = memberData?.latestActivityAt
    if (latestActivity && latestActivity > inactiveThresholdDate) {
      continue // Active member, disregard
    }

    inactiveMembers.set(member.id, {
      guildId: guild.id,
      userId: member.id,
      username: member.user.username,
      displayName: member.displayName,
      latestActivityAt: memberData?.latestActivityAt,
      inactiveSince: memberData?.inactiveSince,
    })
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
    const user = members.get(memberData.userId)?.user
    if (!user) {
      throw new DoraException(
        "Inactive member not found, are they part of the guild?",
        DoraException.Type.NotFound,
        { metadata: { debugUserId, guildId: guild.id } },
      )
    }

    if (memberData.inactiveSince) {
      await handleKickingInactiveMember({
        memberData: { ...memberData, inactiveSince: memberData.inactiveSince },
        guild,
        inactivityConfig,
        debugUser: debugMember.user,
      })
      continue
    }

    await handleSetMemberAsInactive({
      memberData,
      guild,
      inactivityConfig,
      user,
      debugUser: debugMember.user,
      inactiveThresholdDate,
    })
  }

  await sendDebugInactivitySummaryToUser({
    inactiveMembers: Array.from(inactiveMembers.values()),
    debugUser: debugMember.user,
    guildName: guild.name,
    inactivityConfig,
  })
}

const handleKickingInactiveMember = async ({
  memberData,
  guild,
  debugUser,
  inactivityConfig,
}: {
  memberData: { inactiveSince: Date } & InactivityMemberData
  guild: Awaited<ReturnType<typeof getGuild>>
  debugUser: User
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
}) => {
  const kickThresholdDate = subtractDaysFromDate(
    new Date(),
    inactivityConfig.daysAsInactiveBeforeKick,
  )
  if (memberData.inactiveSince > kickThresholdDate) {
    logger.debug(
      {
        userId: memberData.userId,
        guildId: guild.id,
        inactivityConfig,
        inactiveSince: memberData.inactiveSince,
        kickThresholdDate,
      },
      "Not yet time to kick inactive member",
    )
    return
  }

  // TODO: Re-add this when the actual kick is implemented
  // Reset their inactivity status
  // await setMemberData({
  //   memberData: {
  //     guildId: guild.id,
  //     userId: memberData.userId,
  //     username: memberData.username,
  //     displayName: memberData.displayName,
  //     inactiveSince: null,
  //   },
  // })

  await sendKickNotice({
    member: memberData,
    guildName: guild.name,
    debugUser,
    inactivityConfig,
  })
}

const handleSetMemberAsInactive = async ({
  memberData,
  guild,
  user,
  debugUser,
  inactivityConfig,
}: {
  memberData: InactivityMemberData
  guild: Awaited<ReturnType<typeof getGuild>>
  user: User
  debugUser: User
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
  inactiveThresholdDate: Date
}) => {
  if (inactivityConfig.inactiveRoleId) {
    await addRole({
      guild,
      user,
      roleId: inactivityConfig.inactiveRoleId,
    })
  }

  // Set inactive status
  await setMemberData({
    memberData: {
      guildId: guild.id,
      userId: memberData.userId,
      username: memberData.username,
      displayName: memberData.displayName,
      inactiveSince: new Date(),
    },
  })
  await sendInactivityNotice({
    inactiveMember: memberData,
    guildName: guild.name,
    debugUser,
    inactivityConfig,
  })
}
