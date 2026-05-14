import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getGuildConfig } from "~/lib/database/guildConfigService"
import { getRole } from "~/lib/discord/roles"
import { getMember } from "~/lib/discord/user"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { assertHasDefinedProperty } from "~/lib/validation"

import interestsModal from "../modals/interestsModal"

const command = new SlashCommandBuilder()
  .setName("interests")
  .setDescription("Select your interests to get matching roles on this server")
  .setContexts(0) // Guild only

export default {
  type: "chat",
  deferReply: false,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const guildConfig = await getGuildConfig(interaction.guild.id)
    const interestRoleIds = guildConfig?.interests?.roles ?? []

    if (interestRoleIds.length === 0) {
      throw new DoraUserException(
        "This server hasn't configured any interest roles yet. Ask an admin to set them up with `/config`.",
      )
    }

    // Resolve role names from Discord and determine which the member already has
    const guild = interaction.guild
    const member = await getMember({ guild, userId: interaction.user.id })
    const fetchedRoles = await Promise.all(
      interestRoleIds.map((id) => getRole({ guild, roleId: id })),
    )
    const memberRoleIds = new Set(member.roles.cache.keys())
    const currentRoleIds = interestRoleIds.filter((id) => memberRoleIds.has(id))
    const interestRoles = interestRoleIds.map((id, i) => ({
      id,
      name: fetchedRoles[i]?.name ?? id,
    }))

    const modal = await interestsModal.createModal({
      interestRoles,
      currentRoleIds,
    })
    await interaction.showModal(modal)
    return undefined // Modal submission handles the response
  },
} satisfies Command
