import type { ClientEvents } from "discord.js"

import { client } from "~/client"
import { actionWrapper } from "~/lib/actionWrapper"
import { importFolderModules } from "~/lib/helpers/folder"

export interface EventListener<TEvent extends keyof ClientEvents> {
  data: {
    /** Name used as keys for the listeners and for context (logging etc) */
    name: string
  }
  execute: (...args: ClientEvents[TEvent]) => Promise<void> | void
}

interface RegisterEventParams<TEvent extends keyof ClientEvents> {
  /** Discord event to listen for */
  event: TEvent
  /** Callback that will be called when the event is triggered */
  listener: EventListener<TEvent>
  /** Selector that picks relevant data from event to serve as context for logs */
  metadataSelector?: (
    ...args: ClientEvents[TEvent]
  ) => Record<string, string | null | undefined>
}

export const registerEventListener = <TEvent extends keyof ClientEvents>({
  event,
  listener,
  metadataSelector,
}: RegisterEventParams<TEvent>) => {
  client.on(event, (...eventArgs) => {
    const metadata = metadataSelector?.(...eventArgs) || {}

    void actionWrapper({
      action: () => listener.execute(...eventArgs),
      meta: { ...metadata, event: String(event) },
      actionDescription: "Handle discord.js event",
      swallowError: true,
    })
  })
}

type RegisterEventListenersParams<TEvent extends keyof ClientEvents> = Omit<
  RegisterEventParams<TEvent>,
  "listener"
> & {
  /** Callback that will be called when the event is triggered */
  listenerFolder: string
}

/**
 * This will setup all listeners relevant to the event,
 * it is up to each listener to verify whether or not the event is relevant to them.
 *
 * It wraps each listener in an actionWrapper to handle errors and logging
 */
export const registerEventListeners = async <
  TEvent extends keyof ClientEvents,
>({
  event,
  listenerFolder,
  metadataSelector,
}: RegisterEventListenersParams<TEvent>) => {
  const listenerModules =
    await importFolderModules<EventListener<typeof event>>(listenerFolder)

  for (const listener of Object.values(listenerModules)) {
    registerEventListener({ event, listener, metadataSelector })
  }
}
