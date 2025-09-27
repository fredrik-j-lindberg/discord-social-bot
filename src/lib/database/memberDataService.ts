import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"

import { actionWrapper } from "../actionWrapper"
import { DoraException } from "../exceptions/DoraException"
import { calculateAge } from "../helpers/date"
import { db } from "./client"
import {
  type MemberDataRecordPost,
  type MemberDataRecordPostCoreValues,
  type MemberDataRecordSelect,
  membersTable,
} from "./schema"

type MemberRecordSelectWithExtras = MemberDataRecordSelect & {
  nextBirthday: Date
}

// Function to calculate the next birthday SQL expression
const calculateNextBirthday = () => {
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
    .as("next_birthday")
}

const getSharedExtras = () => ({ nextBirthday: calculateNextBirthday() })

export type MemberData = MemberDataRecordSelect & {
  /** Computed post-select based on birthday field */
  age: number | null
}

const mapSelectedMemberData = (memberData: MemberDataRecordSelect) => ({
  ...memberData,
  age: calculateAge(memberData.birthday),
})

export const getMemberData = async ({
  userId,
  guildId,
}: {
  userId: string
  guildId: string
}): Promise<MemberData | undefined> => {
  const memberRecords: MemberRecordSelectWithExtras[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.userId, userId),
        eq(membersTable.guildId, guildId),
      ),
    })

  if (memberRecords.length > 1) {
    throw new DoraException(
      "Multiple users found with the same id and guild",
      DoraException.Type.Unknown,
      { metadata: { userId, guildId } },
    )
  }
  const memberRecord = memberRecords[0]
  if (!memberRecord) return
  return mapSelectedMemberData(memberRecord)
}

/** Creates member or updates member with all the data sent */
export const setMemberData = async ({
  memberData,
}: {
  memberData: MemberDataRecordPost
}): Promise<void> => {
  await actionWrapper({
    actionDescription: "Set member data",
    meta: { userId: memberData.userId, displayName: memberData.displayName },
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
}): Promise<void> => {
  const insertData = {
    ...coreMemberData,
    messageCount: 1,
    latestMessageAt: messageTimestamp,
  }
  await actionWrapper({
    actionDescription: "Update member message stats",
    meta: {
      userId: coreMemberData.userId,
      displayName: coreMemberData.displayName,
    },
    action: async () => {
      await db
        .insert(membersTable)
        .values(insertData)
        .onConflictDoUpdate({
          target: [membersTable.userId, membersTable.guildId],
          set: {
            username: coreMemberData.username,
            displayName: coreMemberData.displayName,
            messageCount: sql`${membersTable.messageCount} + 1`,
            latestMessageAt: messageTimestamp,
          },
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
}): Promise<void> => {
  const insertData = {
    ...coreMemberData,
    reactionCount: 1,
    latestReactionAt: reactionTimestamp,
  }
  await actionWrapper({
    actionDescription: "Add member reaction to stats",
    meta: {
      userId: coreMemberData.userId,
      username: coreMemberData.username,
    },
    action: async () => {
      await db
        .insert(membersTable)
        .values(insertData)
        .onConflictDoUpdate({
          target: [membersTable.userId, membersTable.guildId],
          set: {
            username: coreMemberData.username,
            reactionCount: sql`${membersTable.reactionCount} + 1`,
            latestReactionAt: reactionTimestamp,
          },
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
    meta: {
      userId: coreMemberData.userId,
      username: coreMemberData.username,
    },
    action: async () => {
      await db
        .insert(membersTable)
        .values(insertData)
        .onConflictDoUpdate({
          target: [membersTable.userId, membersTable.guildId],
          set: {
            username: coreMemberData.username,
            reactionCount: sql`${membersTable.reactionCount} - 1`,
          },
        })
    },
  })
}

export const getMembersWithBirthdayTodayForAllGuilds = async (): Promise<
  MemberData[]
> => {
  const memberRecords: MemberRecordSelectWithExtras[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        isNotNull(membersTable.birthday),
        sql`EXTRACT(MONTH FROM ${membersTable.birthday}) = EXTRACT(MONTH FROM CURRENT_DATE) AND 
            EXTRACT(DAY FROM ${membersTable.birthday}) = EXTRACT(DAY FROM CURRENT_DATE)`,
      ),
    })

  return memberRecords.map(mapSelectedMemberData)
}

export const getMembersWithUpcomingBirthday = async ({
  guildId,
  userIds,
}: {
  guildId: string
  /**
   * Pass if it should filter based on these userIds
   * Can be useful if you for example have fetched all members in a role and want to fetch only for those members
   */
  userIds?: string[]
}): Promise<MemberData[]> => {
  const memberRecords: MemberRecordSelectWithExtras[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.guildId, guildId),
        isNotNull(membersTable.birthday),
        userIds ? inArray(membersTable.userId, userIds) : undefined,
      ),
      orderBy: sql`next_birthday`,
      limit: 10,
    })

  return memberRecords.map(mapSelectedMemberData)
}

export const getMembersWithPokemonTcgpFriendCode = async ({
  guildId,
}: {
  guildId: string
}): Promise<MemberData[]> => {
  const memberRecords: MemberRecordSelectWithExtras[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.guildId, guildId),
        isNotNull(membersTable.pokemonTcgpFriendCode),
      ),
      limit: 30,
    })

  return memberRecords.map(mapSelectedMemberData)
}

export const getMembersWithDietaryPreferences = async ({
  guildId,
}: {
  guildId: string
}): Promise<MemberData[]> => {
  const memberRecords: MemberRecordSelectWithExtras[] =
    await db.query.membersTable.findMany({
      extras: getSharedExtras(),
      where: and(
        eq(membersTable.guildId, guildId),
        isNotNull(membersTable.dietaryPreferences),
      ),
      limit: 50,
    })

  return memberRecords.map(mapSelectedMemberData)
}
