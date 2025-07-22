import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import { DoraException } from "~/lib/exceptions/DoraException"
import { logger } from "~/lib/logger"

import {
  importFolderModules,
  type RouterInteractionExecute,
  triggerExecutionMappedToInteraction,
} from "./routerHelper"

export interface Command {
  /**
   * This contains a lot more properties than what has been set so far in the interest of keeping the type narrow
   *
   * Grab more properties from SlashCommandBuilder if needed
   */
  data: {
    name: SlashCommandBuilder["name"]
    toJSON: SlashCommandBuilder["toJSON"]
  }
  /**
   * Function to run when command is issued
   * @returns The reply to the command
   */
  execute: RouterInteractionExecute<ChatInputCommandInteraction>
  /**
   * Whether or not to defer the reply. Need more than 3 seconds to compose your reply? Then you need to defer
   * More context: https://discordjs.guide/slash-commands/response-methods.html#deferred-responses
   */
  deferReply: boolean
}

export const getAllCommands = async () => {
  return await importFolderModules<Command>("commands")
}

let commands: Record<string, Command> | undefined
export const initCommands = async () => {
  commands = await getAllCommands()
  logger.info("Commands initialized")
}

export const commandRouter = async (
  interaction: ChatInputCommandInteraction,
) => {
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

  await triggerExecutionMappedToInteraction({
    execute: command.execute,
    deferReply: command.deferReply,
    interaction,
    context: "command",
  })
}
