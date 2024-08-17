import { Command } from "./types";

export const botInfoCommand: Command = {
  name: "botinfo",
  description: "Shows basic info about the bot",
  listener: async (interaction) => {
    await interaction.reply(
      "https://github.com/fredrik-j-lindberg/discord-social-bot",
    );
  },
};
