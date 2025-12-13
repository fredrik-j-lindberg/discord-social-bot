import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"

import { actionWrapper } from "../actionWrapper"
import { DoraException } from "../exceptions/DoraException"
import { db } from "./client"
import { setMemberRoles } from "./memberRolesService"
import {
  type MemberDataRecord,
  type MemberDataRecordInsert,
  type MemberDataRecordPostCoreValues,
  type MemberRoleRecord,
  memberRolesTable,
  membersTable,
} from "./schema"

/** Can be used for logging purposes etc */
const composeMemberMetaData = (memberData: Partial<MemberData>) => ({
  userId: memberData.userId,
  guildId: memberData.guildId,
  displayName: memberData.displayName,
})

type MemberRecordSelectWithExtras = MemberDataRecord & {
  /** Computed on select based on "birthday" column */
  nextBirthday: Date | null
  /** Computed on select based on "birthday" column */
  age: number | null
}
type MemberRecordSelectWithRelations = MemberRecordSelectWithExtras & {
  /** Member roles from the roles table */
  roles: MemberRoleRecord[]
}

export type MemberDataDbKeysWithExtras = keyof MemberRecordSelectWithExtras

const getMemberFilter = (userId: string, guildId: string) => [
  eq(membersTable.userId, userId),
  eq(membersTable.guildId, guildId),
]
const getRoleFilter = (roleIds?: string[]) => [
  roleIds
    ? inArray(
        membersTable.id,
        db
          .select({ id: memberRolesTable.memberId })
          .from(memberRolesTable)
          .where(inArray(memberRolesTable.roleId, roleIds)),
      )
    : undefined,
]
// Function to calculate the next birthday SQL expression
const getComputedNextBirthday = () => {
  return sql`
  CASE 
    -- Check if birthday is NULL or not
    WHEN ${membersTable.birthday} IS NULL THEN NULL -- Return NULL if the birthday is not set

    -- Check if the member's birthday has occurred this year or is today
    WHEN (EXTRACT(MONTH FROM ${membersTable.birthday}), EXTRACT(DAY FROM ${membersTable.birthday})) >= 
         (EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(DAY FROM CURRENT_DATE))
    THEN
        -- Calculate the next birthday for this year
        DATE_TRUNC('year', CURRENT_DATE) + 
        ((EXTRACT(MONTH FROM ${membersTable.birthday}) - 1) * INTERVAL '1 month') + 
        (EXTRACT(DAY FROM ${membersTable.birthday}) - 1) * INTERVAL '1 day'
    ELSE
        -- Calculate the next birthday for next year
        DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + 
        ((EXTRACT(MONTH FROM ${membersTable.birthday}) - 1) * INTERVAL '1 month') + 
        (EXTRACT(DAY FROM ${membersTable.birthday}) - 1) * INTERVAL '1 day'
  END`
    .mapWith(membersTable.birthday)
    .as("nextBirthday")
}

/** Shared extras for computed birthday-related fields */
export const getComputedAge = () =>
  sql`CASE
    WHEN ${membersTable.birthday} IS NULL THEN NULL
    ELSE EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM ${membersTable.birthday})
      - CASE
          WHEN (EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(DAY FROM CURRENT_DATE)) < (EXTRACT(MONTH FROM ${membersTable.birthday}), EXTRACT(DAY FROM ${membersTable.birthday}))
          THEN 1
          ELSE 0
        END
  END`
    .mapWith(Number)
    .as("age")

const getSharedExtras = () => ({
  nextBirthday: getComputedNextBirthday(),
  age: getComputedAge(),
})

export type MemberData = Omit<MemberRecordSelectWithRelations, "roles"> & {
  roleIds: string[]
}

const mapSelectedMemberData = ({
  roles,
  ...memberData
}: MemberRecordSelectWithRelations): MemberData => ({
  ...memberData,
  nextBirthday: memberData.nextBirthday && new Date(memberData.nextBirthday), // This seems to be a bug in drizzle where the query + extra syntax returns it as string instead of date
  roleIds: roles.map((role) => role.roleId),
})

export const getMemberData = async ({
  userId,
  guildId,
}: {
  userId: string
  guildId: string
}): Promise<MemberData | undefined> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(...getMemberFilter(userId, guildId)),
      with: { roles: true },
    })

  if (memberRecords.length > 1) {
    throw new DoraException(
      "Multiple users found with the same id and guild",
      DoraException.Type.Unknown,
      { metadata: composeMemberMetaData({ userId, guildId }) },
    )
  }
  const memberRecord = memberRecords[0]
  if (!memberRecord) return
  return mapSelectedMemberData(memberRecord)
}

/** Creates member or updates member with all the data sent */
export const setMemberData = async ({
  memberData: { roleIds, ...memberData },
}: {
  memberData: MemberDataRecordInsert & { roleIds?: string[] }
}): Promise<void> => {
  await actionWrapper({
    actionDescription: "Set member data",
    meta: composeMemberMetaData(memberData),
    action: async () => {
      await db.transaction(async (transaction) => {
        const insertedRecords = await transaction
          .insert(membersTable)
          .values(memberData)
          .onConflictDoUpdate({
            target: [membersTable.userId, membersTable.guildId],
            set: memberData,
          })
          .returning()

        if (insertedRecords.length > 1) {
          throw new DoraException(
            "Multiple members inserted or updated, expected to only be one. Rolling back transaction",
          )
        }

        const insertedMember = insertedRecords[0]
        if (!insertedMember) {
          throw new DoraException(
            "Failed to insert or update member data. Rolling back transaction",
          )
        }

        if (roleIds) {
          await setMemberRoles({
            memberId: insertedMember.id,
            roleIds,
            transaction,
          })
        }
      })
    },
  })
}

/** Adds a message to the member activity stats */
export const addMemberMessageToStats = async ({
  coreMemberData,
  messageTimestamp,
}: {
  coreMemberData: MemberDataRecordPostCoreValues
  messageTimestamp: Date
}): Promise<MemberDataRecord> => {
  const insertData: MemberDataRecordInsert = {
    ...coreMemberData,
    messageCount: 1,
    latestMessageAt: messageTimestamp,
    latestActivityAt: messageTimestamp,
    inactiveSince: null,
  }
  return await actionWrapper({
    actionDescription: "Update member message stats",
    meta: composeMemberMetaData(coreMemberData),
    action: async () => {
      return await db.transaction(async (transaction) => {
        const updatedRecords = await transaction
          .insert(membersTable)
          .values(insertData)
          .onConflictDoUpdate({
            target: [membersTable.userId, membersTable.guildId],
            set: {
              ...insertData,
              messageCount: sql`${membersTable.messageCount} + 1`,
            },
          })
          .returning()

        if (updatedRecords.length > 1) {
          throw new DoraException(
            "Multiple members updated, expected to only be one. Rolling back transaction",
          )
        }

        const updatedMember = updatedRecords[0]
        if (!updatedMember) {
          throw new DoraException(
            "Failed to update member data. Rolling back transaction",
          )
        }

        return updatedMember
      })
    },
  })
}

/** Adds a reaction to the member activity stats */
export const addMemberReactionToStats = async ({
  coreMemberData,
  reactionTimestamp,
}: {
  coreMemberData: MemberDataRecordPostCoreValues
  reactionTimestamp: Date
}): Promise<MemberDataRecord> => {
  const insertData: MemberDataRecordInsert = {
    ...coreMemberData,
    reactionCount: 1,
    latestReactionAt: reactionTimestamp,
    latestActivityAt: reactionTimestamp,
    inactiveSince: null,
  }
  return await actionWrapper({
    actionDescription: "Add member reaction to stats",
    meta: composeMemberMetaData(coreMemberData),
    action: async () => {
      return await db.transaction(async (transaction) => {
        const updatedRecords = await transaction
          .insert(membersTable)
          .values(insertData)
          .onConflictDoUpdate({
            target: [membersTable.userId, membersTable.guildId],
            set: {
              ...insertData,
              reactionCount: sql`${membersTable.reactionCount} + 1`,
            },
          })
          .returning()

        if (updatedRecords.length > 1) {
          throw new DoraException(
            "Multiple members updated, expected to only be one. Rolling back transaction",
          )
        }

        const updatedMember = updatedRecords[0]
        if (!updatedMember) {
          throw new DoraException(
            "Failed to update member data. Rolling back transaction",
          )
        }

        return updatedMember
      })
    },
  })
}

/** Removes a reaction from the member activity stats */
export const removeMemberReactionFromStats = async ({
  coreMemberData,
}: {
  coreMemberData: MemberDataRecordPostCoreValues
}): Promise<void> => {
  const insertData = {
    ...coreMemberData,
    reactionCount: 0,
  }
  await actionWrapper({
    actionDescription: "Remove member reaction from stats",
    meta: composeMemberMetaData(coreMemberData),
    action: async () => {
      await db
        .insert(membersTable)
        .values(insertData)
        .onConflictDoUpdate({
          target: [membersTable.userId, membersTable.guildId],
          set: {
            ...insertData,
            reactionCount: sql`${membersTable.reactionCount} - 1`,
          },
        })
    },
  })
}

export const getMembersWithBirthdayTodayForAllGuilds = async (): Promise<
  MemberData[]
> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        isNotNull(membersTable.birthday),
        sql`EXTRACT(MONTH FROM ${membersTable.birthday}) = EXTRACT(MONTH FROM CURRENT_DATE) AND 
            EXTRACT(DAY FROM ${membersTable.birthday}) = EXTRACT(DAY FROM CURRENT_DATE)`,
      ),
      with: { roles: true },
    })

  return memberRecords.map(mapSelectedMemberData)
}

// TODO: When drizzle supports virtual generated columns we can move nextBirthday and age to that setup,
// and not have to have unique handling here
// https://github.com/drizzle-team/drizzle-orm/issues/4074
const getFieldOrderBy = (field: MemberDataDbKeysWithExtras) => {
  if (field === "nextBirthday") return sql`"nextBirthday"`
  if (field === "age") return sql`"age"`
  return membersTable[field]
}
// See above TODO
const getRelatedMemberDataField = (field: MemberDataDbKeysWithExtras) => {
  if (field === "nextBirthday") return membersTable.birthday
  if (field === "age") return membersTable.birthday
  return membersTable[field]
}

/** Get members that has a specific member data field */
export const getMembersWithField = async ({
  guildId,
  field,
  roleIds,
}: {
  guildId: string
  field: Exclude<MemberDataDbKeysWithExtras, "roles">
  /** Pass if it should filter based on these roleIds */
  roleIds?: string[]
}): Promise<MemberData[]> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.guildId, guildId),
        isNotNull(getRelatedMemberDataField(field)),
        ...getRoleFilter(roleIds),
      ),
      orderBy: getFieldOrderBy(field),
      with: { roles: true },
      limit: 50,
    })

  return memberRecords.map(mapSelectedMemberData)
}

/**
 * Gets member data for all members in the guild
 */
export const getAllGuildMemberData = async (
  guildId: string,
): Promise<MemberData[]> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: eq(membersTable.guildId, guildId),
      orderBy: membersTable.latestActivityAt,
      with: { roles: true },
    })

  return memberRecords.map(mapSelectedMemberData)
}
