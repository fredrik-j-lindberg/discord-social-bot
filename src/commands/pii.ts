import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getMemberData } from "~/lib/database/memberDataDb"
import { assertHasDefinedProperty } from "~/lib/validation"

import piiModal from "../modals/piiModal"

const command = new SlashCommandBuilder()
  .setName("pii")
  .setDescription("Triggers form for adding member data about yourself")

export default {
  deferReply: false,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const memberData = await getMemberData({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    })
    const modal = piiModal.createModal({
      guildId: interaction.guild.id,
      memberData,
    })
    await interaction.showModal(modal)
    return undefined // Modal submission will handle response
  },
} satisfies Command
