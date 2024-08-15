import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ModalData } from "./types";

const modalId = "userDataModal";
// https://discordjs.guide/interactions/modals.html#building-and-responding-with-modals
const createModal = () => {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("User data form. Optional!");

  const birthdayInput = new TextInputBuilder()
    .setCustomId("birthdayInput")
    .setLabel("What's your birthday? (YYYY-MM-DD)")
    .setValue("1990-01-01")
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
    await interaction.reply({
      content: "Your user data was submitted successfully!",
    });
  },
};
