import { ChatInputCommandInteraction } from "discord.js";

export type Command = {
  name: string;
  description: string;
  listener: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
};
