import { Collection, Guild, GuildMember } from "discord.js"

import { DoraException } from "../exceptions/DoraException"

export const getMember = ({
  guild,
  userId,
}: {
  guild: Guild
  userId: string
}): GuildMember | Promise<GuildMember> => {
  try {
    return guild.members.fetch(userId)
  } catch (err) {
    throw new DoraException(
      `Failed to fetch guild member`,
      DoraException.Type.Unknown,
      { cause: err, metadata: { userId, guildId: guild.id } },
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
