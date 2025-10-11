/** Converts a role id into a Discord's native mention */
export const createRoleMention = (roleId: string) => `<@&${roleId}>`

/** Converts a role id into a Discord's native mention */
export const createEmojiMention = (
  emojiName?: string | null,
  emojiId?: string | null,
) => (emojiId ? `<:${emojiName ?? ""}:${emojiId}>` : emojiName)

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
export const createCopyableText = (text?: string | null) => {
  if (!text) return
  return `\`${text}\``
}

export interface ExtractedEmoji {
  name: string
  id: string | null
}

/** Extract emojis from a string */
export const extractEmojisFromMessage = (
  text?: string | null,
): ExtractedEmoji[] => {
  if (!text) return []

  const emojiRegex =
    /(?:(?<!\\)<:([^:]+):(\d+)>)|(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gmu

  const matches = [...text.matchAll(emojiRegex)].map((match) => {
    const customEmojiName = match[1]
    const customEmojiId = match[2]

    if (customEmojiName && customEmojiId) {
      return { name: customEmojiName, id: customEmojiId }
    }

    const standardEmojiName = match[3]
    if (standardEmojiName) {
      return { name: standardEmojiName, id: null }
    }

    return null
  })

  return matches.filter((match): match is ExtractedEmoji => match !== null)
}
