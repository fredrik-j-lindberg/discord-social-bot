import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  extractChannelIdFromEventDescription,
  extractLatestReminderFromEventDescription,
  extractRoleIdFromEventDescription,
  extractShouldRemindFromEventDescription,
  setLatestReminderAtInEventDescription,
} from "./eventDescriptionUtils"

describe("scheduled event description utils", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("extracts roleId, channelId, boolean and latestReminderAt", () => {
    const scheduledEvent = {
      description:
        'roleId="123"\nchannelId="456"\nshouldRemind="true"\nlatestReminderAt="1700000000000"',
      setDescription: vi.fn(),
    }

    expect(extractRoleIdFromEventDescription(scheduledEvent)).toBe("123")
    expect(extractChannelIdFromEventDescription(scheduledEvent)).toBe("456")
    expect(extractShouldRemindFromEventDescription(scheduledEvent)).toBe(true)
    expect(extractLatestReminderFromEventDescription(scheduledEvent)).toBe(
      1700000000000,
    )
  })

  it("returns defaults when fields are absent", () => {
    const scheduledEvent = { description: "", setDescription: vi.fn() }
    expect(extractRoleIdFromEventDescription(scheduledEvent)).toBeUndefined()
    expect(extractChannelIdFromEventDescription(scheduledEvent)).toBeUndefined()
    expect(extractShouldRemindFromEventDescription(scheduledEvent)).toBe(false)
    expect(
      extractLatestReminderFromEventDescription(scheduledEvent),
    ).toBeUndefined()
  })

  it("sets latestReminderAt by replacing an existing line", async () => {
    const scheduledEvent = {
      description: 'roleId="123"\nlatestReminderAt="111"',
      setDescription: vi.fn(),
    }
    await setLatestReminderAtInEventDescription(scheduledEvent)
    expect(scheduledEvent.setDescription).toHaveBeenCalledWith(
      `roleId="123"\nlatestReminderAt="${Date.now()}"`,
    )
  })

  it("sets latestReminderAt by appending when missing", async () => {
    const scheduledEvent = {
      description: 'roleId="123"',
      setDescription: vi.fn(),
    }
    await setLatestReminderAtInEventDescription(scheduledEvent)
    expect(scheduledEvent.setDescription).toHaveBeenCalledWith(
      `roleId="123"\nlatestReminderAt="${Date.now()}"`,
    )
  })
})
