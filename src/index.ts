import { initDiscordClient } from "./client"
import { registerCronJobs } from "./cron/cronJobs"
import { initDatabase } from "./lib/database/client"
import { logger } from "./lib/logger"
;(async () => {
  await initDatabase()
  await initDiscordClient()
  registerCronJobs()
  logger.info("Bot successfully initialized & logged in")
})().catch((err: unknown) => {
  logger.error(err, "Failed to initialize bot")
})
