import {
  ContainerBuilder,
  MediaGalleryBuilder,
  TextDisplayBuilder,
} from "discord.js"

/** Converts a role id into a Discord's native mention */
export const createRoleMention = (roleId: string) => `<@&${roleId}>`

export const createUserMention = (userId: string) => `<@${userId}>`

/** Converts a role id into a Discord's native mention */
export const createEmojiMention = ({
  id,
  name,
  isAnimated,
}: Partial<MessageEmoji>) =>
  id ? `<${isAnimated ? "a" : ""}:${name ?? ""}:${id}>` : name

/** Converts a date or a timestamp into Discord's native timestamp string format */
export const createDiscordTimestamp = (
  timestampOrDate?: Date | number | null,
) => {
  const timestamp =
    timestampOrDate instanceof Date
      ? timestampOrDate.getTime()
      : timestampOrDate
  return timestamp ? `<t:${Math.round(timestamp / 1000)}:R>` : undefined
}

/**
 * Creates a single tick code block which is copyable from the ios app (clicking on it = copy).
 * This is very useful when displaying e.g. an embed where you want users to be able to copy one of the fields.
 */
export const createCopyableText = (text?: string | null | number) => {
  if (!text) return
  return `\`${text}\``
}

export interface MessageEmoji {
  name: string
  id: string | null
  isAnimated: boolean
}

/** Extract emojis from a string */
export const extractEmojisFromMessage = ({
  text,
  deduplicate = false,
}: {
  text?: string | null
  /** Whether to de-duplicate the emojis (only return unique emoji values) */
  deduplicate?: boolean
}): MessageEmoji[] => {
  if (!text) return []

  const emojiRegex =
    /(?:(?<!\\)<(a)?:([^:]+):(\d+)>)|((\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?)/gmu

  const matches = [...text.matchAll(emojiRegex)].map((match) => {
    const isAnimated = match[1] === "a"
    const customEmojiName = match[2]
    const customEmojiId = match[3]

    if (customEmojiName && customEmojiId) {
      return { name: customEmojiName, id: customEmojiId, isAnimated }
    }

    const standardEmojiName = match[4]
    if (standardEmojiName) {
      return { name: standardEmojiName, id: null, isAnimated: false }
    }

    return null
  })

  const messageEmojis = matches.filter(
    (match): match is MessageEmoji => match !== null,
  )

  if (!deduplicate) return messageEmojis

  return [
    ...new Map(messageEmojis.map((emoji) => [emoji.name, emoji])).values(),
  ]
}

export const createList = ({
  items,
  header,
  fallback = "No items found",
  mode = "compact",
  limit,
}: {
  items?: string[]
  header?: string
  fallback?: string
  mode?: "compact" | "long"
  limit?: number
}) => {
  if (!items?.length) return fallback

  const relevantItems = limit ? items.slice(0, limit) : items
  const itemsText =
    mode === "compact"
      ? relevantItems.join(", ")
      : relevantItems.map((item) => `- ${item}`).join("\n")

  if (!header) return itemsText
  return `*${header}*\n${itemsText}`
}

export const createPaginatedList = ({
  items,
  header,
  fallback = "No items found",
  itemsPerPage = 10,
  listType = "bullet",
}: {
  items?: string[]
  header: string
  fallback?: string
  limit?: number
  itemsPerPage?: number
  listType?: "bullet" | "number"
}): ContainerBuilder[] => {
  const headerTextComponent = new TextDisplayBuilder().setContent(
    `### ${header}`,
  )
  if (!items?.length) {
    const fallbackTextComponent = new TextDisplayBuilder().setContent(fallback)
    return [
      new ContainerBuilder().addTextDisplayComponents(
        headerTextComponent,
        fallbackTextComponent,
      ),
    ]
  }

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const pages: ContainerBuilder[] = []

  for (let i = 0; i < totalPages; i++) {
    const startIndex = i * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const itemChunk = items.slice(startIndex, endIndex)

    const description =
      listType === "number"
        ? itemChunk
            .map((item, index) => `${startIndex + index + 1}. ${item}`)
            .join("\n")
        : itemChunk.map((item) => `- ${item}`).join("\n")

    const descriptionTextComponent = new TextDisplayBuilder().setContent(
      description,
    )
    const container = new ContainerBuilder().addTextDisplayComponents(
      headerTextComponent,
      descriptionTextComponent,
    )

    pages.push(container)
  }

  return pages
}

export const createMediaGalleryContainer = ({
  mediaItems,
  header,
}: {
  mediaItems: { url: string }[]
  header: string
}): ContainerBuilder => {
  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(header),
  )

  if (mediaItems.length === 0) {
    return container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("No media items found"),
    )
  }

  // TODO: Add some pagination system for this
  const relevantMediaItems = mediaItems.slice(0, 10) // Discord's limit for media gallery is 10 items
  return container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      relevantMediaItems.map((item) => {
        return {
          media: {
            url: item.url,
          },
        }
      }),
    ),
  )
}
