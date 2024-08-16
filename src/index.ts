import { registerEvents } from "./events";
import { client } from "./client";
import { registerCronJobs } from "./cron/cronJobs";
import { logger } from "./lib/logger";
import { env } from "./env";
import { initAirtable } from "./lib/airtable/table";

(async () => {
  registerEvents();
  registerCronJobs();
  await initAirtable();
  await client.login(env.DISCORD_BOT_TOKEN);
  logger.info("Bot successfully initialized & logged in");
})().catch((err) => {
  logger.error(err, "Failed to initialize bot");
});
