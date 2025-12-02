import { ModalBuilder, ModalSubmitInteraction } from "discord.js"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { getMemberData } from "~/lib/database/memberDataService"
import { storeFiles } from "~/lib/database/memberFileService"
import { getTags } from "~/lib/database/tagService"
import {
  createMediaGalleryContainer,
  createUserMention,
} from "~/lib/discord/message"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { composeModalInputs, type ModalInputConfig } from "~/lib/helpers/modals"
import { uploadMultipleAttachmentsToR2 } from "~/lib/r2/uploadService"
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
]

const modalInputsMap = {
  tags: {
    type: "select",
    id: "tags",
    label: "Select tag(s)",
    isRequired: false,
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
    acceptedMimeTypes: ACCEPTED_MIME_TYPES,
  },
} as const satisfies Record<
  string,
  ModalInputConfig<string, { guildId: string }>
>

const modalInputsConfig = Object.values(modalInputsMap)

const getModalTagValues = (interaction: ModalSubmitInteraction): string[] => {
  try {
    return interaction.fields.getStringSelectValues(
      modalInputsMap.tags.id,
    ) as string[] // TODO: Look into handling this without the coercion
  } catch {
    return [] // Since this is optional, return empty array if it fails
  }
}

export default {
  data: { name: "photoUploadModal" },
  async createModal({ guildId }: { guildId: string }) {
    const modal = new ModalBuilder()
      .setCustomId(this.data.name)
      .setTitle("Photo Upload")

    const composedInputs = await composeModalInputs(modalInputsConfig, {
      guildId,
    })
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
    const uploadedFilesCollection = interaction.fields.getUploadedFiles(
      modalInputsMap.fileUpload.id,
    )
    if (!uploadedFilesCollection || uploadedFilesCollection.size === 0) {
      return "No files were uploaded. Please try again."
    }

    const uploadedFiles = Array.from(uploadedFilesCollection.values())
    uploadedFiles.forEach(({ name, contentType }) => {
      if (!contentType) {
        throw new DoraUserException(
          `Uploaded file '${name}' is missing content type`,
        )
      }
      if (!modalInputsMap.fileUpload.acceptedMimeTypes.includes(contentType)) {
        throw new DoraUserException(
          `Uploaded file '${name}' has unsupported content type '${contentType}'. Valid content types are ${modalInputsMap.fileUpload.acceptedMimeTypes.join(", ")}`,
        )
      }
    })

    const uploadResults = await uploadMultipleAttachmentsToR2(uploadedFiles, {
      prefix: interaction.guild.id,
    })

    const selectedTagIds = getModalTagValues(interaction)

    const memberData = await getMemberData({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    })
    if (!memberData) {
      return `No member data found for user ${interaction.user.username}. Unable to store files.`
    }
    await storeFiles({
      memberId: memberData.id,
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
