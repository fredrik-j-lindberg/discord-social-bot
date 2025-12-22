import { z } from "zod"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { storeFiles } from "~/lib/database/memberFileService"
import { getTags } from "~/lib/database/tagService"
import {
  createMediaGalleryContainer,
  createUserMention,
} from "~/lib/discord/message"
import { getDoraDatabaseMember } from "~/lib/helpers/member"
import {
  createDynamicModal,
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalInputConfig,
} from "~/lib/helpers/modals"
import { fileSchema, uploadMultipleFilesToR2 } from "~/lib/r2/uploadService"
import { assertHasDefinedProperty } from "~/lib/validation"

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const

const modalInputsMap = {
  tags: {
    type: "select",
    id: "tags",
    label: "Select tag(s)",
    isRequired: false,
    multiSelect: true,
    validation: z.array(z.string()).optional().nullable(),
    getOptions: async ({ guildId }) => {
      const tags = await getTags({ guildId, type: "media" })
      return tags.map((tag) => ({
        name: tag.name,
        value: tag.id,
        description: tag.description,
        isDefault: false,
      }))
    },
  },
  fileUpload: {
    type: "fileUpload",
    id: "fileUpload",
    label: "Upload file",
    isRequired: true,
    maxValues: 10,
    validation: z
      .array(
        z.object({
          ...fileSchema.shape,
          contentType: z.enum(ACCEPTED_MIME_TYPES),
        }),
      )
      .min(1, "At least one file must be uploaded")
      .max(10, "Maximum 10 files allowed"),
  },
} as const satisfies Record<
  string,
  ModalInputConfig<string, { guildId: string }>
>

const modalInputsConfig = Object.values(modalInputsMap)
const photoModalSchema = generateModalSchema(modalInputsMap)

export default {
  data: { name: "photoUploadModal" },
  async createModal({ guildId }: { guildId: string }) {
    return await createDynamicModal({
      customId: this.data.name,
      title: "Photo Upload",
      inputConfigs: modalInputsConfig,
      modalMetadata: { guildId },
    })
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
      validationSchema: photoModalSchema,
    })
    const uploadedFiles = validatedInput.fileUpload
    const selectedTagIds = validatedInput.tags ?? []

    const uploadResults = await uploadMultipleFilesToR2(uploadedFiles, {
      prefix: interaction.guild.id,
    })

    const memberData = await getDoraDatabaseMember({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      withEmojiCounts: false,
    })
    if (!memberData) {
      return `No member data found for user ${interaction.user.username}. Unable to store files.`
    }
    await storeFiles({
      memberId: memberData.databaseId,
      guildId: interaction.guild.id,
      files: uploadResults.map((result) => ({
        name: result.originalName,
        contentType: result.contentType,
        url: result.url,
        sizeInBytes: result.size,
        tagIds: selectedTagIds,
      })),
    })

    return createMediaGalleryContainer({
      mediaItems: uploadResults,
      header: `Photo(s) uploaded by ${createUserMention(interaction.user.id)}`,
    })
  },
} satisfies ModalData
