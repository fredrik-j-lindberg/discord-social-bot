import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { createTags } from "~/lib/database/tagService"
import { assertHasDefinedProperty } from "~/lib/validation"

const command = new SlashCommandBuilder()
  .setName("addtag")
  .setDescription(
    "Adds a tag to the bot database that can be used for categorizing items such as photos",
  )

export default {
  type: "chat",
  deferReply: true,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )
    const tag = {
      guildId: interaction.guild.id,
      name: "exampleTag",
      type: "media",
      description: "An example tag",
    }
    await createTags({
      tags: [tag],
    })
    return `Tag ${tag.name} created successfully in guild`
  },
} satisfies Command
