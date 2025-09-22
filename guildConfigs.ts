import { env } from "~/env"
import { DoraException } from "~/lib/exceptions/DoraException"
import { logger } from "~/lib/logger"

export const SUPPORTED_MEMBER_FIELDS = {
  // Discord native values, recommended for all guilds
  joinedServer: "joinedServer",
  accountCreation: "accountCreation",

  // Member activity stats
  messageCount: "messageCount",
  latestMessageAt: "latestMessageAt",
  reactionCount: "reactionCount",
  latestReactionAt: "latestReactionAt",

  // These require user input via the /pii modal. The modal support a max of 5 fields, so each guild should not have more than that
  birthday: "birthday",
  firstName: "firstName",
  phoneNumber: "phoneNumber",
  email: "email",
  dietaryPreferences: "dietaryPreferences",
  switchFriendCode: "switchFriendCode",
  pokemonTcgpFriendCode: "pokemonTcgpFriendCode",
} as const
export type DoraMemberFields =
  (typeof SUPPORTED_MEMBER_FIELDS)[keyof typeof SUPPORTED_MEMBER_FIELDS]

export interface GuildConfig {
  guildId: string
  /** Fields that guilds need to opt in to use, as these fields might not be relevant for all guilds */
  optInMemberFields: DoraMemberFields[]
  birthdays: {
    /** Channel to send birthday wishes in */
    channelId?: string
    /** Role to add to members on their birthday */
    roleId?: string
  }
}

interface GuildConfigs {
  [guildId: string]: GuildConfig
}

// Configurations for guilds that the local bot is in, to avoid trying to fetch data from production guilds etc
const devGuildConfigs: GuildConfigs = {
  // Local bot testing
  "1211309484811485264": {
    guildId: "1211309484811485264",
    optInMemberFields: [
      SUPPORTED_MEMBER_FIELDS.birthday,
      SUPPORTED_MEMBER_FIELDS.firstName,
      SUPPORTED_MEMBER_FIELDS.phoneNumber,
      SUPPORTED_MEMBER_FIELDS.dietaryPreferences,
      SUPPORTED_MEMBER_FIELDS.pokemonTcgpFriendCode,
      SUPPORTED_MEMBER_FIELDS.joinedServer,
      SUPPORTED_MEMBER_FIELDS.accountCreation,
      SUPPORTED_MEMBER_FIELDS.messageCount,
      SUPPORTED_MEMBER_FIELDS.latestMessageAt,
      SUPPORTED_MEMBER_FIELDS.reactionCount,
      SUPPORTED_MEMBER_FIELDS.latestReactionAt,
    ],
    birthdays: {
      channelId: "1216485497501908992", // #dora-test
      roleId: "1276262193515593780",
    },
  },
}

export const prodGuildConfigs: GuildConfigs = {
  // Climbing (Dora the Explorer)
  "1193809867232772126": {
    guildId: "1193809867232772126",
    optInMemberFields: [
      SUPPORTED_MEMBER_FIELDS.birthday,
      SUPPORTED_MEMBER_FIELDS.phoneNumber,
      SUPPORTED_MEMBER_FIELDS.email,
      SUPPORTED_MEMBER_FIELDS.dietaryPreferences,
      SUPPORTED_MEMBER_FIELDS.joinedServer,
      SUPPORTED_MEMBER_FIELDS.accountCreation,
    ],
    birthdays: {
      channelId: "1193989101599326259", // #all-chat
      roleId: "1308163163149307955",
    },
  },
  // Eithon
  "106099890320330752": {
    guildId: "106099890320330752",
    optInMemberFields: [
      SUPPORTED_MEMBER_FIELDS.birthday,
      SUPPORTED_MEMBER_FIELDS.firstName,
      SUPPORTED_MEMBER_FIELDS.switchFriendCode,
      SUPPORTED_MEMBER_FIELDS.pokemonTcgpFriendCode,
      SUPPORTED_MEMBER_FIELDS.joinedServer,
      SUPPORTED_MEMBER_FIELDS.accountCreation,
      SUPPORTED_MEMBER_FIELDS.messageCount,
      SUPPORTED_MEMBER_FIELDS.reactionCount,
    ],
    birthdays: {
      channelId: "106099890320330752", // #general
      roleId: "1276240769975324692",
    },
  },
}

logger.info({ devMode: env.USE_DEV_GUILD_CONFIGS }, "Loaded guild configs")
export const guildConfigs: GuildConfigs = env.USE_DEV_GUILD_CONFIGS
  ? devGuildConfigs
  : prodGuildConfigs

export const getGuildConfigById = (guildId: string) => {
  const guildConfig = Object.values(guildConfigs).find(
    (config) => config.guildId === guildId,
  )
  if (!guildConfig) {
    throw new DoraException(
      `Guild config not found for guildId`,
      DoraException.Type.NotFound,
      { metadata: { guildId } },
    )
  }
  return guildConfig
}
