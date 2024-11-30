import { initDiscordClient } from "./client";
import { registerCronJobs } from "./cron/cronJobs";
import { logger } from "./lib/logger";
import { initDatabase } from "./lib/database/client";

(async () => {
  await initDatabase();
  await initDiscordClient();
  registerCronJobs();
  logger.info("Bot successfully initialized & logged in");
})().catch((err) => {
  logger.error(err, "Failed to initialize bot");
});
