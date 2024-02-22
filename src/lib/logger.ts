import pino from "pino";

export const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "SYS:mm-dd-yyyy hh:mm:ss TT",
      colorize: true,
      ignore: "pid,hostname",
    },
  },
});
