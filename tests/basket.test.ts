import { describe, it, expect } from 'vitest';
import {
  money,
  createBasket,
  addItem,
  removeItem,
  updateItemQuantity,
  recalculateBasket,
  basketTotal,
  flatRateTaxEngine,
  percentageDiscountEngine,
} from '../src/index.js';
import type { Product, CommerceConfig } from '../src/index.js';

const ticket: Product = {
  id: 'ticket-1',
  type: 'ticket',
  basePrice: money(25, 'GBP'),
};

const tshirt: Product = {
  id: 'tshirt-1',
  type: 'merchandise',
  basePrice: money(15, 'GBP'),
};

describe('createBasket', () => {
  it('creates an empty basket', () => {
    const basket = createBasket('b1');
    expect(basket.id).toBe('b1');
    expect(basket.items).toEqual([]);
  });
});

describe('addItem', () => {
  it('adds a product to the basket', () => {
    const basket = addItem(createBasket('b1'), ticket, 2);
    expect(basket.items).toHaveLength(1);
    expect(basket.items[0].productId).toBe('ticket-1');
    expect(basket.items[0].quantity).toBe(2);
    expect(basket.items[0].unitPrice).toEqual(money(25, 'GBP'));
    expect(basket.items[0].lineTotal).toEqual(money(50, 'GBP'));
  });

  it('increments quantity for existing product', () => {
    let basket = addItem(createBasket('b1'), ticket, 1);
    basket = addItem(basket, ticket, 3);
    expect(basket.items).toHaveLength(1);
    expect(basket.items[0].quantity).toBe(4);
    expect(basket.items[0].lineTotal).toEqual(money(100, 'GBP'));
  });

  it('adds multiple different products', () => {
    let basket = addItem(createBasket('b1'), ticket, 1);
    basket = addItem(basket, tshirt, 2);
    expect(basket.items).toHaveLength(2);
  });

  it('rejects zero or negative quantity', () => {
    expect(() => addItem(createBasket('b1'), ticket, 0)).toThrow(
      'Quantity must be positive',
    );
    expect(() => addItem(createBasket('b1'), ticket, -1)).toThrow(
      'Quantity must be positive',
    );
  });

  it('applies pricing engine on add', () => {
    const config: CommerceConfig = {
      pricingEngines: [percentageDiscountEngine(0.1)],
    };
    const basket = addItem(createBasket('b1'), ticket, 2, config);
    expect(basket.items[0].unitPrice.amount).toBe(22.5); // 25 * 0.9
  });

  it('applies tax engine on add', () => {
    const config: CommerceConfig = {
      taxEngine: flatRateTaxEngine(0.2),
    };
    const basket = addItem(createBasket('b1'), ticket, 2, config);
    expect(basket.items[0].tax.amount).toBe(5); // 25 * 0.2
    expect(basket.items[0].lineTotal.amount).toBe(60); // (25 + 5) * 2
  });
});

describe('removeItem', () => {
  it('removes a product from the basket', () => {
    let basket = addItem(createBasket('b1'), ticket, 1);
    basket = addItem(basket, tshirt, 1);
    basket = removeItem(basket, 'ticket-1');
    expect(basket.items).toHaveLength(1);
    expect(basket.items[0].productId).toBe('tshirt-1');
  });

  it('returns unchanged basket when product not found', () => {
    const basket = addItem(createBasket('b1'), ticket, 1);
    const result = removeItem(basket, 'nonexistent');
    expect(result.items).toHaveLength(1);
  });
});

describe('updateItemQuantity', () => {
  it('updates quantity and recalculates', () => {
    let basket = addItem(createBasket('b1'), ticket, 1);
    basket = updateItemQuantity(basket, 'ticket-1', 5, ticket);
    expect(basket.items[0].quantity).toBe(5);
    expect(basket.items[0].lineTotal.amount).toBe(125); // 25 * 5
  });

  it('removes item when quantity is zero or negative', () => {
    let basket = addItem(createBasket('b1'), ticket, 3);
    basket = updateItemQuantity(basket, 'ticket-1', 0, ticket);
    expect(basket.items).toHaveLength(0);
  });

  it('throws when product not in basket', () => {
    const basket = addItem(createBasket('b1'), ticket, 1);
    expect(() => updateItemQuantity(basket, 'nonexistent', 5, tshirt)).toThrow(
      'not found in basket',
    );
  });
});

describe('recalculateBasket', () => {
  it('recalculates all items with new engines', () => {
    const basket = addItem(createBasket('b1'), ticket, 2);
    expect(basket.items[0].unitPrice.amount).toBe(25);

    const config: CommerceConfig = {
      pricingEngines: [percentageDiscountEngine(0.5)],
    };
    const recalculated = recalculateBasket(basket, [ticket], config);
    expect(recalculated.items[0].unitPrice.amount).toBe(12.5);
  });

  it('throws when a product is missing', () => {
    const basket = addItem(createBasket('b1'), ticket, 1);
    expect(() => recalculateBasket(basket, [], {})).toThrow('not found');
  });
});

describe('basketTotal', () => {
  it('returns null for empty basket', () => {
    expect(basketTotal(createBasket('b1'))).toBeNull();
  });

  it('calculates subtotal, tax, and total', () => {
    const config: CommerceConfig = {
      taxEngine: flatRateTaxEngine(0.2),
    };
    let basket = addItem(createBasket('b1'), ticket, 2, config);
    basket = addItem(basket, tshirt, 1, config);

    const totals = basketTotal(basket);
    expect(totals).not.toBeNull();
    // tickets: 2 * 25 = 50 subtotal, 2 * 5 = 10 tax
    // tshirt: 1 * 15 = 15 subtotal, 1 * 3 = 3 tax
    expect(totals!.subtotal.amount).toBe(65);
    expect(totals!.tax.amount).toBe(13);
    expect(totals!.total.amount).toBe(78);
  });
});
