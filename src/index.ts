import { loginBot } from "./client"
import { registerCronJobs } from "./cron/cronJobs"
import { registerEvents } from "./events"
import { initCommands } from "./events/interactionCreate/listeners/commandRouter"
import { initModals } from "./events/interactionCreate/listeners/modalSubmitRouter"
import { initDatabase } from "./lib/database/client"
import { logger } from "./lib/logger"

const initDiscordFeatures = async () => {
  await initCommands()
  await initModals()
  await registerEvents()
  await loginBot()
}

;(async () => {
  await initDatabase()
  await initDiscordFeatures()
  registerCronJobs()
  logger.info("Bot successfully initialized & logged in")
})().catch((err: unknown) => {
  logger.error(err, "Failed to initialize bot")
})
