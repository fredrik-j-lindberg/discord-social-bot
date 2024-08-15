import { registerEvents } from "./events";
import { client } from "./client";
import { registerCronJobs } from "./cron/cronJobs";
import { logger } from "./lib/logger";
import { env } from "./env";

(async () => {
  registerEvents();
  registerCronJobs();
  await client.login(env.DISCORD_BOT_TOKEN);
})().catch((err) => {
  logger.error(err, "Failed to initialize bot");
});
