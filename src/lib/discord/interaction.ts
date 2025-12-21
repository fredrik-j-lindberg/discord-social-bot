import {
  type AutocompleteInteraction,
  type CommandInteraction,
  ContainerBuilder,
  type ContextMenuCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
  TextDisplayBuilder,
} from "discord.js"

import { DoraUserException } from "../exceptions/DoraUserException"
import { paginate } from "./pagination"

interface ReplyOptions {
  content?: string
  embeds?: EmbedBuilder[]
}
type CustomizedReplyOptions = ContainerBuilder | ContainerBuilder[]
export type DoraReply =
  | string
  | ReplyOptions
  | CustomizedReplyOptions
  | undefined

export type ExecuteSupportedInteraction =
  | CommandInteraction
  | ModalSubmitInteraction
  | ContextMenuCommandInteraction

export type InteractionExecute<
  TInteraction extends ExecuteSupportedInteraction,
> = (interaction: TInteraction) => Promise<DoraReply> | DoraReply

interface AutocompleteChoice {
  name: string
  value: string
}
export type InteractionAutocomplete = (
  interaction: AutocompleteInteraction,
) => Promise<AutocompleteChoice[]> | AutocompleteChoice[]

const mergeBitFields = <T extends MessageFlags>(
  ...fields: (T | undefined)[]
): T | undefined => {
  const definedFields = fields.filter((f): f is T => f !== undefined)
  if (definedFields.length === 0) return undefined
  return definedFields.reduce((acc, field) => (acc | field) as T)
}

const reply = async ({
  interaction,
  deferReply,
  ephemeral,
  replyOptions,
}: {
  interaction: ExecuteSupportedInteraction
  deferReply: boolean
  ephemeral?: boolean | null
  replyOptions: DoraReply
}) => {
  if (Array.isArray(replyOptions)) {
    await paginate(interaction, replyOptions)
    return
  }

  if (replyOptions instanceof ContainerBuilder) {
    await paginate(interaction, [replyOptions])
    return
  }

  if (typeof replyOptions === "string") replyOptions = { content: replyOptions }

  const { content, embeds } = replyOptions ?? {}
  const componentsV2Flag = !embeds ? MessageFlags.IsComponentsV2 : undefined

  const sharedOptions = {
    components: content
      ? [new TextDisplayBuilder().setContent(content)]
      : undefined,
    embeds,
    flags: componentsV2Flag,
  } as const

  if (deferReply) {
    await interaction.editReply(sharedOptions)
    return
  }

  const ephemeralFlag = ephemeral ? MessageFlags.Ephemeral : undefined
  await interaction.reply({
    ...sharedOptions,
    flags: mergeBitFields(componentsV2Flag, ephemeralFlag),
  })
}

interface ExecuteOptions<TInteraction extends ExecuteSupportedInteraction> {
  execute: InteractionExecute<TInteraction>
  deferReply: boolean
  /** Whether the reply should only be visible to the user or for all users */
  ephemeral?: boolean | null
  interaction: TInteraction
  context: "command" | "modal"
}

export const executeCmdOrModalMappedToInteraction = async <
  TInteraction extends ExecuteSupportedInteraction,
>({
  execute,
  deferReply,
  ephemeral,
  interaction,
  context,
}: ExecuteOptions<TInteraction>) => {
  if (deferReply) {
    await interaction.deferReply({
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    })
  }

  try {
    const replyOptions = await execute(interaction)
    if (!replyOptions) {
      return
    }

    await reply({
      interaction,
      deferReply,
      ephemeral,
      replyOptions,
    })
  } catch (err) {
    let userFacingErrorMsg = `Failed to process ${context} :(`
    if (err instanceof DoraUserException) {
      userFacingErrorMsg = err.message
    }
    await reply({
      interaction,
      deferReply,
      ephemeral,
      replyOptions: { content: userFacingErrorMsg },
    })
    throw err
  }
}
