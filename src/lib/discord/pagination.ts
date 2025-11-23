import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  type InteractionReplyOptions,
  MessageFlags,
  TextDisplayBuilder,
} from "discord.js"

import { DoraException } from "../exceptions/DoraException"
import { logger } from "../logger"
import type { ExecuteSupportedInteraction } from "./interaction"

const PaginationButtonCustomIds = {
  firstPage: "first_page",
  prevPage: "prev_page",
  pageInfo: "page_info",
  nextPage: "next_page",
  lastPage: "last_page",
}

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
      .setCustomId(PaginationButtonCustomIds.firstPage)
      .setLabel("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onFirstPage),
  )
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(PaginationButtonCustomIds.prevPage)
      .setLabel("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onFirstPage),
  )

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(PaginationButtonCustomIds.pageInfo)
      .setLabel(`${currentPage + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  )

  const onLastPage = currentPage === totalPages - 1
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(PaginationButtonCustomIds.nextPage)
      .setLabel("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onLastPage),
  )
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(PaginationButtonCustomIds.lastPage)
      .setLabel("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableButtons || onLastPage),
  )

  return row
}

const composePage = ({
  pageContainers,
  currentPage,
  totalPages,
  noLongerInteractive = false,
}: {
  pageContainers: ContainerBuilder[]
  currentPage: number
  totalPages: number
  noLongerInteractive?: boolean
}): InteractionReplyOptions & { flags: MessageFlags.IsComponentsV2 } => {
  const container = pageContainers[currentPage]
  if (!container) {
    throw new DoraException("No embed found for the current page.")
  }

  if (noLongerInteractive) {
    const nonInteractiveComponent = new TextDisplayBuilder().setContent(
      "_This embed is no longer interactive_",
    )
    container.addTextDisplayComponents(nonInteractiveComponent)
  }

  if (totalPages <= 1) {
    return {
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    }
  }

  return {
    components: [
      container,
      getEmbedButtons({
        currentPage,
        totalPages,
        disableButtons: noLongerInteractive,
      }),
    ],
    flags: MessageFlags.IsComponentsV2,
  }
}

const handleButtonInteraction = async ({
  buttonInteraction,
  interactionUserId,
  currentPage,
  totalPages,
  pageContainers,
}: {
  buttonInteraction: ButtonInteraction
  interactionUserId: string
  currentPage: number
  totalPages: number
  pageContainers: ContainerBuilder[]
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
    case PaginationButtonCustomIds.firstPage:
      currentPage = 0
      break
    case PaginationButtonCustomIds.nextPage:
      currentPage++
      break
    case PaginationButtonCustomIds.prevPage:
      currentPage--
      break
    case PaginationButtonCustomIds.lastPage:
      currentPage = totalPages - 1
      break
    default:
      break
  }

  const newPageContainer = pageContainers[currentPage]
  if (!newPageContainer) {
    throw new DoraException("No embed found for the current page.")
  }

  const newPage = composePage({
    pageContainers,
    currentPage,
    totalPages,
  })
  await buttonInteraction.editReply(newPage)

  return currentPage
}

export const paginate = async (
  interaction: ExecuteSupportedInteraction,
  pageContainers: ContainerBuilder[],
  time = 60_000,
) => {
  if (pageContainers.length === 0) {
    throw new DoraException("No pages to display for pagination.")
  }
  if (pageContainers.length === 1) {
    const container = pageContainers[0]
    if (!container) {
      throw new DoraException("No embed found for the only page.")
    }
  }

  const totalPages = pageContainers.length
  let currentPage = 0

  const initialPage = composePage({ pageContainers, currentPage, totalPages })
  const response = await interaction.editReply(initialPage)
  if (totalPages <= 1) {
    return // No need for pagination handling since we have only one page
  }

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
      pageContainers,
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
      pageContainers,
      currentPage,
      totalPages,
      noLongerInteractive: true, // Disable buttons to avoid user confusion when they stop working
    })
    void response.edit(finalStatePage).catch((err: unknown) => {
      logger.error({ err }, "Failed to edit message after collector ended.")
    })
  })
}
