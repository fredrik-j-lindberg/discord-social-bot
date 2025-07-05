import { Guild } from "discord.js"

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
