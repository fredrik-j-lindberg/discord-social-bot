import { Collection, Guild, GuildEmoji } from "discord.js"

import { client } from "~/client"

import { DoraException } from "../exceptions/DoraException"

export const getGuild = async (guildId: string): Promise<Guild> => {
  try {
    return await client.guilds.fetch(guildId)
  } catch (err) {
    throw new DoraException(
      "Failed to fetch guild",
      DoraException.Type.Unknown,
      {
        cause: err,
        metadata: { guildId },
      },
    )
  }
}

export const getGuildEmojis = async (
  guildId: string,
): Promise<Collection<string, GuildEmoji>> => {
  try {
    const guild = await getGuild(guildId)
    const emojis = await guild.emojis.fetch()
    if (emojis.size <= 0) {
      throw new DoraException(
        "No guild emojis found",
        DoraException.Type.Unknown,
        { metadata: { guildId } },
      )
    }
    return emojis
  } catch (err) {
    if (err instanceof DoraException) throw err
    throw new DoraException(
      "Failed to fetch guild emojis",
      DoraException.Type.Unknown,
      {
        cause: err,
        metadata: { guildId },
      },
    )
  }
}
