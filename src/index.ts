import { loginBot } from "./client"
import { registerCronJobs } from "./cron/cronJobs"
import { registerEvents } from "./events"
import { initCommands } from "./events/interactionCreate/listeners/commandRouter"
import { initModals } from "./events/interactionCreate/listeners/modalSubmitRouter"
import { initDatabase } from "./lib/database/client"
import { logger, setDiscordLoggers } from "./lib/logger"

const initDiscordFeatures = async () => {
  await initCommands()
  await initModals()
  await registerEvents()
  await loginBot()
  const logConfigs = setDiscordLoggers()
  logConfigs.forEach(({ guildId, levelThreshold }) => {
    logger.info(
      { guildId },
      `Bot started and logging is enabled for guild \`${guildId}\` with level threshold \`${levelThreshold}\``,
    )
  })

  process.on("SIGINT", function () {
    logConfigs.forEach(({ guildId }) => {
      logger.info(
        { guildId },
        `Gracefully shutting down after receiving shutdown signal (SIGINT)`,
      )
    })
    process.exit()
  })
}

;(async () => {
  await initDatabase()
  await initDiscordFeatures()
  registerCronJobs()
  logger.info("Bot successfully initialized")
})().catch((err: unknown) => {
  logger.error(err, "Failed to initialize bot")
})
