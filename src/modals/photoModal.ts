import {
  ContainerBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextDisplayBuilder,
} from "discord.js"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { getMemberData } from "~/lib/database/memberDataService"
import { storeFiles } from "~/lib/database/memberFileService"
import { getTags } from "~/lib/database/tagService"
import { createUserMention } from "~/lib/discord/message"
import { composeSelectMenu } from "~/lib/helpers/modals"
import { uploadMultipleAttachmentsToR2 } from "~/lib/r2/uploadService"
import { assertHasDefinedProperty } from "~/lib/validation"

const tagSelectMenuId = "tag-select-menu-id"
const fileUploadComponentId = "fileUpload"

const getModalTagValues = (interaction: ModalSubmitInteraction): string[] => {
  try {
    return interaction.fields.getStringSelectValues(tagSelectMenuId) as string[] // TODO: Look into handling this without the coercion
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
    const modalComponents = []

    const tags = await getTags({ guildId, type: "media" })
    const tagMenuLabel = composeSelectMenu({
      customId: tagSelectMenuId,
      options: tags.map((tag) => ({
        name: tag.name,
        value: tag.id,
        description: tag.description,
      })),
    })
    if (tagMenuLabel) modalComponents.push(tagMenuLabel)

    const uploadFileLabel = new LabelBuilder().setLabel("Upload file")
    uploadFileLabel.setFileUploadComponent(
      new FileUploadBuilder()
        .setCustomId(fileUploadComponentId)
        .setRequired(true)
        .setMaxValues(10),
    )
    modalComponents.push(uploadFileLabel)

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
