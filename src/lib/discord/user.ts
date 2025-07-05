import { Guild, GuildMember, User } from "discord.js"

import { DoraException } from "../exceptions/DoraException"

export const getMember = ({
  guild,
  user,
}: {
  guild: Guild
  user: User
  cache?: boolean
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
