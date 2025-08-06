import type {
  AutocompleteInteraction,
  BaseMessageOptions,
  CommandInteraction,
  InteractionReplyOptions,
  ModalSubmitInteraction,
} from "discord.js"

import { DoraUserException } from "../exceptions/DoraUserException"

type ExecuteSupportedInteraction = CommandInteraction | ModalSubmitInteraction
type ExecuteResult = InteractionReplyOptions | string | undefined

export type InteractionExecute<
  TInteraction extends ExecuteSupportedInteraction,
> = (interaction: TInteraction) => Promise<ExecuteResult> | ExecuteResult

interface AutocompleteChoice {
  name: string
  value: string
}
export type InteractionAutocomplete = (
  interaction: AutocompleteInteraction,
) => Promise<AutocompleteChoice[]> | AutocompleteChoice[]

const reply = async ({
  interaction,
  deferReply,
  replyOptions,
}: {
  interaction: ExecuteSupportedInteraction
  deferReply: boolean
  replyOptions: BaseMessageOptions | string
}) => {
  if (deferReply) {
    await interaction.editReply(replyOptions)
    return
  }
  await interaction.reply(replyOptions)
}

interface ExecuteOptions<TInteraction extends ExecuteSupportedInteraction> {
  execute: InteractionExecute<TInteraction>
  deferReply: boolean
  interaction: TInteraction
  context: "command" | "modal"
}

export const executeCmdOrModalMappedToInteraction = async <
  TInteraction extends ExecuteSupportedInteraction,
>({
  execute,
  deferReply,
  interaction,
  context,
}: ExecuteOptions<TInteraction>) => {
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
