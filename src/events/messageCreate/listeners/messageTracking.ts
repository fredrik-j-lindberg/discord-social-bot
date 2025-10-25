import type { Events } from "discord.js"

import { addMemberMessageToStats } from "~/lib/database/memberDataService"
import { addMemberEmojiUsage } from "~/lib/database/memberEmojisService"
import type { EventListener } from "~/lib/discord/events/registerEvent"
import { getGuild } from "~/lib/discord/guilds"
import { extractEmojisFromMessage } from "~/lib/discord/message"
import { removeRole } from "~/lib/discord/roles"
import { assertHasDefinedProperty } from "~/lib/validation"

import { guildConfigs } from "../../../../guildConfigs"

export default {
  data: { name: "messageTracking" },
  execute: async (message) => {
    /**
     * The listener should only listen for user triggered messages.
     * This also makes sure we avoid an infinite loop of a bot responding to itself
     */
    if (message.author.bot) return

    assertHasDefinedProperty(
      message,
      "guild",
      "Message without guild, can't be added to stats",
    )

    assertHasDefinedProperty(
      message,
      "member",
      "Message sent without member info, can't be added to stats",
    )

    const updatedMember = await addMemberMessageToStats({
      coreMemberData: {
        guildId: message.guild.id,
        userId: message.author.id,
        username: message.author.username,
        displayName: message.member.displayName,
      },
      messageTimestamp: message.createdAt,
    })

    const guildId = message.guild.id
    const oauthGuild = await getGuild(guildId)
    const guild = await oauthGuild.fetch()

    const guildConfig = guildConfigs[guildId]
    const inactiveRoleId = guildConfig?.inactivityMonitoring?.inactiveRoleId
    if (inactiveRoleId) {
      await removeRole({
        guild,
        member: message.member,
        roleId: inactiveRoleId,
      })
    }

    const messageEmojis = extractEmojisFromMessage({
      text: message.content,
      deduplicate: true,
    })
    if (messageEmojis.length === 0) return

    const guildEmojis = await guild.emojis.fetch()
    for (const messageEmoji of messageEmojis) {
      const isGuildEmoji = guildEmojis.some(
        (guildEmoji) => guildEmoji.id === messageEmoji.id,
      )
      await addMemberEmojiUsage({
        values: {
          memberId: updatedMember.id,
          context: "message",
          guildId,
          messageId: message.id,
          messageAuthorUserId: message.author.id,
          emojiName: messageEmoji.name,
          emojiId: messageEmoji.id,
          timestamp: message.createdAt,
          isGuildEmoji,
          isAnimated: messageEmoji.isAnimated,
        },
      })
    }
  },
} satisfies EventListener<Events.MessageCreate>
