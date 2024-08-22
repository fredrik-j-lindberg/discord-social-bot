import { env } from "~/env";
import { logger } from "~/lib/logger";
import type { PiiFieldName } from "~/router/modals/piiModal";

type GuildConfig = {
  guildId: string;
  piiFields: PiiFieldName[] | "all";
  birthdays: {
    // Channel to send birthday wishes in
    channelId?: string;
    // Role to add to users on their birthday
    roleId?: string;
  };
};

type GuildConfigs = { [guildId: string]: GuildConfig };

// Configurations for guilds that the local bot is in, to avoid trying to fetch data from production guilds etc
const devGuildConfigs: GuildConfigs = {
  // Local bot testing
  "1211309484811485264": {
    guildId: "1211309484811485264",
    piiFields: "all",
    birthdays: {
      channelId: "1216485497501908992", // #dora-test
      roleId: "1276262193515593780",
    },
  },
};

export const prodGuildConfigs: GuildConfigs = {
  // Climbing (Dora the Explorer)
  "1193809867232772126": {
    guildId: "1193809867232772126",
    piiFields: ["birthdayInput"],
    birthdays: {
      channelId: "1193989101599326259", // #all-chat
    },
  },
  // Eithon
  "106099890320330752": {
    guildId: "106099890320330752",
    piiFields: ["birthdayInput", "firstNameInput", "heightInput"],
    birthdays: {
      channelId: "106099890320330752", // #general
      roleId: "1276240769975324692",
    },
  },
};

logger.info({ devMode: env.USE_DEV_GUILD_CONFIGS }, "Loaded guild configs");
export const guildConfigs: GuildConfigs = env.USE_DEV_GUILD_CONFIGS
  ? devGuildConfigs
  : prodGuildConfigs;
