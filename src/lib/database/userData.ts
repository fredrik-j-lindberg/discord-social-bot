import { and, eq, getTableColumns, inArray, isNotNull, sql } from "drizzle-orm"

import { actionWrapper } from "../actionWrapper"
import { DoraException } from "../exceptions/DoraException"
import { db } from "./client"
import {
  type UserData,
  type UserDataPost,
  type UserDataPostCoreValues,
  type UserDataSelect,
  usersTable,
} from "./schema"

const calculateAge = (birthday: Date | null) => {
  if (!birthday) return null
  const today = new Date()

  let age = today.getFullYear() - birthday.getFullYear()
  const monthDifference = today.getMonth() - birthday.getMonth()

  // Adjust age if the birth date hasn't occurred yet this year
  const isBirthdayMonthPassed = monthDifference < 0
  const isBirthdayDayPassed =
    monthDifference === 0 && today.getDate() < birthday.getDate()

  if (isBirthdayMonthPassed || isBirthdayDayPassed) {
    age--
  }

  return age
}

const mapSelectedUserData = (userData: UserDataSelect) => ({
  ...userData,
  age: calculateAge(userData.birthday),
})

// Function to calculate the next birthday SQL expression
const calculateNextBirthday = () => {
  return sql`
  CASE 
    -- Check if birthday is NULL or not
    WHEN ${usersTable.birthday} IS NULL THEN NULL -- Return NULL if the birthday is not set

    -- Check if the user's birthday has occurred this year or is today
    WHEN (EXTRACT(MONTH FROM ${usersTable.birthday}), EXTRACT(DAY FROM ${usersTable.birthday})) >= 
         (EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(DAY FROM CURRENT_DATE))
    THEN
        -- Calculate the next birthday for this year
        DATE_TRUNC('year', CURRENT_DATE) + 
        ((EXTRACT(MONTH FROM ${usersTable.birthday}) - 1) * INTERVAL '1 month') + 
        (EXTRACT(DAY FROM ${usersTable.birthday}) - 1) * INTERVAL '1 day'
    ELSE
        -- Calculate the next birthday for next year
        DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + 
        ((EXTRACT(MONTH FROM ${usersTable.birthday}) - 1) * INTERVAL '1 month') + 
        (EXTRACT(DAY FROM ${usersTable.birthday}) - 1) * INTERVAL '1 day'
  END`
    .mapWith(usersTable.birthday)
    .as("next_birthday")
}

export const getUserData = async ({
  userId,
  guildId,
}: {
  userId: string
  guildId: string
}): Promise<UserData | undefined> => {
  const users = await db
    .select({
      ...getTableColumns(usersTable),
      nextBirthday: calculateNextBirthday(),
    })
    .from(usersTable)
    .where(and(eq(usersTable.userId, userId), eq(usersTable.guildId, guildId)))

  if (users.length > 1) {
    throw new DoraException(
      "Multiple users found with the same id and guild",
      DoraException.Type.Unknown,
      { metadata: { userId, guildId } },
    )
  }
  const selectedUserData = users[0]
  if (!selectedUserData) return
  return mapSelectedUserData(selectedUserData)
}

/** Creates user or updates user with all the data sent */
export const setUserData = async ({
  userData,
}: {
  userData: UserDataPost
}): Promise<void> => {
  await actionWrapper({
    actionDescription: "Set user data",
    meta: { userId: userData.userId, displayName: userData.displayName },
    action: async () => {
      await db
        .insert(usersTable)
        .values(userData)
        .onConflictDoUpdate({
          target: [usersTable.userId, usersTable.guildId],
          set: userData,
        })
    },
  })
}

/** Creates user or updates user with all the data sent */
export const addUserMessageToStats = async ({
  requiredUserData,
  messageTimestamp,
}: {
  requiredUserData: UserDataPostCoreValues
  messageTimestamp: Date
}): Promise<void> => {
  const insertData = {
    ...requiredUserData,
    messageCount: 1,
    latestMessageAt: messageTimestamp,
  }
  await actionWrapper({
    actionDescription: "Update user message stats",
    meta: {
      userId: requiredUserData.userId,
      displayName: requiredUserData.displayName,
    },
    action: async () => {
      await db
        .insert(usersTable)
        .values(insertData)
        .onConflictDoUpdate({
          target: [usersTable.userId, usersTable.guildId],
          set: {
            username: requiredUserData.username,
            displayName: requiredUserData.displayName,
            messageCount: sql`${usersTable.messageCount} + 1`,
            latestMessageAt: messageTimestamp,
          },
        })
    },
  })
}

export const getUsersWithBirthdayTodayForAllGuilds = async (): Promise<
  UserData[]
> => {
  const selectedUserDataRecords = await db
    .select()
    .from(usersTable)
    .where(
      and(
        isNotNull(usersTable.birthday),
        sql`EXTRACT(MONTH FROM ${usersTable.birthday}) = EXTRACT(MONTH FROM CURRENT_DATE) AND 
              EXTRACT(DAY FROM ${usersTable.birthday}) = EXTRACT(DAY FROM CURRENT_DATE)`,
      ),
    )

  return selectedUserDataRecords.map(mapSelectedUserData)
}

export const getUsersWithUpcomingBirthday = async ({
  guildId,
  userIds,
}: {
  guildId: string
  /**
   * Pass if it should filter based on these userIds
   * Can be useful if you for example have fetched all users in a role and want to fetch only for those users
   */
  userIds?: string[]
}): Promise<UserData[]> => {
  const selectedUserDataRecords = await db
    .select({
      ...getTableColumns(usersTable),
      nextBirthday: calculateNextBirthday(),
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.guildId, guildId),
        isNotNull(usersTable.birthday),
        userIds ? inArray(usersTable.userId, userIds) : undefined,
      ),
    )
    .orderBy(sql`next_birthday`) // Order by the calculated next birthday
    .limit(10) // Limit result to the 10 nearest birthdays

  return selectedUserDataRecords.map(mapSelectedUserData)
}

export const getUsersWithPokemonTcgpFriendCode = async ({
  guildId,
}: {
  guildId: string
}): Promise<UserData[]> => {
  const selectedUserDataRecords = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.guildId, guildId),
        isNotNull(usersTable.pokemonTcgpFriendCode),
      ),
    )
    .limit(30)

  return selectedUserDataRecords.map(mapSelectedUserData)
}

export const getUsersWithDietaryPreferences = async ({
  guildId,
}: {
  guildId: string
}): Promise<UserData[]> => {
  const selectedUserDataRecords = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.guildId, guildId),
        isNotNull(usersTable.dietaryPreferences),
      ),
    )
    .limit(50)

  return selectedUserDataRecords.map(mapSelectedUserData)
}
