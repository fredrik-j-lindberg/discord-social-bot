import { and, count, desc, eq, max } from "drizzle-orm"

import { db } from "./client"
import {
  itemTagsTable,
  type TagRecord,
  type TagRecordInsert,
  tagsTable,
} from "./schema"

interface CreateTagProps {
  tags: TagRecordInsert[]
}

/** Helper for creating tag(s) */
export const createTags = async ({ tags }: CreateTagProps): Promise<void> => {
  if (!tags.length) {
    return
  }

  await db.insert(tagsTable).values(tags)
}

export interface Tag {
  id: TagRecord["id"]
  guildId: TagRecord["guildId"]
  name: TagRecord["name"]
  type: TagRecord["type"]
  description: TagRecord["description"]
}

/** Helper for fetching all tags for a guild, optionally filtered by type */
export const getTags = async ({
  guildId,
  type,
}: {
  guildId: string
  type?: string
}): Promise<Tag[]> => {
  return await db
    .select({
      id: tagsTable.id,
      guildId: tagsTable.guildId,
      name: tagsTable.name,
      type: tagsTable.type,
      description: tagsTable.description,
      count: count(itemTagsTable.id),
      latestUse: max(itemTagsTable.recordCreatedAt),
    })
    .from(tagsTable)
    .leftJoin(itemTagsTable, eq(itemTagsTable.tagId, tagsTable.id))
    .groupBy(
      tagsTable.id,
      tagsTable.guildId,
      tagsTable.name,
      tagsTable.type,
      tagsTable.description,
    )
    .where(
      and(
        eq(tagsTable.guildId, guildId),
        type ? eq(tagsTable.type, type) : undefined,
      ),
    )
    .orderBy(({ latestUse }) => desc(latestUse))
}
