import type { Guild } from "discord.js"

import { client } from "~/client"
import { actionWrapper } from "~/lib/actionWrapper"
import { setMemberData } from "~/lib/database/memberDataService"
import { getDoraDiscordMembers } from "~/lib/helpers/doraMember"

/**
 * Make sure the database is up to date with relevant info from Discord.
 * The aim should be for this to be syncing realtime, but if something is missed (e.g. the bot was down during an event that should have triggered a sync) this sync works as a fallback
 */
export const syncDiscordMembersWithDb = async (): Promise<void> => {
  const oAuth2Guilds = await client.guilds.fetch()
  for (const [, oAuth2Guild] of oAuth2Guilds) {
    await actionWrapper({
      action: async () => {
        const guild = await oAuth2Guild.fetch()
        await syncGuildDiscordMembersWithDb(guild)
      },
      meta: { guildId: oAuth2Guild.id, guildName: oAuth2Guild.name },
      actionDescription: "Sync discord member data for guild",
      swallowError: true,
    })
  }
}

const syncGuildDiscordMembersWithDb = async (guild: Guild): Promise<void> => {
  const doraDiscordMembers = await getDoraDiscordMembers({
    guild,
    skipBots: true,
  })

  for (const doraDiscordMember of doraDiscordMembers) {
    const discordRoleIds = doraDiscordMember.roleIds

    await setMemberData({
      doraMember: {
        guildId: guild.id,
        userId: doraDiscordMember.userId,
        username: doraDiscordMember.username,
        displayName: doraDiscordMember.displayName,
        roleIds: discordRoleIds,
      },
    })
  }
}
