import { ModalBuilder, ModalSubmitInteraction } from "discord.js";
import { DoraException } from "~/lib/exceptions/DoraException";
import { logger } from "~/lib/logger";
import {
  importFolderModules,
  triggerExecutionMappedToInteraction,
} from "./routerHelper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModalData<TModelInput = any> = {
  data: { name: string };
  createModal: ((input: TModelInput) => ModalBuilder) | (() => ModalBuilder);
  handleSubmit: (interaction: ModalSubmitInteraction) => Promise<void> | void;
  deferReply: boolean;
};

export const getAllModals = async () => {
  return await importFolderModules<ModalData>("modals");
};

let modals: Record<string, ModalData>;
export const initModals = async () => {
  modals = await getAllModals();
  logger.info("Modals initialized");
};

export const modalRouter = async (interaction: ModalSubmitInteraction) => {
  const modal = modals[interaction.customId]; // The name is the id
  if (!modal) {
    throw new DoraException("Unknown modal", DoraException.Type.NotFound, {
      severity: DoraException.Severity.Info,
      metadata: { modalId: interaction.customId },
    });
  }

  await triggerExecutionMappedToInteraction({
    execute: modal.handleSubmit,
    deferReply: modal.deferReply,
    interaction,
    context: "modal",
  });
};
