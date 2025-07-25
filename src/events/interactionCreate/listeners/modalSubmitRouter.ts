import type { Events } from "discord.js"
import { ModalBuilder, ModalSubmitInteraction } from "discord.js"

import type { EventListener } from "~/lib/discord/events/registerEvent"
import {
  type InteractionExecute,
  triggerExecutionMappedToInteraction,
} from "~/lib/discord/interaction"
import { DoraException } from "~/lib/exceptions/DoraException"
import { importFolderModules } from "~/lib/helpers/folder"
import { logger } from "~/lib/logger"

export default {
  data: { name: "modalSubmit" },
  execute: (interaction) => {
    if (!interaction.isModalSubmit()) return
    return modalRouter(interaction)
  },
} satisfies EventListener<Events.InteractionCreate>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModalData<TModelInput = any> {
  data: {
    /** The router uses the name determine which modal to show */
    name: string
  }
  createModal: ((input: TModelInput) => ModalBuilder) | (() => ModalBuilder)
  /**
   * Function to run when modal is submitted
   * @returns The reply to the user submitting the modal
   */
  handleSubmit: InteractionExecute<ModalSubmitInteraction>
  /**
   * Whether or not to defer the reply. Need more than 3 seconds to compose your reply? Then you need to defer
   * More context: https://discordjs.guide/slash-commands/response-methods.html#deferred-responses
   */
  deferReply: boolean
}

export const getAllModals = async () => {
  return await importFolderModules<ModalData>(`${process.cwd()}/src/modals`)
}

let modals: Record<string, ModalData> | undefined
export const initModals = async () => {
  modals = await getAllModals()
  logger.info("Modals initialized")
}

export const modalRouter = async (interaction: ModalSubmitInteraction) => {
  if (!modals) {
    throw new DoraException(
      "Modals are not initialized",
      DoraException.Type.NotDefined,
      { severity: DoraException.Severity.Error },
    )
  }

  const modal = modals[interaction.customId] // The name is the id
  if (!modal) {
    throw new DoraException("Unknown modal", DoraException.Type.NotFound, {
      severity: DoraException.Severity.Info,
      metadata: { modalId: interaction.customId },
    })
  }

  await triggerExecutionMappedToInteraction({
    execute: modal.handleSubmit,
    deferReply: modal.deferReply,
    interaction,
    context: "modal",
  })
}
