import { getUserData } from "~/lib/airtable/userData";
import { Command } from "./types";
import { piiModal } from "~/modals/piiModal";
import { assertHasDefinedProperty } from "~/lib/validation";

export const piiCommand: Command = {
  name: "pii",
  description: "Triggers form for adding user data about yourself",
  listener: async (interaction) => {
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
};
