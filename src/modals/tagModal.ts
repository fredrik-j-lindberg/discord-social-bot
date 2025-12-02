import { ModalBuilder, TextInputStyle } from "discord.js"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { createTags } from "~/lib/database/tagService"
import {
  composeSelectMenu,
  composeTextInput,
  type ModalInputConfig,
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

const modalInputsMap = {
  tagType: {
    type: "select" as const,
    id: "tagType",
    label: "Tag Type",
    isRequired: true,
    getOptions: () => tagTypeOptions,
  },
  tagName: {
    type: "text" as const,
    id: "tagName",
    label: "Tag name",
    style: TextInputStyle.Short,
    isRequired: true,
  },
  tagDescription: {
    type: "text" as const,
    id: "tagDescription",
    label: "Tag description",
    style: TextInputStyle.Paragraph,
    isRequired: false,
  },
} as const satisfies Record<string, ModalInputConfig>

export default {
  data: { name: "tagModal" },
  async createModal() {
    const modal = new ModalBuilder()
      .setCustomId(this.data.name)
      .setTitle("Add a tag")

    const tagTypeLabel = await composeSelectMenu(modalInputsMap.tagType)
    if (tagTypeLabel) modal.addLabelComponents(tagTypeLabel)

    const tagNameLabel = composeTextInput(modalInputsMap.tagName)
    modal.addLabelComponents(tagNameLabel)

    const tagDescriptionLabel = composeTextInput(modalInputsMap.tagDescription)
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
      modalInputsMap.tagType.id,
    )[0]

    if (!tagType) {
      throw new Error("Tag type is required")
    }
    const tagName = interaction.fields
      .getTextInputValue(modalInputsMap.tagName.id)
      .trim()
      .toLowerCase()
    const tagDescription =
      interaction.fields
        .getTextInputValue(modalInputsMap.tagDescription.id)
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
