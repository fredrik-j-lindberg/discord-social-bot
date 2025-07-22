import { Message, type OmitPartialGroupDMChannel } from "discord.js"

import { DoraException } from "~/lib/exceptions/DoraException"
import { logger } from "~/lib/logger"

import { importFolderModules } from "./routerHelper"

export interface MessageListener {
  data: {
    /** Name just used as context atm */
    name: string
  }
  /**
   * Function to run when a message is sent
   * @returns The reply to the message
   */
  execute: (messageEvent: OmitPartialGroupDMChannel<Message>) => null | string
}

export const getAllMessageListeners = async () => {
  return await importFolderModules<MessageListener>("messageListeners")
}

let listeners: Record<string, MessageListener> | undefined
export const initMessageListeners = async () => {
  listeners = await getAllMessageListeners()
  logger.info("Message listeners initialized")
}

/**
 * This router will run all registered message listeners, it is up to each listener
 * to verify whether or not the message is relevant to them.
 */
export const messageRouter = async (
  messageEvent: OmitPartialGroupDMChannel<Message>,
) => {
  if (!listeners) {
    throw new DoraException(
      "Message listeners not initialized",
      DoraException.Type.NotDefined,
      { severity: DoraException.Severity.Error },
    )
  }

  /**
   * The listeners should only listen for user triggered messages.
   * This also makes sure we avoid an infinite loop of a bot responding to itself
   */
  if (messageEvent.author.bot) return

  for (const listener of Object.values(listeners)) {
    const response = listener.execute(messageEvent)
    if (!response) continue

    await messageEvent.channel.send(response)
  }
}
