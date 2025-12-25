import { actionWrapper } from "~/lib/actionWrapper"
import {
  getAllGuildConfigs,
  type GuildConfig,
} from "~/lib/database/guildConfigService"
import {
  getInactiveGuildMemberData,
  setMemberData,
} from "~/lib/database/memberDataService"
import { getGuild } from "~/lib/discord/guilds"
import { addRole } from "~/lib/discord/roles"
import {
  sendDebugInactivitySummaryToUser,
  sendInactivityNotice,
  sendKickNotice,
} from "~/lib/discord/sendMessage"
import { getMember } from "~/lib/discord/user"
import { subtractDaysFromDate } from "~/lib/helpers/date"
import {
  convertDatabaseMembersToDoraMembers,
  type DoraMember,
} from "~/lib/helpers/doraMember"
import { logger } from "~/lib/logger"

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
  // Fetch only the potentially inactive members directly from the database
  const doraDatabaseMembers = await getInactiveGuildMemberData({
    guildId: guild.id,
    inactiveThresholdDate,
  })

  const doraMembers = await convertDatabaseMembersToDoraMembers({
    doraDatabaseMembers,
    guild,
    skipBots: true,
  })

  for (const doraMember of doraMembers) {
    if (doraMember.stats.inactiveSince) {
      await handleKickingInactiveMemberIfRelevant({
        doraMember,
        guild,
        inactivityConfig,
      })
    } else {
      await handleSetMemberAsInactive({
        doraMember,
        guild,
        inactivityConfig,
        inactiveThresholdDate,
      })
    }
  }

  // TODO: Handle the summary differently
  const debugMember = await getMember({ guild, userId: "106098921985556480" }) // Neylion
  await sendDebugInactivitySummaryToUser({
    inactiveMembers: doraMembers,
    debugUser: debugMember.user,
    guildName: guild.name,
    inactivityConfig,
  })
}

/** Kicks the member if it has been inactive for too enough, based on the guild config */
const handleKickingInactiveMemberIfRelevant = async ({
  doraMember,
  guild,
  inactivityConfig,
}: {
  doraMember: DoraMember
  guild: Awaited<ReturnType<typeof getGuild>>
  inactivityConfig: NonNullable<GuildConfig["inactivity"]>
}) => {
  const kickThresholdDate = subtractDaysFromDate(
    new Date(),
    inactivityConfig.daysAsInactiveBeforeKick,
  )
  if (
    !doraMember.stats.inactiveSince ||
    doraMember.stats.inactiveSince > kickThresholdDate
  ) {
    logger.debug(
      {
        userId: doraMember.userId,
        guildId: guild.id,
        inactivityConfig,
        inactiveSince: doraMember.stats.inactiveSince,
        kickThresholdDate,
      },
      "Not yet time to kick inactive member",
    )
    return
  }

  await sendKickNotice({
    doraMember,
    guildName: guild.name,
    inactivityConfig,
  })

  await doraMember.guildMember.kick(
    `Automatically kicked due to inactivity. Last seen ${doraMember.stats.latestActivityAt?.toISOString() || "N/A"}`,
  )

  await setMemberData({
    doraMember: {
      guildId: guild.id,
      userId: doraMember.userId,
      username: doraMember.username,
      displayName: doraMember.displayName,
      stats: { inactiveSince: null },
    },
  })

  logger.info(
    {
      userId: doraMember.userId,
      guildId: guild.id,
    },
    `Kicked inactive member ${doraMember.displayName} from guild as their latest activity was ${doraMember.stats.latestActivityAt?.toISOString() || "N/A"}`,
  )
}

const handleSetMemberAsInactive = async ({
  doraMember,
  guild,
  inactivityConfig,
}: {
  doraMember: DoraMember
  guild: Awaited<ReturnType<typeof getGuild>>
  inactivityConfig: NonNullable<GuildConfig["inactivity"]>
  inactiveThresholdDate: Date
}) => {
  if (inactivityConfig.inactiveRoleId) {
    await addRole({
      guild,
      member: doraMember.guildMember,
      roleId: inactivityConfig.inactiveRoleId,
    })
  }

  // Set inactive status
  await setMemberData({
    doraMember: {
      guildId: guild.id,
      userId: doraMember.userId,
      username: doraMember.username,
      displayName: doraMember.displayName,
      stats: { inactiveSince: new Date() },
    },
  })
  await sendInactivityNotice({
    doraMember,
    guildName: guild.name,
    inactivityConfig,
  })

  logger.info(
    {
      userId: doraMember.userId,
      guildId: guild.id,
    },
    `Set member ${doraMember.displayName} as inactive in guild as their latest activity was ${doraMember.stats.latestActivityAt?.toISOString() || "N/A"} and the guild inactivity threshold is ${inactivityConfig.daysUntilInactive} days`,
  )
}
