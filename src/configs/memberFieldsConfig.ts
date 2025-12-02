interface MemberDataFieldConfig {
  validation?: unknown
  name: string
}

type MemberDataFieldsConfig = Record<string, MemberDataFieldConfig>

// TODO: Can we group these fields into different modals to avoid running into the 5 fields limitation?
// Then the different modals could be triggered like we handle it for /config
/**
 * Fields that the user has to provide themselves (via the /pii modal) and then stored in the DB.
 *
 * Note that each guild can support a maximum of 5 of these since the modal used to collect them
 * is limited to 5 fields (discord limitation).
 */
export const memberDataUserProvidedFieldsConfig = {
  birthday: {
    name: "birthday",
  },
  firstName: {
    name: "firstName",
  },
  phoneNumber: {
    name: "phoneNumber",
  },
  email: {
    name: "email",
  },
  dietaryPreferences: {
    name: "dietaryPreferences",
  },
  switchFriendCode: {
    name: "switchFriendCode",
  },
  pokemonTcgpFriendCode: {
    name: "pokemonTcgpFriendCode",
  },
} as const satisfies MemberDataFieldsConfig

/** Fields where the Discord api is the source */
export const memberDataDiscordFieldsConfig = {
  joinedServer: {
    name: "joinedServer",
  },
  accountCreation: {
    name: "accountCreation",
  },
} as const satisfies MemberDataFieldsConfig

/**
 * Fields related to member activity that are tracked by the bot
 * and stored in the DB
 */
export const memberDataActivityFieldsConfig = {
  messageCount: {
    name: "messageCount",
  },
  latestMessageAt: {
    name: "latestMessageAt",
  },
  reactionCount: {
    name: "reactionCount",
  },
  latestReactionAt: {
    name: "latestReactionAt",
  },
  favoriteEmojis: {
    name: "favoriteEmojis",
  },
} as const satisfies MemberDataFieldsConfig

export const allMemberFieldsConfig = {
  ...memberDataUserProvidedFieldsConfig,
  ...memberDataDiscordFieldsConfig,
  ...memberDataActivityFieldsConfig,
  // Values owned by Discord but synced to DB
  roles: {
    name: "roles",
  },
} as const satisfies MemberDataFieldsConfig

export type DoraMemberFields =
  (typeof allMemberFieldsConfig)[keyof typeof allMemberFieldsConfig]["name"]
