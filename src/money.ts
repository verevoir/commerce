import type { Money } from './types.js';

/** Create a Money value. */
export function money(amount: number, currency: string): Money {
  return { amount, currency };
}

/** Add two Money values. Currencies must match. */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

/** Subtract b from a. Currencies must match. */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/** Multiply a Money value by a scalar. */
export function multiplyMoney(m: Money, factor: number): Money {
  return { amount: m.amount * factor, currency: m.currency };
}

/** Create a zero Money value in the given currency. */
export function zeroMoney(currency: string): Money {
  return { amount: 0, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: cannot combine ${a.currency} and ${b.currency}`,
    );
  }
}
