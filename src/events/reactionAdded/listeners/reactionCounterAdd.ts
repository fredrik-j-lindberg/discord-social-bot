import type { Events, Message, PartialMessage } from "discord.js"

import { addMemberReactionToStats } from "~/lib/database/memberDataService"
import { addMemberEmojiUsage } from "~/lib/database/memberEmojisService"
import type { EventListener } from "~/lib/discord/events/registerEvent"
import { getGuild } from "~/lib/discord/guilds"
import { removeRole } from "~/lib/discord/roles"
import { assertHasDefinedProperty } from "~/lib/validation"

import { guildConfigs } from "../../../../guildConfigs"

const getFullMessage = async (message: Message | PartialMessage) => {
  if (!message.partial) return message
  return await message.fetch()
}

export default {
  data: { name: "reactionCounterAdd" },
  execute: async (reaction, user) => {
    const message = await getFullMessage(reaction.message)

    assertHasDefinedProperty(
      message,
      "guild",
      "Reaction added for a message not linked to guild, can't be added to stats",
    )

    assertHasDefinedProperty(
      message,
      "member",
      "Reaction to a message without member info, can't be added to stats",
    )

    assertHasDefinedProperty(
      user,
      "username",
      "Reaction added for a user without username, can't be added to stats",
    )

    const guildId = message.guild.id

    const reactionTimestamp = new Date()
    const updatedMember = await addMemberReactionToStats({
      coreMemberData: {
        guildId,
        userId: user.id,
        username: user.username,
      },
      reactionTimestamp,
    })

    assertHasDefinedProperty(
      reaction.emoji,
      "name",
      "Reaction added but emoji name couldn't be found, can't be added to stats",
    )

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

    const emojis = await guild.emojis.fetch()
    const isGuildEmoji = emojis.some((emoji) => emoji.id === reaction.emoji.id)

    await addMemberEmojiUsage({
      values: {
        memberId: updatedMember.id,
        guildId,
        isGuildEmoji,
        emojiId: reaction.emoji.id,
        emojiName: reaction.emoji.name,
        messageId: message.id,
        messageAuthorUserId: message.author.id,
        timestamp: reactionTimestamp,
        context: "reaction",
        isAnimated: reaction.emoji.animated ?? false,
      },
    })
  },
} satisfies EventListener<Events.MessageReactionAdd>
