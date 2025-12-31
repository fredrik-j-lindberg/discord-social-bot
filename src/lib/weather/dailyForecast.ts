import type { SmhiForecast } from "./smhiForecast"

export interface DailyForecast {
  dateKey: string // YYYY-MM-DD in Europe/Stockholm
  minTempC: number
  maxTempC: number
  precipitationMm: number
  maxWindMs: number
  maxGustMs: number
  symbol: number | undefined
}

const SWEDEN_TZ = "Europe/Stockholm"

const toSwedenDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SWEDEN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value
  if (!year || !month || !day) {
    // Fallback, should never happen
    return date.toISOString().slice(0, 10)
  }
  return `${year}-${month}-${day}`
}

const getSwedenHour = (date: Date) => {
  const hourText = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SWEDEN_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(date)
  return Number(hourText)
}

const getParam = (
  params: SmhiForecast["timeSeries"][number]["parameters"],
  name: string,
) => {
  const hit = params.find((p) => p.name === name)
  return hit?.values[0]
}

const dateAtNoonUtcFromDateKey = (dateKey: string) => {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0))
}

export const build10DayDailyForecast = ({
  forecast,
  now = new Date(),
}: {
  forecast: SmhiForecast
  now?: Date
}): DailyForecast[] => {
  const startKey = toSwedenDateKey(now)
  const startDateNoonUtc = dateAtNoonUtcFromDateKey(startKey)

  const keys = Array.from({ length: 10 }, (_, idx) => {
    const d = new Date(startDateNoonUtc)
    d.setUTCDate(d.getUTCDate() + idx)
    return toSwedenDateKey(d)
  })
  const keySet = new Set(keys)

  const byDay = new Map<
    string,
    {
      minTempC: number
      maxTempC: number
      precipitationMm: number
      maxWindMs: number
      maxGustMs: number
      symbol?: number
      symbolHourDistance?: number
    }
  >()

  for (const ts of forecast.timeSeries) {
    const date = new Date(ts.validTime)
    const dateKey = toSwedenDateKey(date)
    if (!keySet.has(dateKey)) continue

    const temp = getParam(ts.parameters, "t")
    const tp = getParam(ts.parameters, "tp")
    const wind = getParam(ts.parameters, "ws")
    const gust = getParam(ts.parameters, "gust")
    const symbol = getParam(ts.parameters, "Wsymb2")

    if (temp === undefined) continue

    const existing = byDay.get(dateKey)
    const next = existing ?? {
      minTempC: temp,
      maxTempC: temp,
      precipitationMm: 0,
      maxWindMs: 0,
      maxGustMs: 0,
    }

    next.minTempC = Math.min(next.minTempC, temp)
    next.maxTempC = Math.max(next.maxTempC, temp)

    if (typeof tp === "number") {
      next.precipitationMm += tp
    }
    if (typeof wind === "number") {
      next.maxWindMs = Math.max(next.maxWindMs, wind)
    }
    if (typeof gust === "number") {
      next.maxGustMs = Math.max(next.maxGustMs, gust)
    }

    if (typeof symbol === "number") {
      const hour = getSwedenHour(date)
      const distanceToNoon = Math.abs(hour - 12)
      if (
        next.symbol === undefined ||
        next.symbolHourDistance === undefined ||
        distanceToNoon < next.symbolHourDistance
      ) {
        next.symbol = symbol
        next.symbolHourDistance = distanceToNoon
      }
    }

    byDay.set(dateKey, next)
  }

  return keys
    .map((dateKey) => {
      const day = byDay.get(dateKey)
      if (!day) return undefined

      return {
        dateKey,
        minTempC: day.minTempC,
        maxTempC: day.maxTempC,
        precipitationMm: day.precipitationMm,
        maxWindMs: day.maxWindMs,
        maxGustMs: day.maxGustMs,
        symbol: day.symbol,
      } satisfies DailyForecast
    })
    .filter((d): d is DailyForecast => d !== undefined && d.dateKey >= startKey)
}
