import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { createTags } from "~/lib/database/tagService"
import { composeSelectMenu, type SelectMenuOption } from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

const inputIds = {
  tagType: "tagType",
  tagName: "tagName",
  tagDescription: "tagDescription",
}

const tagTypeOptions: SelectMenuOption[] = [
  { value: "media", name: "Media", description: "Media files" },
] as const

export default {
  data: { name: "tagModal" },
  createModal() {
    const modal = new ModalBuilder()
      .setCustomId(this.data.name)
      .setTitle("Add a tag")
    const modalComponents = []

    const tagTypeLabel = composeSelectMenu({
      customId: inputIds.tagType,
      label: "Select tag type",
      // 100 chars max
      description:
        'Choose the context for your tag. E.g. "Media" tags can be used for photos.',
      options: tagTypeOptions,
      isRequired: true,
    })
    if (tagTypeLabel) modalComponents.push(tagTypeLabel)

    const tagNameLabel = new LabelBuilder()
      .setLabel("Tag name")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(inputIds.tagName)
          .setStyle(TextInputStyle.Short),
      )
    modalComponents.push(tagNameLabel)

    const tagDescriptionLabel = new LabelBuilder()
      .setLabel("Tag description")
      .setTextInputComponent(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setCustomId(inputIds.tagDescription),
      )
    modalComponents.push(tagDescriptionLabel)

    modal.addLabelComponents(...modalComponents)
    return modal
  },
  deferReply: true,
  handleSubmit: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    )

    const tagType = interaction.fields.getStringSelectValues(
      inputIds.tagType,
    )[0]

    if (!tagType) {
      throw new Error("Tag type is required")
    }
    const tagName = interaction.fields
      .getTextInputValue(inputIds.tagName)
      .trim()
      .toLowerCase()
    const tagDescription =
      interaction.fields.getTextInputValue(inputIds.tagDescription).trim() ||
      null

    await createTags({
      tags: [
        {
          guildId: interaction.guild.id,
          name: tagName,
          type: tagType,
          description: tagDescription,
        },
      ],
    })
    return `Successfully created \`${tagName}\` as a \`${tagType}\` tag`
  },
} satisfies ModalData
