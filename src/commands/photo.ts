import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getMemberFiles } from "~/lib/database/memberFileService"
import { getTags } from "~/lib/database/tagService"
import { createMediaGalleryContainer } from "~/lib/discord/message"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { assertHasDefinedProperty } from "~/lib/validation"
import photoModal from "~/modals/photoModal"

const uploadChoiceOptionName = "upload"
const viewChoiceOptionName = "view"
const tagOptionName = "tag"
const command = new SlashCommandBuilder()
  .setName("photo")
  .setDescription("Adds a photo to the channel")
  .setContexts(0) // Guild only
  .addSubcommand((subcommand) =>
    subcommand.setName(uploadChoiceOptionName).setDescription("Upload a photo"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(viewChoiceOptionName)
      .setDescription("View uploaded photos")
      .addStringOption((option) =>
        option
          .setName(tagOptionName)
          .setDescription("Optional tag to filter the photos with")
          .setAutocomplete(true)
          .setRequired(false),
      ),
  )

export default {
  type: "chat",
  deferReply: false, // Since one of the subcommands is showing a modal, we unfortunately cannot defer on a command-wide basis. Each subcommand must handle deferring individually if needed.
  command,
  data: { name: command.name },
  autocomplete: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command autocomplete issued without associated guild",
    )
    const tags = await getTags({
      guildId: interaction.guild.id,
      type: "media",
    })
    // Autocomplete for viewing photos will be handled elsewhere
    return tags.map((tag) => ({
      name: tag.name,
      value: tag.id,
    }))
  },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    if (interaction.options.getSubcommand() === viewChoiceOptionName) {
      await interaction.deferReply()
      const tagId = interaction.options.getString(tagOptionName) ?? undefined
      const photos = await getMemberFiles({
        guildId: interaction.guild.id,
        tagId,
      })

      // Unfortunately we cannot get the tag object that the user decided to filter on from the command itself,
      // so we instead grab it from the list of photos returned
      const filteredTagObject = tagId
        ? photos[0]?.tags.find((tag) => tag.id === tagId)
        : undefined

      return createMediaGalleryContainer({
        mediaItems: photos,
        header: `Uploaded photo(s)${filteredTagObject ? ` with tag \`${filteredTagObject.name}\`` : ""}`,
      })
    }

    if (interaction.options.getSubcommand() === uploadChoiceOptionName) {
      const modal = await photoModal.createModal({
        guildId: interaction.guild.id,
      })
      await interaction.showModal(modal)
      return undefined // Modal submission will handle response
    }

    throw new DoraUserException("Invalid subcommand")
  },
} satisfies Command
