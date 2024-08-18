import type { PiiFieldName } from "~/modals/piiModal";

type GuildConfig = {
  guildId: string;
  piiFields: PiiFieldName[] | "all";
  channelIds: {
    birthdayWishes: string;
  };
};
export const guildConfigs: { [guildId: string]: GuildConfig } = {
  // Local bot testing
  "1211309484811485264": {
    guildId: "1211309484811485264",
    piiFields: "all",
    channelIds: {
      /** Where to wish users happy birthday */
      birthdayWishes: "1216485497501908992", // #dora-test
    },
  },
  // Climbing (Dora the Explorer)
  "1193809867232772126": {
    guildId: "1193809867232772126",
    piiFields: ["birthdayInput"],
    channelIds: {
      birthdayWishes: "1193989101599326259", // #all-chat
    },
  },
  // Eithon
  "106099890320330752": {
    guildId: "106099890320330752",
    piiFields: ["birthdayInput", "firstNameInput", "heightInput"],
    channelIds: {
      birthdayWishes: "106099890320330752", // #general
    },
  },
};
