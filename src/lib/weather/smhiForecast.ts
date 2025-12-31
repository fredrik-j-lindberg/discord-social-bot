import { z } from "zod"

import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { fetchJson } from "~/lib/helpers/fetch/fetchWrapper"
import { TtlCache } from "~/lib/helpers/ttlCache"

const smhiForecastSchema = z.object({
  approvedTime: z.string(),
  referenceTime: z.string(),
  timeSeries: z.array(
    z.object({
      validTime: z.string(),
      parameters: z.array(
        z.object({
          name: z.string(),
          values: z.array(z.number()),
        }),
      ),
    }),
  ),
})

export type SmhiForecast = z.infer<typeof smhiForecastSchema>

const cache = new TtlCache<string, SmhiForecast>(15 * 60 * 1000)

const roundCoord = (n: number) => Math.round(n * 10000) / 10000

export const fetchSmhiPointForecast = async ({
  lat,
  lon,
}: {
  lat: number
  lon: number
}): Promise<SmhiForecast> => {
  const roundedLat = roundCoord(lat)
  const roundedLon = roundCoord(lon)
  const cacheKey = `${roundedLat},${roundedLon}`

  const cached = cache.get(cacheKey)
  if (cached) return cached

  const result = await fetchJson<SmhiForecast>({
    baseUrl: "https://opendata-download-metfcst.smhi.se",
    path: `/api/category/pmp3g/version/2/geotype/point/lon/${roundedLon}/lat/${roundedLat}/data.json`,
    method: "GET",
    headers: { Accept: "application/json" },
    responseSchema: smhiForecastSchema,
    timeout: 10_000,
    meta: { integration: "smhi", lat: roundedLat, lon: roundedLon },
  })

  if (!result.success) {
    throw new DoraUserException(
      "Failed to fetch SMHI forecast right now. Try again later.",
      { severity: DoraUserException.Severity.Info },
    )
  }

  const forecast = result.data
  cache.set(cacheKey, forecast)
  return forecast
}
