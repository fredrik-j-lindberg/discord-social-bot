import { type GuildBasedChannel, TextChannel } from "discord.js"

import { getActiveMemberFields } from "~/configs/memberFieldsConfig"

import { DoraException, type Severity } from "./exceptions/DoraException"
import type { MemberFieldsIds } from "./helpers/member"

export const isDefined = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null

export function assertIsDefined<T>(
  value: T,
  message: string,
  severity: Severity = DoraException.Severity.Error,
): asserts value is NonNullable<T> {
  if (!isDefined(value)) {
    throw new DoraException(message, DoraException.Type.NotDefined, {
      severity,
    })
  }
}

type NonNullRequired<T> = Required<{
  [P in keyof T]-?: NonNullable<T[P]>
}>

export type ObjectWithProperty<
  TObject extends object,
  TPropertyKey extends keyof TObject,
> = Exclude<TObject, TPropertyKey> &
  NonNullRequired<Pick<TObject, TPropertyKey>>

export const hasDefinedProperty = <
  TObject extends object,
  TPropertyKey extends keyof TObject,
>(
  objectValue: TObject,
  propertyKey: TPropertyKey,
): objectValue is ObjectWithProperty<TObject, TPropertyKey> =>
  objectValue[propertyKey] !== undefined && objectValue[propertyKey] !== null

export function assertHasDefinedProperty<
  TObject extends object,
  TPropertyKey extends keyof TObject,
>(
  objectValue: TObject,
  propertyKey: TPropertyKey,
  message: string,
  severity: Severity = DoraException.Severity.Error,
): asserts objectValue is ObjectWithProperty<TObject, TPropertyKey> {
  if (!hasDefinedProperty(objectValue, propertyKey)) {
    throw new DoraException(message, DoraException.Type.NotDefined, {
      severity,
    })
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
    })
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
    })
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
    })
  }
}

export const isOneOf = <T extends string>(
  value: string,
  validValues: T[],
): value is T => validValues.includes(value as T)

export function assertValidMemberField(
  value: string,
  /** The active opt-in fields */
  activeOptInFields: MemberFieldsIds[],
): asserts value is MemberFieldsIds {
  const validChoices = getActiveMemberFields(activeOptInFields).map(
    (validField) => validField.id,
  )

  if (!isOneOf(value, validChoices)) {
    throw new DoraException(
      `Invalid field '${value}' provided. Valid fields are: ${validChoices.join(
        ", ",
      )}`,
    )
  }
}
