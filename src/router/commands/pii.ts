import piiModal from "../modals/piiModal";
import { assertHasDefinedProperty } from "~/lib/validation";
import { SlashCommandBuilder } from "discord.js";
import { Command } from "../commandRouter";
import { getUserData } from "~/lib/database/tempRouter";

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
    );

    const userData = await getUserData({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    });
    const modal = piiModal.createModal({
      guildId: interaction.guild.id,
      userData,
    });
    await interaction.showModal(modal);
    return undefined; // Modal submission will handle response
  },
} satisfies Command;
