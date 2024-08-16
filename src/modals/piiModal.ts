import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ModalData } from "./types";
import { assertHasDefinedProperty } from "~/lib/validation";
import { setUserData } from "~/lib/airtable/userData";
import { UserData } from "~/lib/airtable/types";
import { formatDate } from "~/lib/helpers/date";

const modalId = "userDataModal";
const fieldNames = { birthday: "birthdayInput" };

// https://discordjs.guide/interactions/modals.html#building-and-responding-with-modals
const createModal = (userData: UserData | undefined) => {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("User data form. Optional!");

  const birthdayInput = new TextInputBuilder()
    .setCustomId(fieldNames.birthday)
    .setLabel("What's your birthday? (YYYY-MM-DD)")
    .setValue(
      formatDate(userData?.birthday, { dateStyle: "short" }) || "1990-01-01",
    )
    .setStyle(TextInputStyle.Short);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    birthdayInput,
  );

  modal.addComponents(firstActionRow);
  return modal;
};

export const piiModal: ModalData = {
  id: modalId,
  createModal,
  listener: async (interaction) => {
    await interaction.deferReply();
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    );
    const nickname =
      interaction.member && "nickname" in interaction.member
        ? interaction.member.nickname
        : undefined;

    await setUserData({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      userData: {
        birthday: interaction.fields.getTextInputValue(fieldNames.birthday),
        username: interaction.user.username,
        nickname: nickname || undefined,
      },
    });
    await interaction.editReply({
      content: "Your user data was submitted successfully!",
    });
  },
};
