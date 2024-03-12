import { GuildBasedChannel, TextChannel } from "discord.js";
import { DoraException, Severity } from "./exceptions/DoraException";

export function assertIsDefined<T>(
  value: T,
  message: string,
  severity: Severity = DoraException.Severity.Error,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new DoraException(message, DoraException.Type.NotDefined, {
      severity,
    });
  }
}

export function assertIsTruthy<T>(
  value: T,
  message: string,
  severity: Severity = DoraException.Severity.Error,
): asserts value is NonNullable<T> {
  if (!value) {
    throw new DoraException(message, DoraException.Type.NotDefined, {
      severity,
    });
  }
}

export function assertChannelIsTextBased(
  value: GuildBasedChannel | null,
  message: string,
  severity: Severity = DoraException.Severity.Error,
): asserts value is TextChannel {
  if (!value?.isTextBased()) {
    throw new DoraException(message, DoraException.Type.TypeError, {
      severity,
    });
  }
}

export function assertIsBefore(
  date: Date | number,
  comparison: Date | number,
  message: string,
  severity: Severity = DoraException.Severity.Error,
  metadata?: Record<string, unknown>,
) {
  if (date > comparison) {
    throw new DoraException(message, DoraException.Type.DateRange, {
      severity,
      metadata,
    });
  }
}
