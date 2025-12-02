import { ModalBuilder, TextInputStyle } from "discord.js"
import { z } from "zod/v4"

import type { DoraMemberFields } from "~/configs/memberFieldsConfig"
import { allMemberFieldsConfig } from "~/configs/memberFieldsConfig"
import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import {
  type MemberData,
  setMemberData,
} from "~/lib/database/memberDataService"
import { formatDate, ukDateStringToDate } from "~/lib/helpers/date"
import {
  composeModalInputs,
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalInputConfig,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

import { getStaticGuildConfigById } from "../../guildConfigs"

type PiiModalInputConfig = ModalInputConfig<
  DoraMemberFields,
  MemberData | undefined
>

const modalInputsMap = {
  [allMemberFieldsConfig.firstName.name]: {
    type: "text",
    id: allMemberFieldsConfig.firstName.name,
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
  [allMemberFieldsConfig.birthday.name]: {
    type: "text",
    id: allMemberFieldsConfig.birthday.name,
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
  [allMemberFieldsConfig.switchFriendCode.name]: {
    type: "text",
    id: allMemberFieldsConfig.switchFriendCode.name,
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
  [allMemberFieldsConfig.pokemonTcgpFriendCode.name]: {
    type: "text",
    id: allMemberFieldsConfig.pokemonTcgpFriendCode.name,
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
  [allMemberFieldsConfig.phoneNumber.name]: {
    type: "text",
    id: allMemberFieldsConfig.phoneNumber.name,
    label: "Phone number",
    getPrefilledValue: (memberData) => memberData?.phoneNumber,
    placeholder: "+46712345673",
    style: TextInputStyle.Short,
    validation: z.string().max(15).optional().nullable(),
    maxLength: 15,
    isRequired: false,
  },
  [allMemberFieldsConfig.email.name]: {
    type: "text",
    id: allMemberFieldsConfig.email.name,
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
  [allMemberFieldsConfig.dietaryPreferences.name]: {
    type: "text",
    id: allMemberFieldsConfig.dietaryPreferences.name,
    label: "Dietary preferences",
    getPrefilledValue: (memberData) => memberData?.dietaryPreferences,
    style: TextInputStyle.Short,
    placeholder: "Gluten-free, Vegan, No pork",
    validation: z.string().max(50).optional().nullable(),
    maxLength: 50,
    isRequired: false,
  },
} as const satisfies Partial<Record<DoraMemberFields, PiiModalInputConfig>>

const modalInputsConfig = Object.values(modalInputsMap)
const inputSchema = generateModalSchema(modalInputsMap)

interface CreateModalProps {
  guildId: string
  memberData: MemberData | undefined
}
export default {
  data: { name: "memberDataModal" },
  async createModal({ guildId, memberData }: CreateModalProps) {
    const modal = new ModalBuilder()
      .setCustomId(this.data.name)
      .setTitle("Member data form. Optional!")

    const relevantFields = getStaticGuildConfigById(guildId).optInMemberFields
    const inputsToGenerateConfig: ModalInputConfig[] = modalInputsConfig.filter(
      (inputConfig) =>
        relevantFields.some(
          (fieldToExtract) => inputConfig.id === fieldToExtract,
        ),
    )

    const composedInputs = await composeModalInputs(
      inputsToGenerateConfig,
      memberData,
    )
    modal.addLabelComponents(...composedInputs)

    return modal
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
