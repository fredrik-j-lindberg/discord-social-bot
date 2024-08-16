import type { PiiFieldName } from "~/modals/piiModal";

type GuildConfig = {
  guildId: string;
  piiFields: PiiFieldName[] | "all";
};
export const guildConfigs = {
  localBotTesting: {
    guildId: "1211309484811485264",
    piiFields: "all",
  },
  climbing: {
    guildId: "1193809867232772126",
    piiFields: ["birthdayInput"],
  },
  eithon: {
    guildId: "106099890320330752",
    piiFields: ["birthdayInput", "firstNameInput", "heightInput"],
  },
} satisfies Record<string, GuildConfig>;
