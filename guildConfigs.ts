import {
  allMemberFieldsConfig,
  type DoraMemberFields,
} from "~/configs/memberFieldsConfig"
import { env } from "~/env"
import { DoraException } from "~/lib/exceptions/DoraException"

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
      allMemberFieldsConfig.birthday.name,
      allMemberFieldsConfig.firstName.name,
      allMemberFieldsConfig.phoneNumber.name,
      allMemberFieldsConfig.dietaryPreferences.name,
      allMemberFieldsConfig.pokemonTcgpFriendCode.name,
      allMemberFieldsConfig.joinedServer.name,
      allMemberFieldsConfig.accountCreation.name,
      allMemberFieldsConfig.messageCount.name,
      allMemberFieldsConfig.latestMessageAt.name,
      allMemberFieldsConfig.reactionCount.name,
      allMemberFieldsConfig.latestReactionAt.name,
      allMemberFieldsConfig.roles.name,
      allMemberFieldsConfig.favoriteEmojis.name,
      allMemberFieldsConfig.age.name,
      allMemberFieldsConfig.nextBirthday.name,
    ],
    birthdays: {
      channelId: "1216485497501908992", // #dora-test
      roleId: "1276262193515593780",
    },
  },
}

const prodGuildConfigs: GuildConfigs = {
  // Climbing (Dora the Explorer)
  "1193809867232772126": {
    guildId: "1193809867232772126",
    optInMemberFields: [
      allMemberFieldsConfig.birthday.name,
      allMemberFieldsConfig.phoneNumber.name,
      allMemberFieldsConfig.email.name,
      allMemberFieldsConfig.dietaryPreferences.name,
      allMemberFieldsConfig.joinedServer.name,
      allMemberFieldsConfig.accountCreation.name,
      allMemberFieldsConfig.favoriteEmojis.name,
      allMemberFieldsConfig.age.name,
      allMemberFieldsConfig.nextBirthday.name,
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
      allMemberFieldsConfig.birthday.name,
      allMemberFieldsConfig.firstName.name,
      allMemberFieldsConfig.switchFriendCode.name,
      allMemberFieldsConfig.pokemonTcgpFriendCode.name,
      allMemberFieldsConfig.joinedServer.name,
      allMemberFieldsConfig.accountCreation.name,
      allMemberFieldsConfig.messageCount.name,
      allMemberFieldsConfig.reactionCount.name,
      allMemberFieldsConfig.favoriteEmojis.name,
      allMemberFieldsConfig.age.name,
      allMemberFieldsConfig.nextBirthday.name,
    ],
    birthdays: {
      channelId: "106099890320330752", // #general
      roleId: "1276240769975324692",
    },
  },
}

export const staticGuildConfigs: GuildConfigs = env.USE_DEV_GUILD_CONFIGS
  ? devGuildConfigs
  : prodGuildConfigs

export const getStaticGuildConfigById = (guildId: string) => {
  const guildConfig = Object.values(staticGuildConfigs).find(
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
