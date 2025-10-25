import {
  ContainerBuilder,
  MediaGalleryBuilder,
  TextDisplayBuilder,
} from "discord.js"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { createFileUploadModal } from "~/lib/helpers/modals"
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
  handleSubmit: (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    )
    const displayName =
      interaction.member && "displayName" in interaction.member
        ? interaction.member.displayName
        : null

    const uploadedFiles = interaction.fields.getUploadedFiles(
      fileUploadComponentId,
    )
    if (!uploadedFiles || uploadedFiles.size === 0) {
      return "No files were uploaded. Please try again."
    }
    return new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Photo(s) uploaded by ${displayName}!`,
        ),
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          uploadedFiles.map((file) => {
            return {
              media: {
                url: file.url,
              },
            }
          }),
        ),
      )
  },
} satisfies ModalData
