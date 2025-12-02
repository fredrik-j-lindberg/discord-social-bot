import type { StaticGuildConfig } from "../../guildConfigs"

export type MemberOptInFields =
  | "birthday"
  | "firstName"
  | "phoneNumber"
  | "email"
  | "dietaryPreferences"
  | "switchFriendCode"
  | "pokemonTcgpFriendCode"

type MemberDoraProvidedFields =
  | "messageCount"
  | "latestMessageAt"
  | "reactionCount"
  | "latestReactionAt"
  | "favoriteEmojis"
  | "nextBirthday"
  | "age"
  | "roles"
  | "joinedServer"
  | "accountCreation"

export type MemberFields = MemberOptInFields | MemberDoraProvidedFields

interface MemberFieldConfig {
  name: MemberFields
  optIn?: boolean
  /** If this field depends on another being enabled, for this field to be valid */
  dependsOn?: MemberFields
}

type MemberFieldsConfig = Record<MemberFields, MemberFieldConfig>

export const memberFieldsConfig = {
  // TODO: Can we group these fields into different modals to avoid running into the 5 fields limitation?
  // Then the different modals could be triggered like we handle it for /config
  /**
   * Fields that the user has to provide themselves (via the /pii modal) and then stored in the DB.
   *
   * Note that each guild can support a maximum of 5 of these since the modal used to collect them
   * is limited to 5 fields (discord limitation).
   */
  birthday: {
    name: "birthday",
    optIn: true,
    dependsOn: undefined,
  },
  firstName: {
    name: "firstName",
    optIn: true,
    dependsOn: undefined,
  },
  phoneNumber: {
    name: "phoneNumber",
    optIn: true,
    dependsOn: undefined,
  },
  email: {
    name: "email",
    optIn: true,
    dependsOn: undefined,
  },
  dietaryPreferences: {
    name: "dietaryPreferences",
    optIn: true,
    dependsOn: undefined,
  },
  switchFriendCode: {
    name: "switchFriendCode",
    optIn: true,
    dependsOn: undefined,
  },
  pokemonTcgpFriendCode: {
    name: "pokemonTcgpFriendCode",
    optIn: true,
    dependsOn: undefined,
  },
  // opt in fields above

  messageCount: {
    name: "messageCount",
    optIn: false,
    dependsOn: undefined,
  },
  latestMessageAt: {
    name: "latestMessageAt",
    optIn: false,
    dependsOn: undefined,
  },
  reactionCount: {
    name: "reactionCount",
    optIn: false,
    dependsOn: undefined,
  },
  latestReactionAt: {
    name: "latestReactionAt",
    optIn: false,
    dependsOn: undefined,
  },
  favoriteEmojis: {
    name: "favoriteEmojis",
    optIn: false,
    dependsOn: undefined,
  },
  /**
   * Based on the "birthday" input that we get from the user, but
   * calculated by Dora
   */
  nextBirthday: {
    name: "nextBirthday",
    optIn: false,
    dependsOn: "birthday",
  },
  age: {
    name: "age",
    optIn: false,
    dependsOn: "birthday",
  },
  /**
   * Owned by Discord but synced to the DB to make it easier to
   * query/filter members based on roles
   */
  roles: {
    name: "roles",
    optIn: false,
    dependsOn: undefined,
  },
  /**
   * Owned by discord and simply presented by Dora
   */
  joinedServer: {
    name: "joinedServer",
    optIn: false,
    dependsOn: undefined,
  },
  accountCreation: {
    name: "accountCreation",
    optIn: false,
    dependsOn: undefined,
  },
} as const satisfies MemberFieldsConfig

export const getActiveMemberFieldsMap = (guildConfig: StaticGuildConfig) => {
  type ActiveMemberFieldConfig = Partial<
    Record<MemberFields, MemberFieldConfig>
  >
  const activeMemberFields: ActiveMemberFieldConfig = {}
  guildConfig.optInMemberFields.forEach((fieldName) => {
    activeMemberFields[fieldName] = memberFieldsConfig[fieldName]
  })

  Object.values(memberFieldsConfig).forEach((field) => {
    if (field.optIn) return // Already taken care of above
    if (field.dependsOn && !activeMemberFields[field.dependsOn]) {
      return // The field this one depends on has not been activated above
    }
    activeMemberFields[field.name] = field
  })

  return activeMemberFields
}

export const getActiveMemberFields = (guildConfig: StaticGuildConfig) => {
  return Object.values(getActiveMemberFieldsMap(guildConfig))
}
