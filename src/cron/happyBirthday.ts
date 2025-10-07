import { Guild, GuildMember } from "discord.js"

import { actionWrapper } from "~/lib/actionWrapper"
import { getMembersWithBirthdayTodayForAllGuilds } from "~/lib/database/memberDataService"
import { getChannel } from "~/lib/discord/channels"
import { getGuild } from "~/lib/discord/guilds"
import { addRole, getRole } from "~/lib/discord/roles"
import { sendBirthdayWish } from "~/lib/discord/sendMessage"
import { DoraException } from "~/lib/exceptions/DoraException"
import { assertIsDefined } from "~/lib/validation"

import { type GuildConfig, guildConfigs } from "../../guildConfigs"

export const happyBirthday = async () => {
  for (const guildConfig of Object.values(guildConfigs)) {
    await actionWrapper({
      action: () => resetBirthdayRole({ guildConfig }),
      actionDescription: "Reset birthday role",
      meta: { guildId: guildConfig.guildId },
      swallowError: true,
    })
  }

  const membersData = await getMembersWithBirthdayTodayForAllGuilds()
  for (const memberData of membersData) {
    const guild = await getGuild(memberData.guildId)
    const guildConfig = guildConfigs[guild.id]
    if (!guildConfig) {
      throw new DoraException(
        "Guild config not found",
        DoraException.Type.NotFound,
        { metadata: { guildId: guild.id } },
      )
    }
    const member = await guild.members.fetch(memberData.userId)
    await actionWrapper({
      action: () =>
        handleBirthdayRole({
          guild,
          roleId: guildConfig.birthdays.roleId,
          member,
        }),
      actionDescription: "Add birthday role",
      meta: { userId: memberData.userId, guildId: guild.id },
      swallowError: true,
    })

    await actionWrapper({
      action: () =>
        handleBirthdayWish({
          guild,
          channelId: guildConfig.birthdays.channelId,
          member,
        }),
      actionDescription: "Send birthday wish",
      meta: { userId: memberData.userId, guildId: guild.id },
      swallowError: true,
    })
  }
}

const resetBirthdayRole = async ({
  guildConfig,
}: {
  guildConfig: GuildConfig
}) => {
  const guild = await getGuild(guildConfig.guildId)
  const roleId = guildConfig.birthdays.roleId
  if (!roleId) {
    throw new DoraException(
      "No birthday role configured, skipping reset",
      DoraException.Type.NotFound,
      {
        severity: DoraException.Severity.Debug,
        metadata: { guildId: guild.id },
      },
    )
  }
  const role = await getRole({ guild, roleId })
  assertIsDefined(role, "Birthday role not found", DoraException.Severity.Warn)
  for (const [, member] of role.members) {
    await actionWrapper({
      action: () => member.roles.remove(role),
      actionDescription: "Remove birthday role from member",
      meta: { userId: member.user.id, guildId: guild.id },
      swallowError: true,
    })
  }
}

const handleBirthdayRole = async ({
  guild,
  roleId,
  member,
}: {
  guild: Guild
  roleId?: string
  member: GuildMember
}) => {
  assertIsDefined(
    roleId,
    "No birthday role configured",
    DoraException.Severity.Warn,
  )
  await addRole({ user: member.user, guild, roleId })
}

const handleBirthdayWish = async ({
  guild,
  channelId,
  member,
}: {
  guild: Guild
  channelId?: string
  member: GuildMember
}) => {
  assertIsDefined(
    channelId,
    "No birthday channel configured",
    DoraException.Severity.Warn,
  )
  const channel = await getChannel({ guild, channelId })
  assertIsDefined(
    channel,
    "Birthday channel not found",
    DoraException.Severity.Warn,
  )

  await sendBirthdayWish({ userId: member.user.id, channel })
}
