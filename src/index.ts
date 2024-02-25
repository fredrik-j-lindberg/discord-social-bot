import { registerEvents } from "./events";
import { login } from "./events/client";
import { logger } from "./lib/logger";

(async () => {
  registerEvents();
  await login();
})().catch((err) => {
  logger.error(err, "Failed to initialize bot");
});
