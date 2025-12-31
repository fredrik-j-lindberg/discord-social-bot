import { z } from "zod"

import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { fetchJson } from "~/lib/helpers/fetch/fetchWrapper"
import { TtlCache } from "~/lib/helpers/ttlCache"

export interface GeoLocation {
  name: string
  lat: number
  lon: number
}

const nominatimResponseSchema = z.array(
  z.object({
    display_name: z.string(),
    lat: z.string(),
    lon: z.string(),
    address: z
      .object({
        country_code: z.string().optional(),
      })
      .optional(),
  }),
)

type NominatimResponse = z.infer<typeof nominatimResponseSchema>

const cache = new TtlCache<string, GeoLocation | null>(7 * 24 * 60 * 60 * 1000)

const normalizeCityQuery = (city: string) => city.trim().toLowerCase()

export const geocodeCityInSweden = async (city: string) => {
  const normalized = normalizeCityQuery(city)
  const cached = cache.get(normalized)
  if (cached !== undefined) return cached ?? undefined

  const params = new URLSearchParams({
    format: "jsonv2",
    q: city,
    countrycodes: "se",
    limit: "1",
    addressdetails: "1",
  })

  const result = await fetchJson<NominatimResponse>({
    baseUrl: "https://nominatim.openstreetmap.org",
    path: `/search?${params.toString()}`,
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    responseSchema: nominatimResponseSchema,
    timeout: 10_000,
    meta: { integration: "nominatim", city },
  })

  if (!result.success) {
    if (result.status === 429) {
      throw new DoraUserException(
        "Geocoding service is rate limited right now. Try again in a bit.",
        { severity: DoraUserException.Severity.Info },
      )
    }

    throw new DoraUserException(
      "Failed to look up that city. Try again later.",
      { severity: DoraUserException.Severity.Info },
    )
  }

  const first = result.data[0]
  const location: GeoLocation | null = first
    ? {
        name: first.display_name,
        lat: Number(first.lat),
        lon: Number(first.lon),
      }
    : null

  cache.set(normalized, location)
  return location ?? undefined
}
