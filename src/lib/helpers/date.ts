import { logger } from "../logger";

const DEFAULT_LOCALE = "sv-SE";

type FormatDateOptions = {
  date?: string | number | Date;
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