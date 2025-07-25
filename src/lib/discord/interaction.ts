import type {
  BaseMessageOptions,
  CommandInteraction,
  InteractionReplyOptions,
  ModalSubmitInteraction,
} from "discord.js"

import { DoraUserException } from "../exceptions/DoraUserException"

const reply = async ({
  interaction,
  deferReply,
  replyOptions,
}: {
  interaction: InteractionType
  deferReply: boolean
  replyOptions: BaseMessageOptions | string
}) => {
  if (deferReply) {
    await interaction.editReply(replyOptions)
    return
  }
  await interaction.reply(replyOptions)
}

type InteractionType = CommandInteraction | ModalSubmitInteraction
type ExecuteResult = InteractionReplyOptions | string | undefined

export type InteractionExecute<TInteraction extends InteractionType> = (
  interaction: TInteraction,
) => Promise<ExecuteResult> | ExecuteResult

interface Data<TInteraction extends InteractionType> {
  execute: InteractionExecute<TInteraction>
  deferReply: boolean
  interaction: TInteraction
  context: "command" | "modal"
}

export const triggerExecutionMappedToInteraction = async <
  TInteraction extends InteractionType,
>({
  execute,
  deferReply,
  interaction,
  context,
}: Data<TInteraction>) => {
  if (deferReply) {
    await interaction.deferReply()
  }
  try {
    const result = await execute(interaction)
    if (result) {
      await reply({
        interaction,
        deferReply,
        replyOptions: result,
      })
    }
  } catch (err) {
    let userFacingErrorMsg = `Failed to process ${context} :(`
    if (err instanceof DoraUserException) {
      userFacingErrorMsg = err.message
    }
    await reply({
      interaction,
      deferReply,
      replyOptions: { content: userFacingErrorMsg },
    })
    throw err
  }
}
