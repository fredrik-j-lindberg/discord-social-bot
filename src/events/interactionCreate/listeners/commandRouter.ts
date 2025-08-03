import type { Events, SlashCommandOptionsOnlyBuilder } from "discord.js"
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import type { EventListener } from "~/lib/discord/events/registerEvent"
import {
  executeCmdOrModalMappedToInteraction,
  type InteractionExecute,
} from "~/lib/discord/interaction"
import { DoraException } from "~/lib/exceptions/DoraException"
import { importFolderModules } from "~/lib/helpers/folder"
import { logger } from "~/lib/logger"

export default {
  data: { name: "command" },
  execute: (interaction) => {
    if (!interaction.isChatInputCommand()) return

    return commandRouter(interaction)
  },
} satisfies EventListener<Events.InteractionCreate>

export interface Command {
  command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder
  /** Context regarding the command */
  data: {
    name: string
  }
  /**
   * Function to run when command is issued
   * @returns The reply to the command
   */
  execute: InteractionExecute<ChatInputCommandInteraction>
  /**
   * Whether or not to defer the reply. Need more than 3 seconds to compose your reply? Then you need to defer
   * More context: https://discordjs.guide/slash-commands/response-methods.html#deferred-responses
   */
  deferReply: boolean
}

export const getAllCommands = async () => {
  return await importFolderModules<Command>(`${process.cwd()}/src/commands`)
}

let commands: Record<string, Command> | undefined
export const initCommands = async () => {
  commands = await getAllCommands()
  logger.info("Commands initialized")
}

const commandRouter = async (interaction: ChatInputCommandInteraction) => {
  if (!commands) {
    throw new DoraException(
      "Commands are not initialized",
      DoraException.Type.NotDefined,
      { severity: DoraException.Severity.Error },
    )
  }

  const command = commands[interaction.commandName]
  if (!command) {
    throw new DoraException("Unknown command", DoraException.Type.NotFound, {
      severity: DoraException.Severity.Info,
      metadata: { commandName: interaction.commandName },
    })
  }

  await executeCmdOrModalMappedToInteraction({
    execute: command.execute,
    deferReply: command.deferReply,
    interaction,
    context: "command",
  })
}
