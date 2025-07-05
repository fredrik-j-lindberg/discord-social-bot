import { SlashCommandBuilder } from "discord.js"

import { getUserData } from "~/lib/database/userData"
import { assertHasDefinedProperty } from "~/lib/validation"

import type { Command } from "../commandRouter"
import piiModal from "../modals/piiModal"

export default {
  deferReply: false,
  data: new SlashCommandBuilder()
    .setName("pii")
    .setDescription("Triggers form for adding user data about yourself"),
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const userData = await getUserData({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    })
    const modal = piiModal.createModal({
      guildId: interaction.guild.id,
      userData,
    })
    await interaction.showModal(modal)
    return undefined // Modal submission will handle response
  },
} satisfies Command
