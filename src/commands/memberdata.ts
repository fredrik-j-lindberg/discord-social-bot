import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import {
  getActiveMemberFields,
  getActiveMemberFieldsMap,
} from "~/configs/memberFieldsConfig"
import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import {
  getMembersWithField,
  type MemberDataDbKeysWithExtras,
} from "~/lib/database/memberDataService"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import type { MemberFields, MemberFieldsIds } from "~/lib/helpers/member"
import { mapToMemberFields } from "~/lib/helpers/member"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import { getStaticGuildConfigById } from "../../guildConfigs"

// Fields backed by the member data table (simple aggregation)
const dbSupportedFields = [
  "firstName",
  "birthday",
  "age",
  "nextBirthday",
  "phoneNumber",
  "email",
  "switchFriendCode",
  "pokemonTcgpFriendCode",
  "dietaryPreferences",
  "messageCount",
  "latestMessageAt",
  "reactionCount",
  "latestReactionAt",
] as const satisfies MemberDataDbKeysWithExtras[]

const memberDataOptionName = "memberdata"
const roleOptionName = "role"
const command = new SlashCommandBuilder()
  .setName("memberdata")
  .setDescription("Lists member data by field")
  .addStringOption((option) =>
    option
      .setName(memberDataOptionName)
      .setDescription("List member data for field")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addRoleOption((option) =>
    option
      .setName(roleOptionName)
      .setDescription("Optionally filter by role")
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
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const field = interaction.options.getString(memberDataOptionName)
    if (!field) {
      throw new DoraUserException(
        `Required option '${memberDataOptionName}' is missing`,
      )
    }

    const validChoices = getActiveMemberFields(
      getStaticGuildConfigById(interaction.guild.id).optInMemberFields,
    ).map((validField) => validField.id)

    if (!isOneOf(field, validChoices)) {
      throw new DoraUserException(
        `Invalid field '${field}' provided. Valid fields are: ${validChoices.join(
          ", ",
        )}`,
      )
    }

    return await handleFieldChoice({ interaction, field })
  },
} satisfies Command

type CommandInteractionWithGuild = Omit<
  ChatInputCommandInteraction,
  "guild"
> & {
  guild: NonNullable<ChatInputCommandInteraction["guild"]>
}

const handleFieldChoice = async ({
  interaction,
  field,
}: {
  interaction: CommandInteractionWithGuild
  field: MemberFieldsIds
  role?: { id: string } | null
}) => {
  const role = interaction.options.getRole(roleOptionName)
  const guildId = interaction.guild.id

  const activeFieldsConfig = getActiveMemberFieldsMap(
    getStaticGuildConfigById(guildId).optInMemberFields,
  )
  const fieldConfig = activeFieldsConfig[field]

  if (!fieldConfig) {
    throw new DoraUserException(
      `The '${field}' field is not active for this guild or has no configuration.`,
    )
  }

  const memberFieldsList = await fetchRelevantMemberData({
    interaction,
    guildId,
    field,
    role: role ? { id: role.id } : null,
  })

  if (!memberFieldsList?.length) {
    throw new DoraUserException("No member data found", {
      severity: DoraUserException.Severity.Info,
    })
  }

  const title = `Members with *${fieldConfig.name}* data`
  const titleWithRole = role ? `${title} in role \`${role.name}\`` : title

  const list = memberFieldsList
    .map((memberFields) => {
      return `- **${memberFields.displayName || memberFields.username}**: ${fieldConfig.formatter?.(memberFields) || "-"}`
    })
    .join("\n")
  return `${titleWithRole}\n${list}`
}

const fetchRelevantMemberData = async ({
  interaction,
  guildId,
  field,
  role,
}: {
  interaction: CommandInteractionWithGuild
  guildId: string
  field: MemberFieldsIds
  role: { id: string } | null
}): Promise<MemberFields[] | undefined> => {
  // Handling for fields stored in the DB
  if (isOneOf(field, dbSupportedFields)) {
    const membersDbData = await getMembersWithField({
      guildId,
      field,
      roleIds: role ? [role.id] : undefined,
    })
    return membersDbData.map((memberData) => mapToMemberFields({ memberData }))
  }

  // Handling for fields not stored in the DB (computed at runtime)
  const guildMembers = await interaction.guild.members.fetch()
  const members = Array.from(guildMembers.values())
  const roleFiltered = role
    ? members.filter((m) => m.roles.cache.has(role.id))
    : members
  if (field === "favoriteEmojis") {
    throw new DoraUserException(
      "This command does not support listing favorite emojis at this time. Note that /whois or /serverdata does support fetching favorite emoji data.",
    )
  }
  return roleFiltered.map((guildMember) => mapToMemberFields({ guildMember }))
}
