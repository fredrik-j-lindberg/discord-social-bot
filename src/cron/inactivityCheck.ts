import type { GuildMember } from "discord.js"

import { actionWrapper } from "~/lib/actionWrapper"
import {
  getAllGuildConfigs,
  type GuildConfig,
} from "~/lib/database/guildConfigService"
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

export interface InactivityMemberData {
  guildId: string
  userId: string
  username: string
  displayName: string
  latestActivityAt?: Date | null
  inactiveSince?: Date | null
}

export const inactivityMonitor = async () => {
  const guildConfigs = await getAllGuildConfigs()

  for (const guildConfig of guildConfigs) {
    await actionWrapper({
      action: () =>
        handleInactivityCheck({
          guildId: guildConfig.guildId,
          inactivityConfig: guildConfig.inactivity,
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
  inactivityConfig?: GuildConfig["inactivity"]
}) => {
  if (!inactivityConfig) {
    return
  }

  const { daysUntilInactive } = inactivityConfig

  const inactiveThresholdDate = subtractDaysFromDate(
    new Date(),
    daysUntilInactive,
  )

  const guild = await getGuild(guildId)
  const members = await guild.members.fetch()
  // TODO: Get all inactive dora members via a query instead of fetching all and then filtering in code
  const doraMembers = await getAllGuildMemberData(guild.id)

  const memberDataById = new Map(doraMembers.map((data) => [data.userId, data]))

  const inactiveMembers = new Map<string, InactivityMemberData>()
  for (const member of members.values()) {
    if (member.user.bot) {
      continue // Ignore bots
    }
    const doraMember = memberDataById.get(member.id)

    const latestActivity = doraMember?.stats.latestActivityAt
    if (latestActivity && latestActivity > inactiveThresholdDate) {
      continue // Active member, disregard
    }

    inactiveMembers.set(member.id, {
      guildId: guild.id,
      userId: member.id,
      username: member.user.username,
      displayName: member.displayName,
      latestActivityAt: doraMember?.stats.latestActivityAt,
      inactiveSince: doraMember?.stats.inactiveSince,
    })
  }

  for (const memberData of inactiveMembers.values()) {
    const member = members.get(memberData.userId)
    if (!member) {
      throw new DoraException(
        "Inactive member not found, are they part of the guild?",
        DoraException.Type.NotFound,
        { metadata: { userId: memberData.userId, guildId: guild.id } },
      )
    }

    if (memberData.inactiveSince) {
      await handleKickingInactiveMemberIfRelevant({
        memberData: { ...memberData, inactiveSince: memberData.inactiveSince },
        guild,
        inactivityConfig,
        member,
      })
    } else {
      await handleSetMemberAsInactive({
        memberData,
        guild,
        inactivityConfig,
        member,
        inactiveThresholdDate,
      })
    }
  }

  // TODO: Handle the summary differently
  const debugMember = members.find(
    (member) => member.id === "106098921985556480", // Neylion
  )
  if (!debugMember) {
    return
  }
  await sendDebugInactivitySummaryToUser({
    inactiveMembers: Array.from(inactiveMembers.values()),
    debugUser: debugMember.user,
    guildName: guild.name,
    inactivityConfig,
  })
}

/** Kicks the member if it has been inactive for too enough, based on the guild config */
const handleKickingInactiveMemberIfRelevant = async ({
  memberData,
  guild,
  member,
  inactivityConfig,
}: {
  memberData: { inactiveSince: Date } & InactivityMemberData
  guild: Awaited<ReturnType<typeof getGuild>>
  member: GuildMember
  inactivityConfig: NonNullable<GuildConfig["inactivity"]>
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
  inactivityConfig: NonNullable<GuildConfig["inactivity"]>
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
