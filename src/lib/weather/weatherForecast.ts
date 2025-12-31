import { build10DayDailyForecast, type DailyForecast } from "./dailyForecast"
import { geocodeCityInSweden, type GeoLocation } from "./geocoding"
import { fetchSmhiPointForecast } from "./smhiForecast"

export interface WeatherForecast {
  location: GeoLocation
  daily: DailyForecast[]
}

/**
 * Get a 10-day weather forecast for a city in Sweden.
 * Returns undefined if the city cannot be found.
 */
export const getWeatherForecast = async (
  city: string,
): Promise<WeatherForecast | undefined> => {
  const location = await geocodeCityInSweden(city)
  if (!location) return undefined

  const forecast = await fetchSmhiPointForecast({
    lat: location.lat,
    lon: location.lon,
  })

  const daily = build10DayDailyForecast({ forecast })

  return { location, daily }
}
