import type { TransportTargetOptions } from "pino"

export const getFileTarget = (
  destination = "./logs/app.log",
): TransportTargetOptions => ({
  level: "debug",
  target: "pino/file",
  options: {
    destination,
    mkdir: true,
  },
})
