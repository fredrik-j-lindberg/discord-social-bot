import { SlashCommandBuilder } from "discord.js"

import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"
import type { DoraReply } from "~/lib/discord/interaction"
import { createPages } from "~/lib/discord/message"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { getWeatherForecast } from "~/lib/weather"

const cityOptionName = "city"

const command = new SlashCommandBuilder()
  .setName("weather")
  .setDescription("Show a 10-day weather forecast")
  .setContexts(0) // Guild only
  .addStringOption((option) =>
    option
      .setName(cityOptionName)
      .setDescription("City name (e.g. Stockholm)")
      .setRequired(true),
  )
  .addBooleanOption((option) =>
    option
      .setName(ephemeralOptionName)
      .setDescription("Whether to reply silently (only visible to you)")
      .setRequired(false),
  )

const formatNumber = (n: number, decimals = 0) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n)

const formatDayLabel = (dateKey: string) => {
  // dateKey is YYYY-MM-DD
  const [y, m, d] = dateKey.split("-").map(Number)
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1))
  // Use UTC date with Sweden tz to get weekday in that zone
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(date)
}

const getWeatherIcon = (code: number | undefined) => {
  // https://opendata.smhi.se/metfcst/snow1gv1/parameters#weather-symbol
  const icons = {
    1: "☀️", // Clear sky
    2: "🌤️", // Nearly clear sky
    3: "⛅️", // Variable cloudiness
    4: "🌥️", // Halfclear sky
    5: "☁️", // Cloudy sky
    6: "☁️☁️", // Overcast
    7: "🌫️", // Fog

    8: "🌦️", // Light rain showers
    9: "🌦️🌦️", // Moderate rain showers
    10: "🌧️🌧️", // Heavy rain showers

    11: "⛈️", // Thunderstorm

    12: "🌧️❄️", // Light sleet showers
    13: "🌧️❄️🌧️", // Moderate sleet showers
    14: "🌧️❄️❄️", // Heavy sleet showers

    15: "🌨️", // Light snow showers
    16: "🌨️🌨️", // Moderate snow showers
    17: "❄️❄️❄️", // Heavy snow showers

    18: "🌧️", // Light rain
    19: "🌧️🌧️", // Moderate rain
    20: "🌧️🌧️🌧️", // Heavy rain

    21: "⚡️", // Thunder

    22: "🌧️❄️", // Light sleet
    23: "🌧️❄️🌧️", // Moderate sleet
    24: "🌧️❄️❄️", // Heavy sleet

    25: "❄️", // Light snowfall
    26: "❄️❄️", // Moderate snowfall
    27: "❄️❄️❄️", // Heavy snowfall
  }

  if (code && code in icons) {
    return icons[code as keyof typeof icons]
  }
  return `❓ (${code})`
}

export default {
  type: "chat",
  deferReply: true,
  command,
  data: { name: command.name },
  execute: async (interaction): Promise<DoraReply> => {
    const city = interaction.options.getString(cityOptionName)
    if (!city) {
      throw new DoraUserException(
        `Required '${cityOptionName}' option is missing`,
      )
    }

    const result = await getWeatherForecast(city)
    if (!result) {
      throw new DoraUserException(
        `Could not find '${city}' in Sweden. Try a larger city`,
        {
          severity: DoraUserException.Severity.Info,
        },
      )
    }

    const { location, daily } = result
    if (daily.length === 0) {
      throw new DoraUserException(
        "No forecast data available for that location right now.",
        { severity: DoraUserException.Severity.Info },
      )
    }

    const lines = daily.map((d) => {
      const label = formatDayLabel(d.dateKey)
      const min = formatNumber(d.minTempC, 0)
      const max = formatNumber(d.maxTempC, 0)
      const precip = formatNumber(d.precipitationMm, 1)
      const wind = formatNumber(d.maxWindMs, 0)
      const gust = formatNumber(d.maxGustMs, 0)
      const symbol = getWeatherIcon(d.symbol)

      return `**${label}**  ${symbol}\nMin: ${min}, Max: ${max}°C  •  ${precip} mm  •  ${wind} m/s (${gust} m/s)`
    })

    return createPages({
      header: "10-day forecast (SMHI)",
      description: location.name,
      lines,
      linesPerPage: 5,
    })
  },
} satisfies Command
