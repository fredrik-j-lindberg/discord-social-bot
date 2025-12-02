interface MemberFieldConfig {
  name: string
}

type MemberFieldsConfig = Record<string, MemberFieldConfig>

// TODO: Can we group these fields into different modals to avoid running into the 5 fields limitation?
// Then the different modals could be triggered like we handle it for /config
/**
 * Fields that the user has to provide themselves (via the /pii modal) and then stored in the DB.
 *
 * Note that each guild can support a maximum of 5 of these since the modal used to collect them
 * is limited to 5 fields (discord limitation).
 */
export const memberProvidedFieldsConfig = {
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
} as const satisfies MemberFieldsConfig

/** Fields where the Discord api is the source */
export const memberDiscordProvidedFieldsConfig = {
  joinedServer: {
    name: "joinedServer",
  },
  accountCreation: {
    name: "accountCreation",
  },
} as const satisfies MemberFieldsConfig

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
} as const satisfies MemberFieldsConfig

export const allMemberFieldsConfig = {
  ...memberProvidedFieldsConfig,
  ...memberDiscordProvidedFieldsConfig,
  ...memberDataActivityFieldsConfig,
  // Values owned by Discord but synced to DB
  roles: {
    name: "roles",
  },
} as const satisfies MemberFieldsConfig

export type DoraMemberFields =
  (typeof allMemberFieldsConfig)[keyof typeof allMemberFieldsConfig]["name"]

/** Fiels the member has to provide themselves through e.g. /pii modal */
export type DoraMemberProvidedFields =
  (typeof memberProvidedFieldsConfig)[keyof typeof memberProvidedFieldsConfig]["name"]
