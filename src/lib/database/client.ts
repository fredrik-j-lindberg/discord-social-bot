import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres"
import type { Pool } from "pg"

import { env } from "~/env"

import { DoraException } from "../exceptions/DoraException"
import { logger } from "../logger"
import { membersTable } from "./schema"
import * as schema from "./schema"

export let db: NodePgDatabase<typeof schema> & {
  $client: Pool
}

export const initDatabase = async () => {
  try {
    db = drizzle(env.DATABASE_URL, { schema })
    await db.select().from(membersTable).limit(1)
    logger.info("Successfully initialized database")
  } catch (error) {
    throw new DoraException(
      "Failed to initialize database",
      DoraException.Type.Unknown,
      { cause: error },
    )
  }
}

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
