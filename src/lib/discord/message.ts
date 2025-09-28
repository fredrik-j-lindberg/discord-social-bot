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
