import { ModalBuilder, ModalSubmitInteraction } from "discord.js";

export type ModalData = {
  id: string;
  createModal: () => ModalBuilder;
  listener: (interaction: ModalSubmitInteraction) => Promise<void> | void;
};
