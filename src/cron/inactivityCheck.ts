import type { GuildMember } from "discord.js"

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

/** Since we started collecting stats recently, let's wait with the inactivity monitor until we have enough data */
const inactivityActivityEnableDate = new Date("2025-12-01")

export const inactivityMonitor = async () => {
  // TODO: Remove this check when we pass the threshold date. Just in place to avoid kicking people prematurely
  if (new Date() < inactivityActivityEnableDate) {
    logger.debug(
      `The threshold date ${inactivityActivityEnableDate.toISOString()} has not passed. Inactivity monitor will run.`,
    )
    return
  }

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

  for (const memberData of inactiveMembers.values()) {
    const member = members.get(memberData.userId)
    if (!member) {
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
        member,
      })
      continue
    }

    await handleSetMemberAsInactive({
      memberData,
      guild,
      inactivityConfig,
      member,
      inactiveThresholdDate,
    })
  }

  if (debugMember) {
    await sendDebugInactivitySummaryToUser({
      inactiveMembers: Array.from(inactiveMembers.values()),
      debugUser: debugMember.user,
      guildName: guild.name,
      inactivityConfig,
    })
  }
}

const handleKickingInactiveMember = async ({
  memberData,
  guild,
  member,
  inactivityConfig,
}: {
  memberData: { inactiveSince: Date } & InactivityMemberData
  guild: Awaited<ReturnType<typeof getGuild>>
  member: GuildMember
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

  await sendKickNotice({
    memberData,
    guildName: guild.name,
    member,
    inactivityConfig,
  })

  await member.kick(
    `Automatically kicked due to inactivity. Last seen ${memberData.latestActivityAt?.toISOString() || "N/A"}`,
  )

  // TODO: Re-add this when the actual kick is implemented
  // Reset their inactivity status
  await setMemberData({
    memberData: {
      guildId: guild.id,
      userId: memberData.userId,
      username: memberData.username,
      displayName: memberData.displayName,
      inactiveSince: null,
    },
  })

  logger.info(
    {
      userId: memberData.userId,
      guildId: guild.id,
    },
    `Kicked inactive member ${memberData.displayName} from guild as their latest activity was ${memberData.latestActivityAt?.toISOString() || "N/A"}`,
  )
}

const handleSetMemberAsInactive = async ({
  memberData,
  guild,
  member,
  inactivityConfig,
}: {
  memberData: InactivityMemberData
  guild: Awaited<ReturnType<typeof getGuild>>
  member: GuildMember
  inactivityConfig: NonNullable<GuildConfig["inactivityMonitoring"]>
  inactiveThresholdDate: Date
}) => {
  if (inactivityConfig.inactiveRoleId) {
    await addRole({
      guild,
      member,
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
    memberData,
    guildName: guild.name,
    member,
    inactivityConfig,
  })

  logger.info(
    {
      userId: memberData.userId,
      guildId: guild.id,
    },
    `Set member ${memberData.displayName} as inactive in guild as their latest activity was ${memberData.latestActivityAt?.toISOString() || "N/A"} and the guild inactivity threshold is ${inactivityConfig.daysUntilInactive} days`,
  )
}
