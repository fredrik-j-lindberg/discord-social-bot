import { createEnv } from "@t3-oss/env-core"
import { z } from "zod/v4"

const booleanSchema = z
  .string()
  // only allow "true" or "false"
  .refine((s) => s === "true" || s === "false")
  // transform to boolean
  .transform((s) => s === "true")

export const env = createEnv({
  server: {
    APP_ENV: z.enum(["development", "production"]),
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_BOT_CLIENT_ID: z.string(),
    DATABASE_URL: z.string(),
    USE_DEV_GUILD_CONFIGS: booleanSchema.optional(),
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
