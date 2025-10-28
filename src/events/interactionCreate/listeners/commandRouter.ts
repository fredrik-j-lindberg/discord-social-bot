import type {
  AutocompleteInteraction,
  ContextMenuCommandBuilder,
  Events,
  MessageContextMenuCommandInteraction,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  UserContextMenuCommandInteraction,
} from "discord.js"
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

const handleAutocomplete = async (
  interaction: AutocompleteInteraction,
  command: ChatCommand,
) => {
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
}

export default {
  data: { name: "command" },
  execute: async (interaction) => {
    if (!commands) {
      throw new DoraException(
        "Commands are not initialized",
        DoraException.Type.NotDefined,
        { severity: DoraException.Severity.Error },
      )
    }

    if (!("commandName" in interaction)) return

    const command = commands[interaction.commandName]
    if (!command) {
      throw new DoraException("Unknown command", DoraException.Type.NotFound, {
        severity: DoraException.Severity.Warn,
        metadata: { commandName: interaction.commandName },
      })
    }

    if (command.type === "chat") {
      if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction, command)
        return
      }

      if (interaction.isChatInputCommand()) {
        await executeCmdOrModalMappedToInteraction({
          execute: command.execute,
          deferReply: command.deferReply,
          interaction,
          context: "command",
        })
        return
      }
    }

    if (command.type === "user") {
      if (!interaction.isUserContextMenuCommand()) {
        throw new DoraException(
          "Thought user issued a user context menu command, but interaction did not match that assumption",
        )
      }
      await executeCmdOrModalMappedToInteraction({
        execute: command.execute,
        deferReply: true,
        interaction,
        context: "command",
      })
    }
  },
} satisfies EventListener<Events.InteractionCreate>

interface ChatCommand {
  command:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
  /** The type of command. E.g. "chat" for a regular slash command, "user" and "message" for context menu commands */
  type: "chat"
  /**
   * The function to run when the command is autocompleted
   * @returns the autocomplete choices to display to the user
   */
  autocomplete?: InteractionAutocomplete
  /**
   * Whether or not to defer the reply. Need more than 3 seconds to compose your reply? Then you need to defer
   * More context: https://discordjs.guide/slash-commands/response-methods.html#deferred-responses
   */
  deferReply: boolean
  /**
   * Function to run when command is issued
   * @returns The reply to the command
   */
  execute: InteractionExecute<ChatInputCommandInteraction>
}

export interface UserContextMenuCommand {
  command: ContextMenuCommandBuilder
  type: "user"
  execute: InteractionExecute<UserContextMenuCommandInteraction>
}

export interface MessageContextMenuCommand {
  command: ContextMenuCommandBuilder
  type: "message"
  execute: InteractionExecute<MessageContextMenuCommandInteraction>
}

export type Command = (
  | ChatCommand
  | UserContextMenuCommand
  | MessageContextMenuCommand
) & {
  /** Context regarding the command */
  data: {
    name: string
  }
}

export const getAllCommands = async () => {
  return await importFolderModules<Command>(`${process.cwd()}/src/commands`)
}
