import pino from "pino";

export const logger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "SYS:mm-dd-yyyy hh:mm:ss TT",
      colorize: true,
      ignore: "pid,hostname",
    },
  },
});
