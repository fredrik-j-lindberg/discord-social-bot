import { env } from "~/env"
import { DoraException } from "~/lib/exceptions/DoraException"
import { logger } from "~/lib/logger"

export const SUPPORTED_USER_FIELDS = {
  birthday: "birthday",
  firstName: "firstName",
  phoneNumber: "phoneNumber",
  email: "email",
  dietaryPreferences: "dietaryPreferences",
  switchFriendCode: "switchFriendCode",
  pokemonTcgpFriendCode: "pokemonTcgpFriendCode",
  joinedServer: "joinedServer",
  accountCreation: "accountCreation",
} as const
export type DoraUserFields =
  (typeof SUPPORTED_USER_FIELDS)[keyof typeof SUPPORTED_USER_FIELDS]

export interface GuildConfig {
  guildId: string
  /** Fields that guilds need to opt in to use, as these fields might not be relevant for all guilds */
  optInUserFields: DoraUserFields[]
  birthdays: {
    /** Channel to send birthday wishes in */
    channelId?: string
    /** Role to add to users on their birthday */
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
    optInUserFields: [
      SUPPORTED_USER_FIELDS.birthday,
      SUPPORTED_USER_FIELDS.firstName,
      SUPPORTED_USER_FIELDS.phoneNumber,
      SUPPORTED_USER_FIELDS.dietaryPreferences,
      SUPPORTED_USER_FIELDS.pokemonTcgpFriendCode,
      SUPPORTED_USER_FIELDS.joinedServer,
      SUPPORTED_USER_FIELDS.accountCreation,
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
    optInUserFields: [
      SUPPORTED_USER_FIELDS.birthday,
      SUPPORTED_USER_FIELDS.phoneNumber,
      SUPPORTED_USER_FIELDS.email,
      SUPPORTED_USER_FIELDS.dietaryPreferences,
      SUPPORTED_USER_FIELDS.joinedServer,
      SUPPORTED_USER_FIELDS.accountCreation,
    ],
    birthdays: {
      channelId: "1193989101599326259", // #all-chat
      roleId: "1308163163149307955",
    },
  },
  // Eithon
  "106099890320330752": {
    guildId: "106099890320330752",
    optInUserFields: [
      SUPPORTED_USER_FIELDS.birthday,
      SUPPORTED_USER_FIELDS.firstName,
      SUPPORTED_USER_FIELDS.switchFriendCode,
      SUPPORTED_USER_FIELDS.pokemonTcgpFriendCode,
      SUPPORTED_USER_FIELDS.joinedServer,
      SUPPORTED_USER_FIELDS.accountCreation,
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
    (guildConfig) => guildConfig.guildId === guildId,
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
