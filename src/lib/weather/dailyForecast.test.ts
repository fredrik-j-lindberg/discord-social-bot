import { describe, expect, it } from "vitest"

import { build10DayDailyForecast } from "./dailyForecast"
import type { SmhiForecast } from "./smhiForecast"

const createTimeSeries = ({
  validTime,
  temp,
  precipitation,
  wind,
  gust,
  symbol,
}: {
  validTime: string
  temp: number
  precipitation?: number
  wind?: number
  gust?: number
  symbol?: number
}): SmhiForecast["timeSeries"][number] => ({
  validTime,
  parameters: [
    { name: "t", values: [temp] },
    ...(precipitation !== undefined
      ? [{ name: "tp", values: [precipitation] }]
      : []),
    ...(wind !== undefined ? [{ name: "ws", values: [wind] }] : []),
    ...(gust !== undefined ? [{ name: "gust", values: [gust] }] : []),
    ...(symbol !== undefined ? [{ name: "Wsymb2", values: [symbol] }] : []),
  ],
})

const createForecast = (
  timeSeries: SmhiForecast["timeSeries"],
): SmhiForecast => ({
  approvedTime: "2025-12-31T00:00:00Z",
  referenceTime: "2025-12-31T00:00:00Z",
  timeSeries,
})

describe("build10DayDailyForecast", () => {
  const now = new Date("2025-12-31T12:00:00Z")

  it("should return empty array when no time series data", () => {
    const forecast = createForecast([])
    const result = build10DayDailyForecast({ forecast, now })
    expect(result).toEqual([])
  })

  it("should aggregate min and max temperatures for a day", () => {
    const forecast = createForecast([
      createTimeSeries({ validTime: "2025-12-31T06:00:00Z", temp: -5 }),
      createTimeSeries({ validTime: "2025-12-31T12:00:00Z", temp: 2 }),
      createTimeSeries({ validTime: "2025-12-31T18:00:00Z", temp: -2 }),
    ])

    const result = build10DayDailyForecast({ forecast, now })

    expect(result).toHaveLength(1)
    expect(result[0]?.minTempC).toBe(-5)
    expect(result[0]?.maxTempC).toBe(2)
  })

  it("should sum precipitation across all time points in a day", () => {
    const forecast = createForecast([
      createTimeSeries({
        validTime: "2025-12-31T06:00:00Z",
        temp: 0,
        precipitation: 1.5,
      }),
      createTimeSeries({
        validTime: "2025-12-31T12:00:00Z",
        temp: 0,
        precipitation: 2.0,
      }),
      createTimeSeries({
        validTime: "2025-12-31T18:00:00Z",
        temp: 0,
        precipitation: 0.5,
      }),
    ])

    const result = build10DayDailyForecast({ forecast, now })

    expect(result[0]?.precipitationMm).toBe(4.0)
  })

  it("should pick max wind and gust values", () => {
    const forecast = createForecast([
      createTimeSeries({
        validTime: "2025-12-31T06:00:00Z",
        temp: 0,
        wind: 5,
        gust: 8,
      }),
      createTimeSeries({
        validTime: "2025-12-31T12:00:00Z",
        temp: 0,
        wind: 10,
        gust: 15,
      }),
      createTimeSeries({
        validTime: "2025-12-31T18:00:00Z",
        temp: 0,
        wind: 7,
        gust: 12,
      }),
    ])

    const result = build10DayDailyForecast({ forecast, now })

    expect(result[0]?.maxWindMs).toBe(10)
    expect(result[0]?.maxGustMs).toBe(15)
  })

  it("should select weather symbol closest to noon", () => {
    const forecast = createForecast([
      createTimeSeries({
        validTime: "2025-12-31T06:00:00Z",
        temp: 0,
        symbol: 1, // 6 hours from noon
      }),
      createTimeSeries({
        validTime: "2025-12-31T11:00:00Z",
        temp: 0,
        symbol: 3, // 1 hour from noon - should be selected
      }),
      createTimeSeries({
        validTime: "2025-12-31T18:00:00Z",
        temp: 0,
        symbol: 18, // 6 hours from noon
      }),
    ])

    const result = build10DayDailyForecast({ forecast, now })

    expect(result[0]?.symbol).toBe(3)
  })

  it("should return up to 10 days of forecasts", () => {
    const timeSeries: SmhiForecast["timeSeries"] = []
    for (let day = 0; day < 15; day++) {
      const date = new Date(now)
      date.setUTCDate(date.getUTCDate() + day)
      timeSeries.push(
        createTimeSeries({
          validTime: date.toISOString(),
          temp: 10 + day,
        }),
      )
    }

    const forecast = createForecast(timeSeries)
    const result = build10DayDailyForecast({ forecast, now })

    expect(result.length).toBeLessThanOrEqual(10)
  })

  it("should not include days before now", () => {
    const forecast = createForecast([
      createTimeSeries({ validTime: "2025-12-30T12:00:00Z", temp: -10 }), // yesterday
      createTimeSeries({ validTime: "2025-12-31T12:00:00Z", temp: 5 }), // today
    ])

    const result = build10DayDailyForecast({ forecast, now })

    expect(result).toHaveLength(1)
    expect(result[0]?.dateKey).toBe("2025-12-31")
  })

  it("should group data correctly across multiple days", () => {
    const forecast = createForecast([
      createTimeSeries({ validTime: "2025-12-31T12:00:00Z", temp: 0 }),
      createTimeSeries({ validTime: "2026-01-01T12:00:00Z", temp: 5 }),
      createTimeSeries({ validTime: "2026-01-02T12:00:00Z", temp: 10 }),
    ])

    const result = build10DayDailyForecast({ forecast, now })

    expect(result).toHaveLength(3)
    expect(result[0]?.dateKey).toBe("2025-12-31")
    expect(result[1]?.dateKey).toBe("2026-01-01")
    expect(result[2]?.dateKey).toBe("2026-01-02")
  })
})
