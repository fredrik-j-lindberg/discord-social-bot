import type { Guild, GuildMember } from "discord.js"

import { getMemberData } from "../database/memberDataService"
import {
  type EmojiCount,
  getMemberEmojiCounts,
} from "../database/memberEmojisService"
import { getMember } from "../discord/user"
import { DoraException } from "../exceptions/DoraException"
import { getValidDate } from "./date"

interface DoraMemberStats {
  latestActivityAt?: Date | null
  inactiveSince?: Date | null
  messageCount?: number
  latestMessageAt?: Date | null
  reactionCount?: number
  latestReactionAt?: Date | null
  /** Fetched additionally from the emoji counts service. Sometimes this is skipped in favor of performance, so note that if it is undefined it has likely just not been included on purpose */
  favoriteEmojis?: EmojiCount[] | null
  joinedServer?: Date
  accountCreation?: Date
}

interface DoraMemberPersonalInfo {
  birthday?: Date | null
  nextBirthday?: Date | null
  age?: number | null
  firstName?: string | null
  phoneNumber?: string | null
  email?: string | null
  dietaryPreferences?: string | null
}

interface DoraMemberFriendCodes {
  switch?: string | null
  pokemonTcgp?: string | null
}

/** The official Dora member representation, combining data from both discord and Dora member database */
export interface DoraMember {
  /** The unique ID of the member data record in the database. Optional as some members may not have a database record */
  databaseId?: string
  /** The Discord user ID of the user */
  userId: string
  /** The Discord username of the user */
  username: string
  /** The Discord display name of the user (within the guild). Defaults to username if for some reason neither of those are set */
  displayName: string
  /** The guild ID where this member belongs */
  guildId: string
  /** Role IDs assigned to the member in the guild */
  roleIds: string[]
  /** Various statistics about the member */
  stats: DoraMemberStats
  /** Personal info provided by the member themself */
  personalInfo?: DoraMemberPersonalInfo
  /** Friend codes provided by the member themself */
  friendCodes?: DoraMemberFriendCodes
  /** The original guild member object from Discord */
  guildMember: GuildMember
}

/** A Dora member representation without the discord provided data guild member data (based solely on the database data) */
export type DoraDatabaseMember = Omit<
  DoraMember,
  "databaseId" | "guildMember" | "stats"
> & {
  databaseId: string
  stats: Omit<DoraMemberStats, "joinedServer" | "accountCreation">
}

/** A Dora member representation without the database provided data (based solely on the Discord guild member data) */
export type DoraDiscordMember = Omit<
  DoraMember,
  "databaseId" | "personalInfo" | "friendCodes" | "stats"
> & { stats: Pick<DoraMemberStats, "joinedServer" | "accountCreation"> }

/** Takes two partial DoraMember objects and combines them into a complete DoraMember */
export const mapToCompleteDoraMember = ({
  doraDiscordMember,
  doraDatabaseMember,
}: {
  doraDiscordMember: DoraDiscordMember
  doraDatabaseMember?: DoraDatabaseMember
}): DoraMember => {
  return {
    ...doraDiscordMember,
    ...doraDatabaseMember,
    stats: {
      ...doraDiscordMember.stats,
      ...doraDatabaseMember?.stats,
    },
  }
}

/** Maps Discord guild member data into DoraDiscordMember object, which is a partial type of the DoraMember type */
export const mapToDoraDiscordMember = (
  guildMember: GuildMember,
): DoraDiscordMember => {
  const username = guildMember.user.username
  const displayName = guildMember.displayName || username

  return {
    userId: guildMember.user.id,
    username,
    displayName,
    guildId: guildMember.guild.id,
    roleIds: guildMember.roles.cache
      .filter((role) => role.id !== guildMember.guild.id) // Remove the irrelevant @everyone role
      .map((role) => role.id),
    stats: {
      joinedServer: getValidDate(guildMember.joinedTimestamp),
      accountCreation: getValidDate(guildMember.user.createdTimestamp),
    },
    guildMember,
  }
}

export const getDoraDiscordMember = async ({
  guild,
  userId,
}: {
  guild: Guild
  userId: string
}): Promise<DoraDiscordMember> => {
  const guildMember = await getMember({
    guild,
    userId,
  })

  return mapToDoraDiscordMember(guildMember)
}

export const getDoraDatabaseMember = async ({
  guildId,
  userId,
  withEmojiCounts = true,
}: {
  guildId: string
  userId: string
  withEmojiCounts?: boolean
}): Promise<DoraDatabaseMember | undefined> => {
  const doraDatabaseMember = await getMemberData({
    userId,
    guildId,
  })

  if (!doraDatabaseMember) return doraDatabaseMember
  if (!withEmojiCounts) return doraDatabaseMember

  const emojiCounts = await getMemberEmojiCounts({
    memberId: doraDatabaseMember.databaseId,
    sortBy: "mostUsed",
    limit: 15,
  })

  return {
    ...doraDatabaseMember,
    stats: {
      ...doraDatabaseMember.stats,
      favoriteEmojis: emojiCounts,
    },
  }
}

/**
 * Helper for getting a full DoraMember object, combining both Discord and database data
 * It differs from getFullDoraMember in that it will not throw if no database data is found.
 */
export const getDoraMember = async ({
  guild,
  userId,
}: {
  guild: Guild
  userId: string
}): Promise<DoraMember> => {
  const doraDiscordMember = await getDoraDiscordMember({
    guild,
    userId,
  })

  const doraDatabaseMember = await getDoraDatabaseMember({
    userId,
    guildId: guild.id,
  })

  return mapToCompleteDoraMember({
    doraDiscordMember,
    doraDatabaseMember,
  })
}

/**
 * Helper for getting a full DoraMember object, combining both Discord and database data
 * @throws {DoraException} When no database member data is found
 */
export const getFullDoraMember = async ({
  guild,
  userId,
}: {
  guild: Guild
  userId: string
}): Promise<DoraMember> => {
  const doraMember = await getDoraMember({
    guild,
    userId,
  })

  if (!doraMember.databaseId) {
    throw new DoraException(
      `No Dora member data found for user ID ${userId} in guild ID ${guild.id}`,
    )
  }

  return doraMember
}
