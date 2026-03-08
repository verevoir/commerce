import { describe, it, expect } from 'vitest';
import {
  money,
  resolvePrice,
  fixedDiscountEngine,
  percentageDiscountEngine,
} from '../src/index.js';
import type { Product, PricingEngine } from '../src/index.js';

const product: Product = {
  id: 'p1',
  type: 'ticket',
  basePrice: money(100, 'GBP'),
};

describe('resolvePrice', () => {
  it('returns base price when no engines are provided', () => {
    const price = resolvePrice(product, 1, [], {});
    expect(price).toEqual(money(100, 'GBP'));
  });

  it('runs engines in order (pipeline)', () => {
    const doubler: PricingEngine = {
      resolve(current) {
        return { amount: current.amount * 2, currency: current.currency };
      },
    };
    const subtractTen: PricingEngine = {
      resolve(current) {
        return { amount: current.amount - 10, currency: current.currency };
      },
    };

    // 100 -> 200 -> 190
    const price = resolvePrice(product, 1, [doubler, subtractTen], {});
    expect(price.amount).toBe(190);
  });

  it('passes quantity and context to engines', () => {
    const bulkDiscount: PricingEngine = {
      resolve(current, _product, quantity, context) {
        const threshold = (context.bulkThreshold as number) ?? 10;
        if (quantity >= threshold) {
          return {
            amount: current.amount * 0.9,
            currency: current.currency,
          };
        }
        return current;
      },
    };

    const noDiscount = resolvePrice(product, 5, [bulkDiscount], {
      bulkThreshold: 10,
    });
    expect(noDiscount.amount).toBe(100);

    const withDiscount = resolvePrice(product, 10, [bulkDiscount], {
      bulkThreshold: 10,
    });
    expect(withDiscount.amount).toBe(90);
  });
});

describe('fixedDiscountEngine', () => {
  it('applies a fixed discount', () => {
    const engine = fixedDiscountEngine(money(15, 'GBP'));
    const price = resolvePrice(product, 1, [engine], {});
    expect(price.amount).toBe(85);
  });

  it('does not go below zero', () => {
    const engine = fixedDiscountEngine(money(200, 'GBP'));
    const price = resolvePrice(product, 1, [engine], {});
    expect(price.amount).toBe(0);
  });

  it('throws on currency mismatch', () => {
    const engine = fixedDiscountEngine(money(10, 'USD'));
    expect(() => resolvePrice(product, 1, [engine], {})).toThrow(
      'Currency mismatch',
    );
  });
});

describe('percentageDiscountEngine', () => {
  it('applies a percentage discount', () => {
    const engine = percentageDiscountEngine(0.1); // 10% off
    const price = resolvePrice(product, 1, [engine], {});
    expect(price.amount).toBe(90);
  });

  it('rejects fractions outside 0-1', () => {
    expect(() => percentageDiscountEngine(-0.1)).toThrow();
    expect(() => percentageDiscountEngine(1.5)).toThrow();
  });
});
