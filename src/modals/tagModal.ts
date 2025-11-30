import { ModalBuilder, TextInputStyle } from "discord.js"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { createTags } from "~/lib/database/tagService"
import {
  composeSelectMenu,
  composeTextInput,
  type ModalFieldConfig,
  type SelectMenuOption,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

const tagTypeOptions: SelectMenuOption[] = [
  {
    value: "media",
    name: "Media",
    description: "Media files",
    isDefault: true,
  },
] as const

const modalFields = {
  tagType: {
    fieldType: "select" as const,
    fieldName: "tagType",
    label: "Tag Type",
    isRequired: true,
    getOptions: () => tagTypeOptions,
  },
  tagName: {
    fieldType: "text" as const,
    fieldName: "tagName",
    label: "Tag name",
    style: TextInputStyle.Short,
    isRequired: true,
  },
  tagDescription: {
    fieldType: "text" as const,
    fieldName: "tagDescription",
    label: "Tag description",
    style: TextInputStyle.Paragraph,
    isRequired: false,
  },
} as const satisfies Record<string, ModalFieldConfig>

export default {
  data: { name: "tagModal" },
  async createModal() {
    const modal = new ModalBuilder()
      .setCustomId(this.data.name)
      .setTitle("Add a tag")

    const tagTypeLabel = await composeSelectMenu(modalFields.tagType)
    if (tagTypeLabel) modal.addLabelComponents(tagTypeLabel)

    const tagNameLabel = composeTextInput(modalFields.tagName)
    modal.addLabelComponents(tagNameLabel)

    const tagDescriptionLabel = composeTextInput(modalFields.tagDescription)
    modal.addLabelComponents(tagDescriptionLabel)

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
      modalFields.tagType.fieldName,
    )[0]

    if (!tagType) {
      throw new Error("Tag type is required")
    }
    const tagName = interaction.fields
      .getTextInputValue(modalFields.tagName.fieldName)
      .trim()
      .toLowerCase()
    const tagDescription =
      interaction.fields
        .getTextInputValue(modalFields.tagDescription.fieldName)
        .trim() || null

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
