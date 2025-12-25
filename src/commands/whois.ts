import { type Interaction, SlashCommandBuilder } from "discord.js"

import {
  getActiveMemberFields,
  memberFieldsConfig,
} from "~/configs/memberFieldsConfig"
import { getMemberDataEmbed } from "~/embeds/memberDataEmbed"
import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"
import type { DoraReply } from "~/lib/discord/interaction"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { getDoraMember } from "~/lib/helpers/doraMember"
import {
  assertHasDefinedProperty,
  assertValidMemberField,
} from "~/lib/validation"

import { getStaticGuildConfigById } from "../../guildConfigs"

const memberOptionName = "member"
const memberDataOptionName = "memberdata"
const command = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Get info about a member")
  .setContexts(0) // Guild only
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
    return getActiveMemberFields(guildConfig.optInMemberFields).map(
      (field) => ({
        name: field.name,
        value: field.id,
      }),
    )
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

  const doraMember = await getDoraMember({
    guild: interaction.guild,
    userId,
  })

  // If we don't have a specific field requested, return the default embed
  if (!specificMemberData) {
    const embed = getMemberDataEmbed({
      guildId: interaction.guild.id,
      doraMember,
    })
    return { embeds: [embed] }
  }

  assertValidMemberField(
    specificMemberData,
    getStaticGuildConfigById(interaction.guild.id).optInMemberFields,
  )

  const memberFieldConfig = memberFieldsConfig[specificMemberData]
  const header = `*${memberFieldConfig.name}* for *${doraMember.displayName}*:`
  const value =
    memberFieldConfig.selector?.(doraMember, "long") ||
    `No \`${memberFieldConfig.name}\` data was found for ${doraMember.displayName}.${memberFieldConfig.provideGuidance ? ` *Hint: ${memberFieldConfig.provideGuidance}*` : ""}`
  return `${header}\n${value}`
}
