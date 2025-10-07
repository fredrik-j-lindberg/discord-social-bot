import type { Events, SlashCommandOptionsOnlyBuilder } from "discord.js"
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import type { EventListener } from "~/lib/discord/events/registerEvent"
import {
  executeCmdOrModalMappedToInteraction,
  type InteractionAutocomplete,
  type InteractionExecute,
} from "~/lib/discord/interaction"
import { DoraException } from "~/lib/exceptions/DoraException"
import { importFolderModules } from "~/lib/helpers/folder"
import { logger } from "~/lib/logger"

let commands: Record<string, Command> | undefined
export const initCommands = async () => {
  commands = await getAllCommands()
  logger.debug("Commands initialized")
}

export default {
  data: { name: "command" },
  execute: async (interaction) => {
    const isCommand = interaction.isChatInputCommand()
    const isAutocomplete = interaction.isAutocomplete()

    if (!isCommand && !isAutocomplete) return

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
        severity: DoraException.Severity.Warn,
        metadata: { commandName: interaction.commandName },
      })
    }

    if (isAutocomplete) {
      if (!command.autocomplete) {
        throw new DoraException(
          "User tried to autocomplete a command which does not have autocomplete setup",
          DoraException.Type.NotFound,
          {
            severity: DoraException.Severity.Error,
            metadata: { commandName: interaction.commandName },
          },
        )
      }
      const choices = await command.autocomplete(interaction)
      const focusedValue = interaction.options.getFocused()
      const filteredChoices = choices.filter((choice) =>
        choice.name.startsWith(focusedValue),
      )
      await interaction.respond(filteredChoices)
      return
    }

    if (isCommand) {
      await executeCmdOrModalMappedToInteraction({
        execute: command.execute,
        deferReply: command.deferReply,
        interaction,
        context: "command",
      })
      return
    }
  },
} satisfies EventListener<Events.InteractionCreate>

export interface Command {
  command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder
  /** Context regarding the command */
  data: {
    name: string
  }
  /**
   * Function to run when the command is autocompleted
   * @returns The choices to return to the user
   */
  autocomplete?: InteractionAutocomplete
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
