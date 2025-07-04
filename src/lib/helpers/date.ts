import { logger } from "../logger";

const DEFAULT_LOCALE = "en-GB";

type FormatDateOptions = {
  date?: string | number | Date | null;
  locale?: string;
  format: Intl.DateTimeFormatOptions;
};

export const isValidDate = (date: Date) =>
  date instanceof Date && !isNaN(date.getTime());

const vaidateAndFormat = ({
  date,
  locale = DEFAULT_LOCALE,
  format,
}: FormatDateOptions) => {
  if (!date) return undefined;

  const d = new Date(date);
  if (!isValidDate(d)) {
    logger.error({ date: date }, "Failed to parse date for formatting");
    return undefined;
  }

  return d.toLocaleDateString(locale, format);
};

export const formatDate = (
  date: FormatDateOptions["date"],
  format: FormatDateOptions["format"] = {
    day: "2-digit",
    month: "short",
  },
) =>
  vaidateAndFormat({
    date,
    format,
  });

export const ukDateStringToDate = (ukDateString: string) => {
  const [day, month, year] = ukDateString.split("/").map(Number);
  if (!day || !month || !year) throw new Error("Missing day, month or year");
  return new Date(Date.UTC(year, month - 1, day));
};

/** Converts a timestamp into Discord's native timestamp string format */
export const timeStampToDiscordTimeStamp = (timestamp?: number | null) => {
  return timestamp && `<t:${Math.round(timestamp / 1000)}:R>`;
};
