import { TextInputStyle } from "discord.js"
import { z } from "zod/v4"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import {
  type MemberData,
  setMemberData,
} from "~/lib/database/memberDataService"
import { formatDate, ukDateStringToDate } from "~/lib/helpers/date"
import {
  createModal,
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalFieldConfig,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

import { getGuildConfigById, SUPPORTED_MEMBER_FIELDS } from "../../guildConfigs"

type PiiModalFieldConfig = Omit<ModalFieldConfig, "getPrefilledValue"> & {
  getPrefilledValue: (memberData?: MemberData) => string | null | undefined
}

const piiFieldConfigsMap = {
  [SUPPORTED_MEMBER_FIELDS.firstName]: {
    fieldName: SUPPORTED_MEMBER_FIELDS.firstName,
    label: "First name",
    getPrefilledValue: (memberData) => memberData?.firstName || "",
    style: TextInputStyle.Short,
    validation: z
      .string()
      .regex(/^[a-zA-ZäöåÄÖÅ]+$/)
      .optional()
      .nullable(),
    placeholder: "John",
    isRequired: false,
  },
  [SUPPORTED_MEMBER_FIELDS.birthday]: {
    fieldName: SUPPORTED_MEMBER_FIELDS.birthday,
    label: "Birthday (DD/MM/YYYY)",
    description:
      "Feel free to set a random year if you prefer not to share your age",
    getPrefilledValue: (memberData) =>
      formatDate(memberData?.birthday, { dateStyle: "short" }),
    style: TextInputStyle.Short,
    placeholder: "23/11/1998",
    validation: z
      .string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/)
      .transform((value) => new Date(ukDateStringToDate(value)))
      .optional()
      .nullable(),
    isRequired: false,
  },
  [SUPPORTED_MEMBER_FIELDS.switchFriendCode]: {
    fieldName: SUPPORTED_MEMBER_FIELDS.switchFriendCode,
    label: "Nintendo Switch friend code",
    getPrefilledValue: (memberData) => memberData?.switchFriendCode || "",
    style: TextInputStyle.Short,
    placeholder: "SW-1234-5678-9012",
    validation: z
      .string()
      .regex(/SW-\d{4}-\d{4}-\d{4}/)
      .optional()
      .nullable(),
    isRequired: false,
  },
  [SUPPORTED_MEMBER_FIELDS.pokemonTcgpFriendCode]: {
    fieldName: SUPPORTED_MEMBER_FIELDS.pokemonTcgpFriendCode,
    label: "Pokémon TCGP friend code",
    getPrefilledValue: (memberData) => memberData?.pokemonTcgpFriendCode || "",
    style: TextInputStyle.Short,
    placeholder: "1234-5678-9012-3456",
    validation: z
      .string()
      .regex(/\d{4}-?\d{4}-?\d{4}-?\d{4}/)
      // When the user copies their code, the dashes are not always included, so we want to allow them to
      // add their code without dashes, but then we transform the input to always have dashes on our end.
      .transform((value) => {
        const cleanedInput = value.replace(/-/g, "")
        const groups = cleanedInput.match(/.{1,4}/g)
        return groups ? groups.join("-") : ""
      })
      .optional()
      .nullable(),
    isRequired: false,
  },
  [SUPPORTED_MEMBER_FIELDS.phoneNumber]: {
    fieldName: SUPPORTED_MEMBER_FIELDS.phoneNumber,
    label: "Phone number",
    getPrefilledValue: (memberData) => memberData?.phoneNumber,
    placeholder: "+46712345673",
    style: TextInputStyle.Short,
    validation: z.string().max(15).optional().nullable(),
    maxLength: 15,
    isRequired: false,
  },
  [SUPPORTED_MEMBER_FIELDS.email]: {
    fieldName: SUPPORTED_MEMBER_FIELDS.email,
    label: "Email",
    getPrefilledValue: (memberData) => memberData?.email,
    style: TextInputStyle.Short,
    placeholder: "example@example.com",
    validation: z
      .string()
      .regex(
        // https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
        // eslint-disable-next-line no-control-regex
        /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
      )
      .optional()
      .nullable(),
    isRequired: false,
  },
  [SUPPORTED_MEMBER_FIELDS.dietaryPreferences]: {
    fieldName: SUPPORTED_MEMBER_FIELDS.dietaryPreferences,
    label: "Dietary preferences",
    getPrefilledValue: (memberData) => memberData?.dietaryPreferences,
    style: TextInputStyle.Short,
    placeholder: "Gluten-free, Vegan, No pork",
    validation: z.string().max(50).optional().nullable(),
    maxLength: 50,
    isRequired: false,
  },
} as const satisfies Record<string, PiiModalFieldConfig>

const piiFieldConfigs = Object.values(piiFieldConfigsMap)
const piiModalInputSchema = generateModalSchema(piiFieldConfigsMap)

interface CreateModalProps {
  guildId: string
  memberData: MemberData | undefined
}
export default {
  data: { name: "memberDataModal" },
  createModal({ guildId, memberData }: CreateModalProps) {
    return createModal({
      modalId: this.data.name,
      title: "Member data form. Optional!",
      fieldConfigs: piiFieldConfigs,
      fieldsToGenerate: getGuildConfigById(guildId).optInMemberFields,
      modalMetaData: memberData,
    })
  },
  deferReply: true,
  handleSubmit: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    )
    const displayName =
      interaction.member && "displayName" in interaction.member
        ? interaction.member.displayName
        : null

    const inputParsing = extractAndValidateModalValues({
      interaction,
      fieldConfigs: piiFieldConfigs,
      fieldsToExtract: getGuildConfigById(interaction.guild.id)
        .optInMemberFields,
      validationSchema: piiModalInputSchema,
    })

    if (!inputParsing.success) {
      const errorMessage = z.prettifyError(inputParsing.error)
      return errorMessage
    }
    const validatedInput = inputParsing.data

    await setMemberData({
      memberData: {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        username: interaction.user.username,
        displayName,
        firstName: validatedInput.firstName,
        birthday: validatedInput.birthday,
        phoneNumber: validatedInput.phoneNumber,
        email: validatedInput.email,
        switchFriendCode: validatedInput.switchFriendCode,
        pokemonTcgpFriendCode: validatedInput.pokemonTcgpFriendCode,
        dietaryPreferences: validatedInput.dietaryPreferences,
      },
    })
    return "Your member data was submitted successfully!"
  },
} satisfies ModalData
