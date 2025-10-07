import type { TransportTargetOptions } from "pino"

export const getConsolePrettyTarget = (): TransportTargetOptions => ({
  level: "debug",
  target: "pino-pretty",
  options: {
    translateTime: "SYS:mm-dd-yyyy hh:mm:ss TT",
    colorize: true,
    ignore: "pid,hostname",
  },
})
