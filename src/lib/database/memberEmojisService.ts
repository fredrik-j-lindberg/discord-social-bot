import { and, count, desc, eq, sql } from "drizzle-orm"

import { db } from "./client"
import {
  type MemberEmojiRecord,
  type MemberEmojiRecordInsert,
  memberEmojisTable,
} from "./schema"

export interface EmojiCount {
  emojiId?: string | null
  emojiName: string
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
 * Gets counts of reactions by name for a specific member
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
