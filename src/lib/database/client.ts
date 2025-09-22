import { drizzle } from "drizzle-orm/node-postgres"

import { env } from "~/env"

import { DoraException } from "../exceptions/DoraException"
import { logger } from "../logger"
import { membersTable } from "./schema"

export let db: ReturnType<typeof drizzle>
export const initDatabase = async () => {
  try {
    db = drizzle(env.DATABASE_URL)
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
