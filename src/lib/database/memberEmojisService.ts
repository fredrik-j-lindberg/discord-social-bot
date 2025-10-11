import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "./client"
import {
  type MemberEmojiRecord,
  type MemberEmojiRecordInsert,
  memberEmojisTable,
} from "./schema"

export interface EmojiCount {
  emojiId?: string | null
  emojiName?: string
  count: number
  context: MemberEmojiRecord["context"]
}

/** Helper for creating user emoji records */
export const addMemberEmojiUsage = async ({
  values,
}: {
  values: MemberEmojiRecordInsert
}): Promise<MemberEmojiRecord[]> => {
  return await db.insert(memberEmojisTable).values(values).returning()
}

/**
 * Gets counts of emojis by name for a specific member
 */
export const getMemberEmojiCounts = async (
  memberId: string,
  context: MemberEmojiRecord["context"],
): Promise<EmojiCount[]> => {
  return db
    .select({
      emojiId: memberEmojisTable.emojiId,
      emojiName: memberEmojisTable.emojiName,
      count: count(),
      context: memberEmojisTable.context,
    })
    .from(memberEmojisTable)
    .where(
      and(
        eq(memberEmojisTable.memberId, memberId),
        eq(memberEmojisTable.context, context),
      ),
    )
    .groupBy((table) => [table.emojiName, table.emojiId, table.context])
    .orderBy(desc(sql`count`))
}

/**
 * Gets the count of emojis (regardless of context)
 */
export const getEmojiCounts = async (
  /** The emojis you want the count for */
  emojis: { name: string; id: string }[],
): Promise<
  (Omit<EmojiCount, "context" | "emojiName"> & { emojiName: string | null })[]
> => {
  if (emojis.length === 0) {
    return []
  }

  const emojiRecords = await db
    .select({
      emojiId: memberEmojisTable.emojiId,
      emojiName: memberEmojisTable.emojiName,
      count: count(),
    })
    .from(memberEmojisTable)
    .where(
      inArray(
        memberEmojisTable.emojiId,
        emojis.map((emoji) => emoji.id),
      ),
    )
    .groupBy((table) => [table.emojiId, table.emojiName])
    .orderBy(asc(sql`count`))
    .limit(100)

  const map = new Map(emojiRecords.map((record) => [record.emojiId, record]))
  return emojis
    .map((emoji) => ({
      emojiId: emoji.id,
      emojiName: emoji.name,
      count: map.get(emoji.id)?.count ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
}
