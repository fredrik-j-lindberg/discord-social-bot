import { db } from "./client"
import {
  itemTagsTable,
  type MemberFileRecord,
  type MemberFileRecordInsert,
  memberFilesTable,
} from "./schema"

interface File {
  name: MemberFileRecordInsert["name"]
  contentType: MemberFileRecordInsert["contentType"]
  url: MemberFileRecordInsert["url"]
  sizeInBytes: MemberFileRecordInsert["sizeInBytes"]
  tagIds: string[]
}

interface StoreFileProps {
  memberId: MemberFileRecordInsert["memberId"]
  guildId: MemberFileRecordInsert["guildId"]
  files: File[]
}

/** Helper for creating member file records */
export const storeFiles = async ({
  memberId,
  guildId,
  files,
}: StoreFileProps): Promise<MemberFileRecord[]> => {
  if (!files.length) {
    return []
  }

  return await db.transaction(async (transaction) => {
    const fileRecords = await transaction
      .insert(memberFilesTable)
      .values(
        files.map((file) => ({
          memberId,
          guildId,
          name: file.name,
          contentType: file.contentType,
          url: file.url,
          sizeInBytes: file.sizeInBytes,
        })),
      )
      .returning()

    const tags = files.flatMap((file, fileIndex) => {
      const fileRecord = fileRecords[fileIndex]
      if (!fileRecord) {
        throw new Error("File record not found for item tags insertion")
      }

      return file.tagIds.map((tagId) => ({ itemId: fileRecord.id, tagId }))
    })

    if (!tags.length) {
      return fileRecords
    }
    await transaction.insert(itemTagsTable).values(tags)

    return fileRecords
  })
}
