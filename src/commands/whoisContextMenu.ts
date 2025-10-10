import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"

import { handleWhoIs } from "./whois"

const command = new ContextMenuCommandBuilder()
  .setName("Whois")
  .setType(ApplicationCommandType.User)

export default {
  type: "user",
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    const member = interaction.targetMember
    if (!member) {
      throw new DoraUserException("Found no target member for context menu")
    }

    return handleWhoIs({
      interaction,
      userId: member.user.id,
    })
  },
} satisfies Command
