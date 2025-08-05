import { Collection, Guild, GuildMember, User } from "discord.js"

import { DoraException } from "../exceptions/DoraException"

export const getMember = ({
  guild,
  user,
}: {
  guild: Guild
  user: User
}): GuildMember | Promise<GuildMember> => {
  try {
    return guild.members.fetch(user.id)
  } catch (err) {
    throw new DoraException(
      `Failed to fetch guild member`,
      DoraException.Type.Unknown,
      { cause: err, metadata: { user: user.username, guildId: guild.id } },
    )
  }
}

/** Returns a <userId, member> collection */
export const getMembersInRole = async ({
  guild,
  roleId,
}: {
  guild: Guild
  roleId: string
}): Promise<Collection<string, GuildMember> | undefined> => {
  try {
    const role = await guild.roles.fetch(roleId)
    return role?.members
  } catch (err) {
    throw new DoraException(
      `Failed to fetch guild member`,
      DoraException.Type.Unknown,
      { cause: err, metadata: { roleId, guildId: guild.id } },
    )
  }
}
