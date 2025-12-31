import type { ChatInputCommandInteraction } from "discord.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { getWeatherForecast, type WeatherForecast } from "~/lib/weather"

import weatherCommand from "./weather"

vi.mock("~/lib/weather")

const mockGetWeatherForecast = vi.mocked(getWeatherForecast)

const createMockInteraction = (city: string | null) =>
  ({
    options: {
      getString: vi.fn().mockImplementation((name: string) => {
        if (name === "city") return city
        return null
      }),
    },
  }) as unknown as ChatInputCommandInteraction

describe("weather command", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should throw if city option is missing", async () => {
    const interaction = createMockInteraction(null)

    await expect(weatherCommand.execute(interaction)).rejects.toThrow(
      DoraUserException,
    )
    await expect(weatherCommand.execute(interaction)).rejects.toThrow(
      "Required 'city' option is missing",
    )
  })

  it("should throw if city is not found", async () => {
    mockGetWeatherForecast.mockResolvedValue(undefined)
    const interaction = createMockInteraction("UnknownCity")

    await expect(weatherCommand.execute(interaction)).rejects.toThrow(
      DoraUserException,
    )
    await expect(weatherCommand.execute(interaction)).rejects.toThrow(
      "Could not find 'UnknownCity' in Sweden",
    )
  })

  it("should throw if no forecast data is available", async () => {
    mockGetWeatherForecast.mockResolvedValue({
      location: { name: "Stockholm", lat: 59.33, lon: 18.07 },
      daily: [],
    })
    const interaction = createMockInteraction("Stockholm")

    await expect(weatherCommand.execute(interaction)).rejects.toThrow(
      DoraUserException,
    )
    await expect(weatherCommand.execute(interaction)).rejects.toThrow(
      "No forecast data available",
    )
  })

  it("should return paginated forecast pages on success", async () => {
    const mockForecast: WeatherForecast = {
      location: { name: "Stockholm, Sweden", lat: 59.33, lon: 18.07 },
      daily: [
        {
          dateKey: "2025-12-31",
          minTempC: -5,
          maxTempC: 2,
          precipitationMm: 0.5,
          maxWindMs: 8,
          maxGustMs: 12,
          symbol: 3,
        },
        {
          dateKey: "2026-01-01",
          minTempC: -3,
          maxTempC: 1,
          precipitationMm: 2.0,
          maxWindMs: 10,
          maxGustMs: 15,
          symbol: 18,
        },
      ],
    }
    mockGetWeatherForecast.mockResolvedValue(mockForecast)
    const interaction = createMockInteraction("Stockholm")

    const result = await weatherCommand.execute(interaction)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result.length).toBeGreaterThan(0)
    }
  })
})
