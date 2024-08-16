import { ModalBuilder, ModalSubmitInteraction } from "discord.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModalData<TModelInput = any> = {
  id: string;
  createModal: ((input: TModelInput) => ModalBuilder) | (() => ModalBuilder);
  listener: (interaction: ModalSubmitInteraction) => Promise<void> | void;
};
