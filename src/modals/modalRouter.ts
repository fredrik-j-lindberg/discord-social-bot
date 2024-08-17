import { ModalSubmitInteraction } from "discord.js";
import { DoraException } from "~/lib/exceptions/DoraException";
import { ModalData } from "./types";
import { piiModal } from "./piiModal";

export const modals: ModalData[] = [piiModal];

export const modalRouter = async (interaction: ModalSubmitInteraction) => {
  const modal = modals.find((modal) => modal.id === interaction.customId);
  if (!modal) {
    throw new DoraException("Unknown modal", DoraException.Type.NotFound, {
      severity: DoraException.Severity.Info,
      metadata: { customId: interaction.customId },
    });
  }
  if (modal.deferReply) {
    await interaction.deferReply();
  }
  try {
    await modal.listener(interaction);
  } catch (err) {
    const errorMessage = `Failed to process modal sumission :(`;
    if (modal.deferReply) {
      await interaction.editReply(errorMessage);
      throw err;
    }
    await interaction.reply(errorMessage);
    throw err;
  }
};
