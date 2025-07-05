import { ModalBuilder, ModalSubmitInteraction } from "discord.js";

import { DoraException } from "~/lib/exceptions/DoraException";
import { logger } from "~/lib/logger";

import {
  importFolderModules,
  type RouterInteractionExecute,
  triggerExecutionMappedToInteraction,
} from "./routerHelper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModalData<TModelInput = any> {
  data: {
    /** The router uses the name determine which modal to show */
    name: string;
  };
  createModal: ((input: TModelInput) => ModalBuilder) | (() => ModalBuilder);
  /**
   * Function to run when modal is submitted
   * @returns The reply to the user submitting the modal
   */
  handleSubmit: RouterInteractionExecute<ModalSubmitInteraction>;
  /**
   * Whether or not to defer the reply. Need more than 3 seconds to compose your reply? Then you need to defer
   * More context: https://discordjs.guide/slash-commands/response-methods.html#deferred-responses
   */
  deferReply: boolean;
}

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
