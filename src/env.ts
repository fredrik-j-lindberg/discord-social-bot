import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_BOT_CLIENT_ID: z.string(),
    AIRTABLE_API_KEY: z.string(),
    USE_DEV_GUILD_CONFIGS: z
      .string()
      // only allow "true" or "false"
      .refine((s) => s === "true" || s === "false")
      // transform to boolean
      .transform((s) => s === "true")
      .optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
