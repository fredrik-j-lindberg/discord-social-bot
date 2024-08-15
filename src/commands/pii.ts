import { Command } from "./types";
import { piiModal } from "~/modals/piiModal";

export const piiCommand: Command = {
  name: "pii",
  description: "Triggers form for adding user data about yourself",
  listener: async (interaction) => {
    const modal = piiModal.createModal();
    await interaction.showModal(modal);
  },
};
