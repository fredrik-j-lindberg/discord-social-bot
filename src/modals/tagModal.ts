import { ModalBuilder, TextInputStyle } from "discord.js"
import { z } from "zod"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { createTags } from "~/lib/database/tagService"
import {
  composeModalInputs,
  extractAndValidateModalValues,
  generateModalSchema,
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
    validation: z.string(),
    getOptions: () => tagTypeOptions,
  },
  tagName: {
    type: "text" as const,
    id: "tagName",
    label: "Tag name",
    style: TextInputStyle.Short,
    isRequired: true,
    validation: z.string().trim().toLowerCase(),
  },
  tagDescription: {
    type: "text" as const,
    id: "tagDescription",
    label: "Tag description",
    style: TextInputStyle.Paragraph,
    isRequired: false,
    validation: z.string().trim().nullable().optional(),
  },
} as const satisfies Record<string, ModalInputConfig>

const modalInputsConfig = Object.values(modalInputsMap)
const tagModalSchema = generateModalSchema(modalInputsMap)

export default {
  data: { name: "tagModal" },
  async createModal() {
    const modal = new ModalBuilder()
      .setCustomId(this.data.name)
      .setTitle("Add a tag")

    const composedInputs = await composeModalInputs(modalInputsConfig)
    modal.addLabelComponents(...composedInputs)

    return modal
  },
  deferReply: true,
  handleSubmit: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    )

    const validatedInput = extractAndValidateModalValues({
      interaction,
      inputConfigs: modalInputsConfig,
      validationSchema: tagModalSchema,
    })

    await createTags({
      tags: [
        {
          guildId: interaction.guild.id,
          name: validatedInput.tagName,
          type: validatedInput.tagType,
          description: validatedInput.tagDescription ?? null,
        },
      ],
    })
    return `Successfully created \`${validatedInput.tagName}\` as a \`${validatedInput.tagType}\` tag`
  },
} satisfies ModalData
