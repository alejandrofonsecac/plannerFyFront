/** Aceita apenas os valores listados. */
export function oneOf<T extends string>(values: readonly T[]): (value: unknown) => T | undefined {
  return (value) => (values.includes(value as T) ? (value as T) : undefined);
}

export function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}
