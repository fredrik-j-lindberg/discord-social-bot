import { getUserData } from "~/lib/airtable/userData";
import { piiModal } from "~/modals/piiModal";
import { assertHasDefinedProperty } from "~/lib/validation";
import { SlashCommandBuilder } from "discord.js";
import { Command } from "../commandRouter";

export default {
  deferReply: true,
  data: new SlashCommandBuilder()
    .setName("userdata")
    .setDescription("Triggers form for adding user data about yourself"),
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    );
    const userData = await getUserData(
      interaction.user.id,
      interaction.guild.id,
    );
    const modal = piiModal.createModal({
      guildId: interaction.guild.id,
      userData,
    });
    await interaction.showModal(modal);
  },
} satisfies Command;
