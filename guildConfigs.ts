import type { Level } from "pino"

import { env } from "~/env"
import { DoraException } from "~/lib/exceptions/DoraException"

export const SUPPORTED_MEMBER_FIELDS = {
  // Discord native values, recommended for all guilds
  joinedServer: "joinedServer",
  accountCreation: "accountCreation",

  // Member activity stats
  messageCount: "messageCount",
  latestMessageAt: "latestMessageAt",
  reactionCount: "reactionCount",
  latestReactionAt: "latestReactionAt",
  favoriteEmojis: "favoriteEmojis",

  // These require user input via the /pii modal. The modal support a max of 5 fields, so each guild should not have more than that
  birthday: "birthday",
  firstName: "firstName",
  phoneNumber: "phoneNumber",
  email: "email",
  dietaryPreferences: "dietaryPreferences",
  switchFriendCode: "switchFriendCode",
  pokemonTcgpFriendCode: "pokemonTcgpFriendCode",

  // Values owned by Discord but synced to DB
  roles: "roles",
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
  /**
   * If this is setting is set, the bot will monitor user inactivity
   * and ultimately kick inactive users. Check readme for more details
   */
  inactivityMonitoring?: {
    /** Number of days of inactivity before a user is considered inactive and will receive a notice */
    daysUntilInactive: number
    /** Once the user is marked as inactive, this is the number of days until they are kicked */
    daysAsInactiveBeforeKick: number
    /** Debug user, for testing purposes, this user id will get all the inactivity notifications */
    debugUserId: string
    /** Optional invite link to include in kick notice, allowing the user to rejoin easily */
    inviteLink?: string
  }
  /** Configuration for logging, leave out of guild config to disable logging */
  logs?: {
    /** Discord channel webhook for sending messages */
    webhookUrl: string
    /** Log level to send to Discord. E.g. "warn" will send warning logs and above to Discord (not info and debug) */
    levelThreshold: Level
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
      SUPPORTED_MEMBER_FIELDS.roles,
      SUPPORTED_MEMBER_FIELDS.favoriteEmojis,
    ],
    birthdays: {
      channelId: "1216485497501908992", // #dora-test
      roleId: "1276262193515593780",
    },
    inactivityMonitoring: {
      daysUntilInactive: 90,
      daysAsInactiveBeforeKick: 30,
      debugUserId: "106098921985556480",
      inviteLink: "https://discord.gg/QZxuMF8CE6",
    },
    logs: {
      webhookUrl:
        "https://discord.com/api/webhooks/1424836052320780359/wi5zae0S_6yEW3dtYFd70wKeOOT5o1-y94nvRhRf11e3wx99ruAgnwa_a7ejPC5Czfx8", // #dora-logs
      levelThreshold: "warn",
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
      SUPPORTED_MEMBER_FIELDS.favoriteEmojis,
    ],
    birthdays: {
      channelId: "1193989101599326259", // #all-chat
      roleId: "1308163163149307955",
    },
    inactivityMonitoring: {
      daysUntilInactive: 90,
      daysAsInactiveBeforeKick: 30,
      debugUserId: "106098921985556480",
      inviteLink: "https://discord.gg/RBKyxwPpEG",
    },
    logs: {
      webhookUrl:
        "https://discord.com/api/webhooks/1424860865970180256/sbK03sh-_qvA--oKEO3qw33fTDZI0f-LdJKzoTwS4BFRgoeRbYvX5oFne5J-8_2V3E_E", // #dora-logs
      levelThreshold: "warn",
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
      SUPPORTED_MEMBER_FIELDS.favoriteEmojis,
    ],
    birthdays: {
      channelId: "106099890320330752", // #general
      roleId: "1276240769975324692",
    },
    logs: {
      webhookUrl:
        "https://discord.com/api/webhooks/1424861409702973560/p7w5IdLGTovh5nJIhPTqms1XPsC8Di6HkBbu3tkt71cE0JLy22nTAC_u0kFERvDkeDG5", // #log-general
      levelThreshold: "warn",
    },
  },
}

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
