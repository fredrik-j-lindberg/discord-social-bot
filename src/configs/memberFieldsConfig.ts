import {
  createCopyableText,
  createDiscordTimestamp,
  createEmojiMention,
  createRoleMention,
} from "~/lib/discord/message"
import { formatDate } from "~/lib/helpers/date"
import type { DoraMember } from "~/lib/helpers/doraMember"

export type MemberOptInFieldIds =
  | "birthday"
  | "firstName"
  | "phoneNumber"
  | "email"
  | "dietaryPreferences"
  | "switchFriendCode"
  | "pokemonTcgpFriendCode"

type MemberDoraProvidedFieldIds =
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

export type MemberFieldsIds = MemberOptInFieldIds | MemberDoraProvidedFieldIds

export interface MemberFieldConfig<
  TId extends MemberFieldsIds = MemberFieldsIds,
> {
  /** Display name of the field (e.g. for the /whois command) */
  name: string
  /** Unique identifier for the field, used for referencing the field internally for e.g. commands and modals */
  id: TId
  /** Whether the user has to opt in to provide this data (e.g. via the /pii modal) */
  optIn?: boolean
  /** If this field depends on another being enabled, for this field to be valid */
  dependsOn?: MemberFieldsIds
  /** Responsible for selecting the relevant field from the DoraMember and formatting it for display (e.g. for the /whois command) */
  selector?: (
    doraMember: Omit<DoraMember, "guildMember">, // guildMember should not be needed for formatting. If we have a use case for data on it, we can add it to the core DoraMember model
    mode?: "compact" | "long", // Different display modes for different use cases (e.g. full /whois embed usually wants compact while /whois filtered for a specific field wants long)
  ) => string | undefined
  /** How the user can provide this data */
  provideGuidance?: string
}

type MemberFieldsConfig = { [Key in MemberFieldsIds]: MemberFieldConfig<Key> }

const provideGuidanceCopy = {
  pii: "Can be added or changed via the `/pii` command.",
}

export const memberFieldsConfig: MemberFieldsConfig = {
  // TODO: Can we group these fields into different modals to avoid running into the 5 fields limitation?
  // Then the different modals could be triggered like we handle it for /config
  /**
   * Fields that the user has to provide themselves (via the /pii modal) and then stored in the DB.
   *
   * Note that each guild can support a maximum of 5 of these since the modal used to collect them
   * is limited to 5 fields (discord limitation).
   */
  birthday: {
    name: "Birthday",
    id: "birthday",
    optIn: true,
    dependsOn: undefined,
    selector: ({ personalInfo }) =>
      createCopyableText(
        formatDate(personalInfo?.birthday, { dateStyle: "short" }),
      ),
    provideGuidance: provideGuidanceCopy.pii,
  },
  firstName: {
    name: "First name",
    id: "firstName",
    optIn: true,
    dependsOn: undefined,
    selector: ({ personalInfo }) => createCopyableText(personalInfo?.firstName),
    provideGuidance: provideGuidanceCopy.pii,
  },
  phoneNumber: {
    name: "Phone number",
    id: "phoneNumber",
    optIn: true,
    dependsOn: undefined,
    selector: ({ personalInfo }) =>
      createCopyableText(personalInfo?.phoneNumber),
    provideGuidance: provideGuidanceCopy.pii,
  },
  email: {
    name: "Email",
    id: "email",
    optIn: true,
    dependsOn: undefined,
    selector: ({ personalInfo }) => createCopyableText(personalInfo?.email),
    provideGuidance: provideGuidanceCopy.pii,
  },
  dietaryPreferences: {
    name: "Dietary preferences",
    id: "dietaryPreferences",
    optIn: true,
    dependsOn: undefined,
    selector: ({ personalInfo }) =>
      createCopyableText(personalInfo?.dietaryPreferences),
    provideGuidance: provideGuidanceCopy.pii,
  },
  switchFriendCode: {
    name: "Switch Friend Code",
    id: "switchFriendCode",
    optIn: true,
    dependsOn: undefined,
    selector: ({ friendCodes }) => createCopyableText(friendCodes?.switch),
    provideGuidance: provideGuidanceCopy.pii,
  },
  pokemonTcgpFriendCode: {
    name: "Pokémon TCGP",
    id: "pokemonTcgpFriendCode",
    optIn: true,
    dependsOn: undefined,
    selector: ({ friendCodes }) => createCopyableText(friendCodes?.pokemonTcgp),
    provideGuidance: provideGuidanceCopy.pii,
  },
  // opt in fields above

  messageCount: {
    name: "Message Count",
    id: "messageCount",
    optIn: false,
    dependsOn: undefined,
    selector: ({ stats }) => createCopyableText(stats.messageCount),
  },
  latestMessageAt: {
    name: "Latest Message At",
    id: "latestMessageAt",
    optIn: false,
    dependsOn: undefined,
    selector: ({ stats }) => createDiscordTimestamp(stats.latestMessageAt),
  },
  reactionCount: {
    name: "Reaction Count",
    id: "reactionCount",
    optIn: false,
    dependsOn: undefined,
    selector: ({ stats }) => createCopyableText(stats.reactionCount),
  },
  latestReactionAt: {
    name: "Latest Reaction At",
    id: "latestReactionAt",
    optIn: false,
    dependsOn: undefined,
    selector: ({ stats }) => createDiscordTimestamp(stats.latestReactionAt),
  },
  favoriteEmojis: {
    name: "Favorite Emojis",
    id: "favoriteEmojis",
    optIn: false,
    dependsOn: undefined,
    selector: ({ stats }, mode) =>
      stats.favoriteEmojis
        ?.slice(0, mode === "compact" ? 5 : stats.favoriteEmojis.length)
        .map(({ emojiId, emojiName, isAnimated, count }) =>
          mode === "compact"
            ? createEmojiMention({
                id: emojiId,
                name: emojiName,
                isAnimated,
              })
            : `${createEmojiMention({ id: emojiId, name: emojiName, isAnimated })} (${count})`,
        )
        .join(" "),
  },
  /**
   * Based on the "birthday" input that we get from the user, but
   * calculated by Dora
   */
  nextBirthday: {
    name: "Next Birthday",
    id: "nextBirthday",
    optIn: false,
    dependsOn: "birthday",
    selector: ({ personalInfo }) =>
      createDiscordTimestamp(personalInfo?.nextBirthday),
    get provideGuidance() {
      return `Requires the ${this.dependsOn} field to be set.`
    },
  },
  age: {
    name: "Age",
    id: "age",
    optIn: false,
    dependsOn: "birthday",
    selector: ({ personalInfo }) => createCopyableText(personalInfo?.age),
    get provideGuidance() {
      return `Requires the ${this.dependsOn} field to be set.`
    },
  },
  /**
   * Owned by Discord but synced to the DB to make it easier to
   * query/filter members based on these values
   */
  roles: {
    name: "Roles",
    id: "roles",
    optIn: false,
    dependsOn: undefined,
    selector: ({ roleIds }) =>
      roleIds.map((roleId) => createRoleMention(roleId)).join(" "),
  },
  /**
   * Owned by discord and simply presented by Dora
   */
  joinedServer: {
    name: "Joined Server",
    id: "joinedServer",
    optIn: false,
    dependsOn: undefined,
    selector: ({ stats }) => createDiscordTimestamp(stats.joinedServer),
  },
  accountCreation: {
    name: "Account Creation",
    id: "accountCreation",
    optIn: false,
    dependsOn: undefined,
    selector: ({ stats }) => createDiscordTimestamp(stats.accountCreation),
  },
}

export const getActiveMemberFieldsMap = (
  /** Which fields out of the opt in fields that are active */
  activeOptInFields: MemberFieldsIds[],
) => {
  const activeMemberFields: Partial<MemberFieldsConfig> = {}
  activeOptInFields.forEach((fieldId) => {
    const fieldConfig = memberFieldsConfig[fieldId]
    ;(activeMemberFields as Record<string, unknown>)[fieldId] = fieldConfig
  })

  Object.values(memberFieldsConfig).forEach((field) => {
    if (field.optIn) return // Already taken care of above
    if (field.dependsOn && !activeMemberFields[field.dependsOn]) {
      return // The field this one depends on has not been activated above
    }
    ;(activeMemberFields as Record<string, unknown>)[field.id] = field
  })

  return activeMemberFields
}

export const getActiveMemberFields = (
  /** Which fields out of the opt in fields that are active */
  activeOptInFields: MemberFieldsIds[],
) => {
  return Object.values(getActiveMemberFieldsMap(activeOptInFields))
}
