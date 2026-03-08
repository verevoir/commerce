import { describe, it, expect } from 'vitest';
import {
  money,
  addMoney,
  subtractMoney,
  multiplyMoney,
  zeroMoney,
} from '../src/index.js';

describe('money', () => {
  it('creates a Money value', () => {
    const m = money(10, 'GBP');
    expect(m).toEqual({ amount: 10, currency: 'GBP' });
  });

  it('creates zero money', () => {
    expect(zeroMoney('USD')).toEqual({ amount: 0, currency: 'USD' });
  });
});

describe('addMoney', () => {
  it('adds two Money values with the same currency', () => {
    const result = addMoney(money(10, 'GBP'), money(5, 'GBP'));
    expect(result).toEqual({ amount: 15, currency: 'GBP' });
  });

  it('throws on currency mismatch', () => {
    expect(() => addMoney(money(10, 'GBP'), money(5, 'USD'))).toThrow(
      'Currency mismatch',
    );
  });
});

describe('subtractMoney', () => {
  it('subtracts two Money values', () => {
    const result = subtractMoney(money(10, 'GBP'), money(3, 'GBP'));
    expect(result).toEqual({ amount: 7, currency: 'GBP' });
  });

  it('can go negative', () => {
    const result = subtractMoney(money(5, 'GBP'), money(10, 'GBP'));
    expect(result.amount).toBe(-5);
  });

  it('throws on currency mismatch', () => {
    expect(() => subtractMoney(money(10, 'GBP'), money(5, 'EUR'))).toThrow(
      'Currency mismatch',
    );
  });
});

describe('multiplyMoney', () => {
  it('multiplies a Money value by a scalar', () => {
    const result = multiplyMoney(money(10, 'GBP'), 3);
    expect(result).toEqual({ amount: 30, currency: 'GBP' });
  });

  it('handles fractional multipliers', () => {
    const result = multiplyMoney(money(100, 'GBP'), 0.2);
    expect(result).toEqual({ amount: 20, currency: 'GBP' });
  });
});
