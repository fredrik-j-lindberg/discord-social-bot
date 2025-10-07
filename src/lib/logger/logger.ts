import pino, { type DestinationStream, type TransportTargetOptions } from "pino"

import { getConsolePrettyTarget } from "./consoleTarget"
import { getDiscordTargets } from "./discordTargets"

const staticTargets = [getConsolePrettyTarget(), ...getDiscordTargets()]

const getTransport = (targets: TransportTargetOptions[]) => {
  return pino.transport({ targets }) as DestinationStream
}

export const logger = pino({ level: "debug" }, getTransport(staticTargets))
