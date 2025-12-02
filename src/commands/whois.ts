import { type Interaction, SlashCommandBuilder } from "discord.js"

import { getActiveMemberFields } from "~/configs/memberFieldsConfig"
import { getMemberDataEmbed } from "~/embeds/memberDataEmbed"
import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"
import { getMemberData } from "~/lib/database/memberDataService"
import { getMemberEmojiCounts } from "~/lib/database/memberEmojisService"
import type { DoraReply } from "~/lib/discord/interaction"
import {
  createDiscordTimestamp,
  createEmojiMention,
  createList,
  createRoleMention,
} from "~/lib/discord/message"
import { getMember } from "~/lib/discord/user"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { formatDate } from "~/lib/helpers/date"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import { getStaticGuildConfigById } from "../../guildConfigs"

const memberOptionName = "member"
const memberDataOptionName = "memberdata"
const command = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Get info about a member")
  .addUserOption((option) =>
    option
      .setName(memberOptionName)
      .setDescription("The member to get info about")
      .setRequired(true),
  )
  .addBooleanOption((option) =>
    option
      .setName(ephemeralOptionName)
      .setDescription("Whether to reply silently (only visible to you)")
      .setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName(memberDataOptionName)
      .setDescription("The specific piece of member data to retrieve")
      .setAutocomplete(true)
      .setRequired(false),
  )

export default {
  type: "chat",
  deferReply: true,
  command,
  data: { name: command.name },
  autocomplete: (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command autocomplete issued without associated guild",
    )
    const guildConfig = getStaticGuildConfigById(interaction.guild.id)
    return Object.values(getActiveMemberFields(guildConfig)).map((field) => ({
      name: field.name,
      value: field.name,
    }))
  },
  execute: async (interaction) => {
    const user = interaction.options.getUser(memberOptionName)
    if (!user) {
      throw new DoraUserException(
        `Required '${memberOptionName}' option is missing`,
      )
    }
    const specificMemberData =
      interaction.options.getString(memberDataOptionName)
    return handleWhoIs({
      interaction,
      userId: user.id,
      specificMemberData,
    })
  },
} satisfies Command

export const handleWhoIs = async ({
  interaction,
  userId,
  specificMemberData,
}: {
  interaction: Interaction
  userId: string
  /** Send if only interested in a specific piece of member data, can be useful if for example you want to copy paste a value */
  specificMemberData?: string | null
}): Promise<DoraReply> => {
  assertHasDefinedProperty(
    interaction,
    "guild",
    "Command issued without associated guild",
  )

  const guildMember = await getMember({
    guild: interaction.guild,
    userId,
  })

  const memberData = await getMemberData({
    userId: guildMember.id,
    guildId: interaction.guild.id,
  })

  if (!memberData) {
    return `No member data was found for ${guildMember.displayName}`
  }

  const emojiCounts = await getMemberEmojiCounts({
    memberId: memberData.id,
    sortBy: "mostUsed",
    limit: 15,
  })

  // If we don't have a specific field requested, return the default embed
  if (!specificMemberData) {
    const embed = getMemberDataEmbed({
      guildId: interaction.guild.id,
      guildMember,
      memberData,
      emojiCounts,
    })
    return { embeds: [embed] }
  }

  const validChoices = getActiveMemberFields(
    getStaticGuildConfigById(interaction.guild.id),
  ).map((validField) => validField.name)

  if (!isOneOf(specificMemberData, validChoices)) {
    throw new DoraUserException(
      `Invalid field for ${memberDataOptionName} specified ('${specificMemberData}'). Valid fields are: ${validChoices.join(
        ", ",
      )}`,
    )
  }

  // If the field should have special handling, add an if here. Otherwise it defaults to the value below
  if (specificMemberData === "joinedServer") {
    return (
      createDiscordTimestamp(guildMember.joinedTimestamp) ||
      `No server join date was found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "accountCreation") {
    return (
      createDiscordTimestamp(guildMember.user.createdTimestamp) ||
      `No account creation date was found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "birthday") {
    return memberData.birthday
      ? `${formatDate(memberData[specificMemberData])}, ${createDiscordTimestamp(memberData.nextBirthday)}`
      : `No birthday was found for ${guildMember.displayName}. They can add it via the /pii command`
  }
  if (specificMemberData === "latestMessageAt") {
    return (
      createDiscordTimestamp(memberData[specificMemberData]) ||
      `No latest message date found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "latestReactionAt") {
    return (
      createDiscordTimestamp(memberData[specificMemberData]) ||
      `No latest reaction date found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "roles") {
    return createList({
      items: memberData.roleIds
        .filter((roleId) => roleId !== guildMember.guild.id) // Remove the irrelevant @everyone role
        .map((roleId) => createRoleMention(roleId)),
      header: `Roles for ${guildMember.displayName}`,
      fallback: `No roles found for ${guildMember.displayName}`,
    })
  }
  if (specificMemberData === "favoriteEmojis") {
    return createList({
      items: emojiCounts.map(
        ({ emojiId, emojiName, isAnimated, count }) =>
          `${createEmojiMention({ id: emojiId, name: emojiName, isAnimated })} (${count})`,
      ),
      header: `Favorite emojis for ${guildMember.displayName}`,
      fallback: `No favorite emojis found for ${guildMember.displayName}`,
    })
  }

  return (
    memberData[specificMemberData]?.toString() ||
    `No ${specificMemberData} found for ${guildMember.displayName}`
  )
}
