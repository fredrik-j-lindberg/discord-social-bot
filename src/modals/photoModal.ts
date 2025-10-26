import {
  ContainerBuilder,
  MediaGalleryBuilder,
  TextDisplayBuilder,
} from "discord.js"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { createUserMention } from "~/lib/discord/message"
import { createFileUploadModal } from "~/lib/helpers/modals"
import { uploadMultipleAttachmentsToR2 } from "~/lib/r2/uploadService"
import { assertHasDefinedProperty } from "~/lib/validation"

const fileUploadComponentId = "fileUpload"

export default {
  data: { name: "photoUploadModal" },
  createModal() {
    return createFileUploadModal({
      modalId: this.data.name,
      title: "Photo Upload",
      fileUploadCustomId: fileUploadComponentId,
    })
  },
  deferReply: true,
  handleSubmit: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    )
    const uploadedFiles = interaction.fields.getUploadedFiles(
      fileUploadComponentId,
    )
    if (!uploadedFiles || uploadedFiles.size === 0) {
      return "No files were uploaded. Please try again."
    }

    const uploadResults = await uploadMultipleAttachmentsToR2(
      Array.from(uploadedFiles.values()),
      { prefix: interaction.guild.id },
    )

    return new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Photo(s) uploaded by ${createUserMention(interaction.user.id)}!`,
        ),
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          uploadResults.map((result) => {
            return {
              media: {
                url: result.url,
              },
            }
          }),
        ),
      )
  },
} satisfies ModalData
