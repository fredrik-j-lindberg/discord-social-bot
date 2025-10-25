import { Guild, GuildMember } from "discord.js"

import { DoraException } from "../exceptions/DoraException"

export const getRole = async ({
  guild,
  roleId,
}: {
  guild: Guild
  roleId: string
}) => {
  try {
    return await guild.roles.fetch(roleId)
  } catch (err) {
    throw new DoraException(
      `Failed to fetch role '${roleId}' in guild '${guild.name}'`,
      DoraException.Type.Unknown,
      { cause: err },
    )
  }
}

export const addRole = async ({
  roleId,
  guild,
  member,
}: {
  roleId: string
  guild: Guild
  member: GuildMember
}) => {
  const role = await getRole({ guild, roleId })
  if (!role) {
    throw new DoraException(
      `Unable to find role '${roleId}' in guild '${guild.name}' to add to user '${member.user.tag}'`,
      DoraException.Type.NotFound,
    )
  }

  try {
    await guild.members.addRole({ role, user: member })
  } catch (err) {
    throw new DoraException(
      `Failed to add role '${role.name}' in guild '${guild.name}' to user '${member.user.tag}'`,
      DoraException.Type.Unknown,
      { cause: err },
    )
  }

  return role
}

export const removeRole = async ({
  roleId,
  guild,
  member,
}: {
  roleId: string
  guild: Guild
  member: GuildMember
}) => {
  const role = await getRole({ guild, roleId })
  if (!role) {
    throw new DoraException(
      `Unable to find role '${roleId}' in guild '${guild.name}' to remove from user '${member.user.tag}'`,
      DoraException.Type.NotFound,
    )
  }

  try {
    await guild.members.removeRole({ role, user: member })
  } catch (err) {
    throw new DoraException(
      `Failed to remove role '${role.name}' in guild '${guild.name}' from user '${member.user.tag}'`,
      DoraException.Type.Unknown,
      { cause: err },
    )
  }

  return role
}
