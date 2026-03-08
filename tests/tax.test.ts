import { describe, it, expect } from 'vitest';
import {
  money,
  calculateTax,
  flatRateTaxEngine,
  productTypeTaxEngine,
} from '../src/index.js';
import type { Product } from '../src/index.js';

const product: Product = {
  id: 'p1',
  type: 'clothing',
  basePrice: money(100, 'GBP'),
};

describe('calculateTax', () => {
  it('returns zero tax when no engine is provided', () => {
    const tax = calculateTax(money(100, 'GBP'), product, undefined, {});
    expect(tax).toEqual(money(0, 'GBP'));
  });
});

describe('flatRateTaxEngine', () => {
  it('applies a flat rate', () => {
    const engine = flatRateTaxEngine(0.2); // 20% VAT
    const tax = calculateTax(money(100, 'GBP'), product, engine, {});
    expect(tax).toEqual(money(20, 'GBP'));
  });

  it('handles zero rate', () => {
    const engine = flatRateTaxEngine(0);
    const tax = calculateTax(money(100, 'GBP'), product, engine, {});
    expect(tax.amount).toBe(0);
  });
});

describe('productTypeTaxEngine', () => {
  it('looks up rate by product type', () => {
    const engine = productTypeTaxEngine({
      clothing: 0.2,
      food: 0,
      'childrens-clothing': 0,
    });

    const clothingTax = calculateTax(money(100, 'GBP'), product, engine, {});
    expect(clothingTax.amount).toBe(20);

    const food: Product = {
      id: 'p2',
      type: 'food',
      basePrice: money(10, 'GBP'),
    };
    const foodTax = calculateTax(money(10, 'GBP'), food, engine, {});
    expect(foodTax.amount).toBe(0);
  });

  it('uses default rate for unknown types', () => {
    const engine = productTypeTaxEngine({ clothing: 0.2 }, 0.05);
    const unknown: Product = {
      id: 'p3',
      type: 'electronics',
      basePrice: money(50, 'GBP'),
    };
    const tax = calculateTax(money(50, 'GBP'), unknown, engine, {});
    expect(tax.amount).toBe(2.5);
  });

  it('defaults to zero for unknown types when no default specified', () => {
    const engine = productTypeTaxEngine({ clothing: 0.2 });
    const unknown: Product = {
      id: 'p3',
      type: 'digital',
      basePrice: money(50, 'GBP'),
    };
    const tax = calculateTax(money(50, 'GBP'), unknown, engine, {});
    expect(tax.amount).toBe(0);
  });
});
