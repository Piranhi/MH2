import Decimal, { type DecimalSource } from "break_infinity.js";

export type GameNumber = Decimal;
export type GameNumberSource = DecimalSource;

const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

export function gameNumber(value: GameNumberSource = 0): GameNumber {
  return new Decimal(value);
}

export function add(value: GameNumberSource, other: GameNumberSource): GameNumber {
  return Decimal.add(value, other);
}

export function subtract(value: GameNumberSource, other: GameNumberSource): GameNumber {
  return Decimal.sub(value, other);
}

export function multiply(value: GameNumberSource, other: GameNumberSource): GameNumber {
  return Decimal.mul(value, other);
}

export function divide(value: GameNumberSource, other: GameNumberSource): GameNumber {
  return Decimal.div(value, other);
}

export function power(value: GameNumberSource, exponent: number): GameNumber {
  return Decimal.pow(value, exponent);
}

export function floor(value: GameNumberSource): GameNumber {
  return Decimal.floor(value);
}

export function greaterThan(value: GameNumberSource, other: GameNumberSource): boolean {
  return Decimal.gt(value, other);
}

export function greaterThanOrEqual(value: GameNumberSource, other: GameNumberSource): boolean {
  return Decimal.gte(value, other);
}

export function toFiniteNumber(value: GameNumberSource): number {
  const numberValue = gameNumber(value).toNumber();
  return Number.isFinite(numberValue) ? numberValue : Number.MAX_VALUE;
}

export function formatGameNumber(value: GameNumberSource, decimals = 0): string {
  const numberValue = gameNumber(value);

  if (numberValue.lt(1000)) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    }).format(numberValue.toNumber());
  }

  const exponent = numberValue.exponent;
  const suffixIndex = Math.floor(exponent / 3);

  if (suffixIndex > 0 && suffixIndex < suffixes.length) {
    const scaled = numberValue.div(Decimal.pow(10, suffixIndex * 3)).toNumber();
    return `${scaled.toFixed(decimals === 0 ? 1 : decimals)}${suffixes[suffixIndex]}`;
  }

  return numberValue.toExponential(2).replace("+", "");
}

export function reviveGameNumber(value: unknown): GameNumber {
  if (value instanceof Decimal) {
    return value;
  }

  if (typeof value === "number" || typeof value === "string") {
    return gameNumber(value);
  }

  return gameNumber(0);
}
