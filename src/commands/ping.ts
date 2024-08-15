import { Command } from "./types";

export const pingCommand: Command = {
  name: "ping",
  description: "Replies with Pong!",
  listener: async (interaction) => {
    await interaction.reply("Pong!");
  },
};
