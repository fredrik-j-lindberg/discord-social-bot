import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
} from "discord.js"

import { DoraException } from "../exceptions/DoraException"
import { logger } from "../logger"
import type { ExecuteSupportedInteraction } from "./interaction"

const getEmbedButtons = ({
  currentPage,
  totalPages,
  disableButtons,
}: {
  currentPage: number
  totalPages: number
  disableButtons?: boolean
}) => {
  const row = new ActionRowBuilder<ButtonBuilder>()

  const onFirstPage = currentPage === 0
  row.addComponents(
    new ButtonBuilder()
      .setCustomId("first_page")
      .setLabel("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onFirstPage),
  )
  row.addComponents(
    new ButtonBuilder()
      .setCustomId("prev_page")
      .setLabel("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onFirstPage),
  )

  row.addComponents(
    new ButtonBuilder()
      .setCustomId("page_info")
      .setLabel(`${currentPage + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  )

  const onLastPage = currentPage === totalPages - 1
  row.addComponents(
    new ButtonBuilder()
      .setCustomId("next_page")
      .setLabel("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onLastPage),
  )
  row.addComponents(
    new ButtonBuilder()
      .setCustomId("last_page")
      .setLabel("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onLastPage),
  )

  return row
}

const composePage = ({
  pagesEmbeds,
  currentPage,
  totalPages,
  noLongerInteractive = false,
}: {
  pagesEmbeds: EmbedBuilder[]
  currentPage: number
  totalPages: number
  noLongerInteractive?: boolean
}) => {
  const embed = pagesEmbeds[currentPage]
  if (!embed) {
    throw new DoraException("No embed found for the current page.")
  }

  if (noLongerInteractive) {
    const existingFooter = embed.toJSON().footer?.text ?? ""
    embed.setFooter({
      text: `${existingFooter ? `${existingFooter}\n` : ""}This embed is no longer interactive.`,
    })
  }

  return {
    embeds: [embed],
    components: [
      getEmbedButtons({
        currentPage,
        totalPages,
        disableButtons: noLongerInteractive,
      }),
    ],
  }
}

const handleButtonInteraction = async ({
  buttonInteraction,
  interactionUserId,
  currentPage,
  totalPages,
  pagesEmbeds,
}: {
  buttonInteraction: ButtonInteraction
  interactionUserId: string
  currentPage: number
  totalPages: number
  pagesEmbeds: EmbedBuilder[]
}) => {
  if (buttonInteraction.user.id !== interactionUserId) {
    await buttonInteraction.reply({
      content:
        "Only the user who triggered this message can use these buttons.",
      ephemeral: true,
    })
    return currentPage
  }

  await buttonInteraction.deferUpdate()

  switch (buttonInteraction.customId) {
    case "first_page":
      currentPage = 0
      break
    case "next_page":
      currentPage++
      break
    case "prev_page":
      currentPage--
      break
    case "last_page":
      currentPage = totalPages - 1
      break
    default:
      break
  }

  const newPageEmbed = pagesEmbeds[currentPage]
  if (!newPageEmbed) {
    throw new DoraException("No embed found for the current page.")
  }

  await buttonInteraction.editReply({
    embeds: [newPageEmbed],
    components: [getEmbedButtons({ currentPage, totalPages })],
  })

  return currentPage
}

export const paginate = async (
  interaction: ExecuteSupportedInteraction,
  pagesEmbeds: EmbedBuilder[],
  time = 60_000,
) => {
  if (pagesEmbeds.length === 0) {
    throw new DoraException("No pages to display for pagination.")
  }
  if (pagesEmbeds.length === 1) {
    const embed = pagesEmbeds[0]
    if (!embed) {
      throw new DoraException("No embed found for the only page.")
    }
    await interaction.editReply({ embeds: [embed] })
    return
  }

  const totalPages = pagesEmbeds.length
  let currentPage = 0

  const initialPage = composePage({ pagesEmbeds, currentPage, totalPages })
  const response = await interaction.editReply(initialPage)

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time,
  })

  // Listen for interactions with the buttons
  collector.on("collect", (buttonInteraction: ButtonInteraction) => {
    void handleButtonInteraction({
      buttonInteraction,
      currentPage,
      interactionUserId: interaction.user.id,
      pagesEmbeds,
      totalPages,
    })
      .then((newPage) => {
        currentPage = newPage
      })
      .catch((err: unknown) => {
        logger.error({ err }, "Error handling button interaction.")
      })
  })

  collector.on("end", () => {
    const finalStatePage = composePage({
      pagesEmbeds,
      currentPage,
      totalPages,
      noLongerInteractive: true, // Disable buttons to avoid user confusion when they stop working
    })
    void response.edit(finalStatePage).catch((err: unknown) => {
      logger.error({ err }, "Failed to edit message after collector ended.")
    })
  })
}
