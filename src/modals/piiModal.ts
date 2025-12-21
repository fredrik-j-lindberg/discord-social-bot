import { TextInputStyle } from "discord.js"
import { z } from "zod/v4"

import {
  memberFieldsConfig,
  type MemberFieldsIds,
  type MemberOptInFieldIds,
} from "~/configs/memberFieldsConfig"
import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { setMemberData } from "~/lib/database/memberDataService"
import { formatDate, ukDateStringToDate } from "~/lib/helpers/date"
import type { DoraDatabaseMember } from "~/lib/helpers/member"
import {
  createDynamicModal,
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalInputConfig,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

import { getStaticGuildConfigById } from "../../guildConfigs"

type PiiModalInputConfig = ModalInputConfig<
  MemberFieldsIds,
  DoraDatabaseMember | undefined
>

const modalInputsMap = {
  [memberFieldsConfig.firstName.id]: {
    type: "text",
    id: memberFieldsConfig.firstName.id,
    label: "First name",
    getPrefilledValue: (doraMember) => doraMember?.personalInfo?.firstName,
    style: TextInputStyle.Short,
    validation: z
      .string()
      .regex(/^[a-zA-ZäöåÄÖÅ]+$/)
      .optional()
      .nullable(),
    placeholder: "John",
    isRequired: false,
  },
  [memberFieldsConfig.birthday.id]: {
    type: "text",
    id: memberFieldsConfig.birthday.id,
    label: "Birthday (DD/MM/YYYY)",
    description:
      "Feel free to set a random year if you prefer not to share your age",
    getPrefilledValue: (doraMember) =>
      formatDate(doraMember?.personalInfo?.birthday, { dateStyle: "short" }),
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
  [memberFieldsConfig.switchFriendCode.id]: {
    type: "text",
    id: memberFieldsConfig.switchFriendCode.id,
    label: "Nintendo Switch friend code",
    getPrefilledValue: (doraMember) => doraMember?.friendCodes?.switch,
    style: TextInputStyle.Short,
    placeholder: "SW-1234-5678-9012",
    validation: z
      .string()
      .regex(/SW-\d{4}-\d{4}-\d{4}/)
      .optional()
      .nullable(),
    isRequired: false,
  },
  [memberFieldsConfig.pokemonTcgpFriendCode.id]: {
    type: "text",
    id: memberFieldsConfig.pokemonTcgpFriendCode.id,
    label: "Pokémon TCGP friend code",
    getPrefilledValue: (doraMember) => doraMember?.friendCodes?.pokemonTcgp,
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
  [memberFieldsConfig.phoneNumber.id]: {
    type: "text",
    id: memberFieldsConfig.phoneNumber.id,
    label: "Phone number",
    getPrefilledValue: (doraMember) => doraMember?.personalInfo?.phoneNumber,
    placeholder: "+46712345673",
    style: TextInputStyle.Short,
    validation: z.string().max(15).optional().nullable(),
    maxLength: 15,
    isRequired: false,
  },
  [memberFieldsConfig.email.id]: {
    type: "text",
    id: memberFieldsConfig.email.id,
    label: "Email",
    getPrefilledValue: (doraMember) => doraMember?.personalInfo?.email,
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
  [memberFieldsConfig.dietaryPreferences.id]: {
    type: "text",
    id: memberFieldsConfig.dietaryPreferences.id,
    label: "Dietary preferences",
    getPrefilledValue: (doraMember) =>
      doraMember?.personalInfo?.dietaryPreferences,
    style: TextInputStyle.Short,
    placeholder: "Gluten-free, Vegan, No pork",
    validation: z.string().max(50).optional().nullable(),
    maxLength: 50,
    isRequired: false,
  },
} as const satisfies Record<MemberOptInFieldIds, PiiModalInputConfig>

const modalInputsConfig = Object.values(modalInputsMap)
const inputSchema = generateModalSchema(modalInputsMap)

interface CreateModalProps {
  guildId: string
  doraMember: DoraDatabaseMember | undefined
}
export default {
  data: { name: "memberDataModal" },
  async createModal({ guildId, doraMember }: CreateModalProps) {
    const relevantFields = getStaticGuildConfigById(guildId).optInMemberFields
    const inputConfigs: ModalInputConfig[] = modalInputsConfig.filter(
      (inputConfig) =>
        relevantFields.some(
          (fieldToExtract) => inputConfig.id === fieldToExtract,
        ),
    )

    return createDynamicModal({
      customId: this.data.name,
      title: "Member data form. Optional!",
      inputConfigs,
      modalMetadata: doraMember,
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

    const validatedInput = extractAndValidateModalValues({
      interaction,
      inputConfigs: modalInputsConfig,
      inputsToExtract: getStaticGuildConfigById(interaction.guild.id)
        .optInMemberFields,
      validationSchema: inputSchema,
    })

    await setMemberData({
      doraMember: {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        username: interaction.user.username,
        displayName: displayName ?? interaction.user.username,
        personalInfo: {
          firstName: validatedInput.firstName,
          birthday: validatedInput.birthday,
          phoneNumber: validatedInput.phoneNumber,
          email: validatedInput.email,
          dietaryPreferences: validatedInput.dietaryPreferences,
        },
        friendCodes: {
          switch: validatedInput.switchFriendCode,
          pokemonTcgp: validatedInput.pokemonTcgpFriendCode,
        },
      },
    })
    return "Your member data was submitted successfully!"
  },
} satisfies ModalData
