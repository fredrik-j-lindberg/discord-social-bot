import { eq } from "drizzle-orm"
import type { Level } from "pino"
import { z } from "zod"

import { actionWrapper } from "../actionWrapper"
import { logger } from "../logger"
import { db } from "./client"
import {
  type GuildConfigRecord,
  type GuildConfigRecordInsert,
  guildConfigsTable,
} from "./schema"

const logLevelSchema = z.enum([
  // Debug and trace levels are currently not supported, as it would spam too much and would require filtering logic to avoid loops
  "info",
  "warn",
  "error",
  "fatal",
] satisfies Level[])

const guildConfigLogsSchema = z.object({
  /** Discord channel webhook for sending messages */
  webhookUrl: z.url(),
  /** Log level to send to Discord. E.g. "warn" will send warning logs and above to Discord (not info and debug) */
  levelThreshold: logLevelSchema,
})

const guildConfigInactivitySchema = z.object({
  /** Number of days of inactivity before a user is considered inactive and will receive a notice */
  daysUntilInactive: z.number().int().positive(),
  /** Once the user is marked as inactive, this is the number of days until they are kicked */
  daysAsInactiveBeforeKick: z.number().int().positive(),
  /** Optional invite link to include in kick notice, allowing the user to rejoin easily */
  inviteLink: z.url().optional(),
  /** Optional role to assign to inactive users */
  inactiveRoleId: z.string().optional(),
})

const guildConfigDataSchema = z.object({
  /** Configuration for logging, leave out of guild config to disable logging */
  logs: guildConfigLogsSchema.optional(),
  /** Configuration for inactivity monitoring, leave out of guild config to disable monitoring */
  inactivity: guildConfigInactivitySchema.optional(),
})

/** All the values that can be configured for the guild */
export type GuildConfigData = z.infer<typeof guildConfigDataSchema>

/** The complete guild configuration including e.g. id fields that can not be configured */
export type GuildConfig = GuildConfigData & {
  id: string
  guildId: string
}

const parseConfigField = (
  guildId: string,
  configData: unknown,
): GuildConfigData | undefined => {
  if (!configData) return undefined

  const configParsing = guildConfigDataSchema.safeParse(configData)

  if (!configParsing.success) {
    logger.error(
      { error: configParsing.error, guildId },
      "Failed to parse guild config data",
    )
  }

  return configParsing.data
}

const mapRecordToGuildConfig = (
  record: GuildConfigRecord | undefined,
): GuildConfig | undefined => {
  if (!record) return undefined

  const configData = parseConfigField(record.guildId, record.config)

  return {
    id: record.id,
    guildId: record.guildId,
    ...configData,
  }
}

// In-memory cache for guild configs
const guildConfigCache = new Map<string, GuildConfig | undefined>()

/**
 * Clears the cache for a specific guild or all guilds
 */
const clearGuildConfigCache = (guildId?: string) => {
  if (guildId) {
    guildConfigCache.delete(guildId)
    logger.debug({ guildId }, "Cleared guild config cache for guild")
  } else {
    guildConfigCache.clear()
    logger.debug("Cleared all guild config cache")
  }
}

/**
 * Fetches guild config from the cache or database
 * Returns undefined if no config exists for the guild
 */
export const getGuildConfig = async (
  guildId: string,
): Promise<GuildConfig | undefined> => {
  // Check cache first
  if (guildConfigCache.has(guildId)) {
    logger.debug({ guildId }, "Guild config cache hit")
    return guildConfigCache.get(guildId)
  }

  return actionWrapper({
    action: async () => {
      const record = await db.query.guildConfigsTable.findFirst({
        where: eq(guildConfigsTable.guildId, guildId),
      })

      const config = mapRecordToGuildConfig(record)

      // Store in cache
      guildConfigCache.set(guildId, config)

      return config
    },
    actionDescription: "Get guild config from database",
    meta: { guildId },
  })
}

/**
 * Fetches all guild configs from the database
 * Returns empty array if no configs exist
 */
export const getAllGuildConfigs = async (): Promise<GuildConfig[]> => {
  return actionWrapper({
    action: async () => {
      const records = await db.query.guildConfigsTable.findMany()

      return records
        .map((record) => mapRecordToGuildConfig(record))
        .filter((config): config is GuildConfig => config !== undefined)
    },
    actionDescription: "Get all guild configs from database",
  })
}

/**
 * Updates or creates the entire guild configuration
 * Replaces the entire config JSONB field
 * Automatically invalidates the cache for this guild
 */
export const upsertGuildConfig = async (
  guildId: string,
  config: GuildConfigData,
): Promise<void> => {
  return actionWrapper({
    action: async () => {
      // Validate the entire config
      guildConfigDataSchema.parse(config)

      const values: GuildConfigRecordInsert = {
        guildId,
        config,
      }

      await db
        .insert(guildConfigsTable)
        .values(values)
        .onConflictDoUpdate({
          target: [guildConfigsTable.guildId],
          set: {
            config: values.config,
          },
        })

      // Invalidate cache for this guild
      clearGuildConfigCache(guildId)
    },
    actionDescription: "Upsert guild config in database",
    meta: { guildId },
  })
}
