import { type ClientEvents, Events } from "discord.js"

import { registerEvent } from "~/lib/discord/events/registerEvent"
import { importFolderModules } from "~/lib/helpers/folder"

const event = Events.GuildMemberUpdate

export interface UserUpdateListener {
  data: {
    /** Name just used as context atm */
    name: string
  }
  /**
   * Function to run when a user is updated
   */
  execute: (...args: ClientEvents[typeof event]) => Promise<void> | void
}

export const getAllListeners = async () => {
  return await importFolderModules<UserUpdateListener>(
    `${import.meta.dirname}/listeners`,
  )
}

/**
 * This will setup all listeners relevant to the event,
 * it is up to each listener to verify whether or not the event is relevant to them.
 */
export const registerUserUpdatedEvent = async () => {
  const listeners = await getAllListeners()

  registerEvent({
    event,
    listener: async (oldMember, newMember) => {
      for (const listener of Object.values(listeners)) {
        await listener.execute(oldMember, newMember)
      }
    },
    metadataSelector: (_oldMember, newMember) => ({
      user: newMember.user.tag,
    }),
  })
}
