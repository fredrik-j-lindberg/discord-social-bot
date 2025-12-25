import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm"

import { actionWrapper } from "../actionWrapper"
import { DoraException } from "../exceptions/DoraException"
import type { DoraDatabaseMember } from "../helpers/doraMember"
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
/**
 * Returns a filter that excludes departed members unless explicitly included.
 */
const getStatusFilter = (includeDeparted?: boolean) => [
  includeDeparted
    ? undefined
    : inArray(membersTable.status, ["active", "inactive"]),
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

const mapMemberDataToDoraMember = ({
  roles,
  ...memberData
}: MemberRecordSelectWithRelations): DoraDatabaseMember => {
  const username = memberData.username
  const displayName = memberData.displayName || username

  const nextBirthday =
    memberData.nextBirthday && new Date(memberData.nextBirthday) // This seems to be a bug in drizzle where the query + extra syntax returns it as string instead of date
  const roleIds = roles
    .map((role) => role.roleId)
    .filter(
      (roleId) => roleId !== memberData.guildId, // Remove the irrelevant @everyone role
    )

  return {
    databaseId: memberData.id,
    userId: memberData.userId,
    username,
    displayName,
    guildId: memberData.guildId,
    roleIds,
    stats: {
      latestActivityAt: memberData.latestActivityAt,
      inactiveSince: memberData.inactiveSince,
      messageCount: memberData.messageCount,
      latestMessageAt: memberData.latestMessageAt,
      reactionCount: memberData.reactionCount,
      latestReactionAt: memberData.latestReactionAt,
    },
    personalInfo: {
      birthday: memberData.birthday,
      age: memberData.age,
      nextBirthday,
      firstName: memberData.firstName,
      phoneNumber: memberData.phoneNumber,
      email: memberData.email,
      dietaryPreferences: memberData.dietaryPreferences,
    },
    friendCodes: {
      switch: memberData.switchFriendCode,
      pokemonTcgp: memberData.pokemonTcgpFriendCode,
    },
    status: memberData.status,
  }
}

/**
 * This is a partial of the DoraDatabaseMember specifically for updating or inserting.
 * For example it excludes the databaseId since that is auto generated.
 *
 * It can also be used for upserting member data where not all fields are required.
 */
type DoraDatabaseMemberUpsert = Partial<
  Omit<DoraDatabaseMember, "databaseId">
> &
  Pick<DoraDatabaseMember, "guildId" | "userId" | "username" | "displayName">

/**
 * Maps a DoraDatabaseMember back into a MemberDataRecordInsert payload
 * including optional roleIds for convenience when calling setMemberData.
 */
export const mapDoraDatabaseMemberToMemberDataInsert = (
  doraMemberUpsert: DoraDatabaseMemberUpsert,
): MemberDataRecordInsert & { roleIds?: string[] } => {
  return {
    guildId: doraMemberUpsert.guildId,
    userId: doraMemberUpsert.userId,
    username: doraMemberUpsert.username,
    displayName: doraMemberUpsert.displayName,
    messageCount: doraMemberUpsert.stats?.messageCount,
    latestMessageAt: doraMemberUpsert.stats?.latestMessageAt,
    reactionCount: doraMemberUpsert.stats?.reactionCount,
    latestReactionAt: doraMemberUpsert.stats?.latestReactionAt,
    latestActivityAt: doraMemberUpsert.stats?.latestActivityAt,
    inactiveSince: doraMemberUpsert.stats?.inactiveSince,
    firstName: doraMemberUpsert.personalInfo?.firstName,
    birthday: doraMemberUpsert.personalInfo?.birthday,
    phoneNumber: doraMemberUpsert.personalInfo?.phoneNumber,
    email: doraMemberUpsert.personalInfo?.email,
    switchFriendCode: doraMemberUpsert.friendCodes?.switch,
    pokemonTcgpFriendCode: doraMemberUpsert.friendCodes?.pokemonTcgp,
    dietaryPreferences: doraMemberUpsert.personalInfo?.dietaryPreferences,
    roleIds: doraMemberUpsert.roleIds,
    status: doraMemberUpsert.status,
  }
}

export const getMemberData = async ({
  userId,
  guildId,
  includeDeparted,
}: {
  userId: string
  guildId: string
  /** Include members with status 'departed' if true, otherwise exclude */
  includeDeparted?: boolean
}): Promise<DoraDatabaseMember | undefined> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        ...getMemberFilter(userId, guildId),
        ...getStatusFilter(includeDeparted),
      ),
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
  return mapMemberDataToDoraMember(memberRecord)
}

/** Creates member or updates member with all the data sent */
export const setMemberData = async ({
  doraMember,
}: {
  doraMember: DoraDatabaseMemberUpsert
}): Promise<void> => {
  const { roleIds, ...memberData } =
    mapDoraDatabaseMemberToMemberDataInsert(doraMember)

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
    status: "active",
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
    status: "active",
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

export const getMembersWithBirthdayTodayForAllGuilds = async (
  includeDeparted?: boolean,
): Promise<DoraDatabaseMember[]> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        ...getStatusFilter(includeDeparted),
        isNotNull(membersTable.birthday),
        sql`EXTRACT(MONTH FROM ${membersTable.birthday}) = EXTRACT(MONTH FROM CURRENT_DATE) AND 
            EXTRACT(DAY FROM ${membersTable.birthday}) = EXTRACT(DAY FROM CURRENT_DATE)`,
      ),
      with: { roles: true },
    })

  return memberRecords.map(mapMemberDataToDoraMember)
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
  includeDeparted,
}: {
  guildId: string
  field: Exclude<MemberDataDbKeysWithExtras, "roles">
  /** Pass if it should filter based on these roleIds */
  roleIds?: string[]
  /** Include members with status 'departed' if true, otherwise exclude */
  includeDeparted?: boolean
}): Promise<DoraDatabaseMember[]> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.guildId, guildId),
        isNotNull(getRelatedMemberDataField(field)),
        ...getRoleFilter(roleIds),
        ...getStatusFilter(includeDeparted),
      ),
      orderBy: getFieldOrderBy(field),
      with: { roles: true },
      limit: 50,
    })

  return memberRecords.map(mapMemberDataToDoraMember)
}

/**
 * Gets member data for all members in the guild
 */
export const getAllGuildMemberData = async (
  guildId: string,
  includeDeparted = false,
): Promise<DoraDatabaseMember[]> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.guildId, guildId),
        ...getStatusFilter(includeDeparted),
      ),
      orderBy: membersTable.latestActivityAt,
      with: { roles: true },
    })

  return memberRecords.map(mapMemberDataToDoraMember)
}

/**
 * Gets members in a guild whose latest activity is older than or equal to the provided threshold
 * Also includes members with no recorded activity (NULL latestActivityAt)
 */
export const getInactiveGuildMemberData = async ({
  guildId,
  inactiveThresholdDate,
  includeDeparted,
}: {
  guildId: string
  inactiveThresholdDate: Date
  /** Include members with status 'departed' if true, otherwise exclude */
  includeDeparted?: boolean
}): Promise<DoraDatabaseMember[]> => {
  const memberRecords: MemberRecordSelectWithRelations[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.guildId, guildId),
        ...getStatusFilter(includeDeparted),
        or(
          isNull(membersTable.latestActivityAt),
          lte(membersTable.latestActivityAt, inactiveThresholdDate),
        ),
      ),
      orderBy: membersTable.latestActivityAt,
      with: { roles: true },
    })

  return memberRecords.map(mapMemberDataToDoraMember)
}
