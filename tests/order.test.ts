import { describe, it, expect } from 'vitest';
import {
  money,
  createBasket,
  addItem,
  convertToOrder,
  applyPayment,
  updatePaymentStatus,
  isFullyPaid,
  changeOwed,
  orderTotals,
  flatRateTaxEngine,
} from '../src/index.js';
import type { Product, Payment, CommerceConfig } from '../src/index.js';

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

function makeBasketWithItems(config?: CommerceConfig) {
  let basket = createBasket('b1');
  basket = addItem(basket, ticket, 2, config);
  basket = addItem(basket, tshirt, 1, config);
  return basket;
}

describe('convertToOrder', () => {
  it('converts a basket to an order', () => {
    const basket = makeBasketWithItems();
    const order = convertToOrder(basket, 'order-1');

    expect(order.id).toBe('order-1');
    expect(order.items).toHaveLength(2);
    expect(order.payments).toEqual([]);
    // Balance = 2*25 + 1*15 = 65
    expect(order.balance).toEqual(money(65, 'GBP'));
  });

  it('freezes line items (snapshot)', () => {
    const basket = makeBasketWithItems();
    const order = convertToOrder(basket, 'order-1');

    // Order items are a copy, not a reference
    expect(order.items).not.toBe(basket.items);
    expect(order.items[0]).toEqual(basket.items[0]);
  });

  it('throws on empty basket', () => {
    expect(() => convertToOrder(createBasket('b1'), 'order-1')).toThrow(
      'empty basket',
    );
  });

  it('includes tax in balance', () => {
    const config: CommerceConfig = { taxEngine: flatRateTaxEngine(0.2) };
    const basket = makeBasketWithItems(config);
    const order = convertToOrder(basket, 'order-1');
    // 2*25 + 2*5 + 1*15 + 1*3 = 50 + 10 + 15 + 3 = 78
    expect(order.balance.amount).toBe(78);
  });
});

describe('applyPayment', () => {
  it('reduces balance on confirmed payment', () => {
    const order = convertToOrder(makeBasketWithItems(), 'order-1');
    const payment: Payment = {
      id: 'pay-1',
      amount: money(30, 'GBP'),
      status: 'confirmed',
    };
    const updated = applyPayment(order, payment);
    expect(updated.balance.amount).toBe(35); // 65 - 30
    expect(updated.payments).toHaveLength(1);
  });

  it('does not affect balance on pending payment', () => {
    const order = convertToOrder(makeBasketWithItems(), 'order-1');
    const payment: Payment = {
      id: 'pay-1',
      amount: money(65, 'GBP'),
      status: 'pending',
    };
    const updated = applyPayment(order, payment);
    expect(updated.balance.amount).toBe(65);
    expect(updated.payments).toHaveLength(1);
  });

  it('does not affect balance on failed payment', () => {
    const order = convertToOrder(makeBasketWithItems(), 'order-1');
    const payment: Payment = {
      id: 'pay-1',
      amount: money(65, 'GBP'),
      status: 'failed',
    };
    const updated = applyPayment(order, payment);
    expect(updated.balance.amount).toBe(65);
  });

  it('increases balance on refunded payment', () => {
    let order = convertToOrder(makeBasketWithItems(), 'order-1');
    order = applyPayment(order, {
      id: 'pay-1',
      amount: money(65, 'GBP'),
      status: 'confirmed',
    });
    expect(order.balance.amount).toBe(0);

    order = applyPayment(order, {
      id: 'refund-1',
      amount: money(25, 'GBP'),
      status: 'refunded',
    });
    expect(order.balance.amount).toBe(25);
  });

  it('allows balance to go negative (change owed)', () => {
    const basket = addItem(createBasket('b1'), ticket, 1); // 25 GBP
    let order = convertToOrder(basket, 'order-1');
    order = applyPayment(order, {
      id: 'pay-1',
      amount: money(50, 'GBP'),
      status: 'confirmed',
    });
    expect(order.balance.amount).toBe(-25);
  });

  it('supports split payments', () => {
    let order = convertToOrder(makeBasketWithItems(), 'order-1');
    // 65 total
    order = applyPayment(order, {
      id: 'card',
      amount: money(40, 'GBP'),
      status: 'confirmed',
    });
    order = applyPayment(order, {
      id: 'gift-card',
      amount: money(25, 'GBP'),
      status: 'confirmed',
    });
    expect(order.balance.amount).toBe(0);
    expect(order.payments).toHaveLength(2);
  });

  it('records callback URLs on payment', () => {
    const order = convertToOrder(makeBasketWithItems(), 'order-1');
    const payment: Payment = {
      id: 'pay-1',
      amount: money(65, 'GBP'),
      status: 'pending',
      callbackUrls: {
        finalise: 'https://example.com/finalise',
        cancel: 'https://example.com/cancel',
        refund: 'https://example.com/refund',
      },
    };
    const updated = applyPayment(order, payment);
    expect(updated.payments[0].callbackUrls?.finalise).toBe(
      'https://example.com/finalise',
    );
  });
});

describe('updatePaymentStatus', () => {
  it('updates a pending payment to confirmed and recalculates balance', () => {
    let order = convertToOrder(makeBasketWithItems(), 'order-1');
    order = applyPayment(order, {
      id: 'pay-1',
      amount: money(65, 'GBP'),
      status: 'pending',
    });
    expect(order.balance.amount).toBe(65);

    order = updatePaymentStatus(order, 'pay-1', 'confirmed');
    expect(order.balance.amount).toBe(0);
    expect(order.payments[0].status).toBe('confirmed');
  });

  it('updates confirmed to refunded and recalculates', () => {
    let order = convertToOrder(makeBasketWithItems(), 'order-1');
    order = applyPayment(order, {
      id: 'pay-1',
      amount: money(65, 'GBP'),
      status: 'confirmed',
    });
    expect(order.balance.amount).toBe(0);

    order = updatePaymentStatus(order, 'pay-1', 'refunded');
    expect(order.balance.amount).toBe(65);
  });

  it('throws when payment not found', () => {
    const order = convertToOrder(makeBasketWithItems(), 'order-1');
    expect(() =>
      updatePaymentStatus(order, 'nonexistent', 'confirmed'),
    ).toThrow('not found');
  });
});

describe('isFullyPaid', () => {
  it('returns false when balance is positive', () => {
    const order = convertToOrder(makeBasketWithItems(), 'order-1');
    expect(isFullyPaid(order)).toBe(false);
  });

  it('returns true when balance is zero', () => {
    let order = convertToOrder(makeBasketWithItems(), 'order-1');
    order = applyPayment(order, {
      id: 'pay-1',
      amount: money(65, 'GBP'),
      status: 'confirmed',
    });
    expect(isFullyPaid(order)).toBe(true);
  });

  it('returns true when balance is negative', () => {
    let order = convertToOrder(
      addItem(createBasket('b1'), ticket, 1),
      'order-1',
    );
    order = applyPayment(order, {
      id: 'pay-1',
      amount: money(50, 'GBP'),
      status: 'confirmed',
    });
    expect(isFullyPaid(order)).toBe(true);
  });
});

describe('changeOwed', () => {
  it('returns zero when no change owed', () => {
    const order = convertToOrder(makeBasketWithItems(), 'order-1');
    expect(changeOwed(order).amount).toBe(0);
  });

  it('returns the absolute change amount when overpaid', () => {
    let order = convertToOrder(
      addItem(createBasket('b1'), ticket, 1),
      'order-1',
    );
    order = applyPayment(order, {
      id: 'pay-1',
      amount: money(50, 'GBP'),
      status: 'confirmed',
    });
    expect(changeOwed(order)).toEqual(money(25, 'GBP'));
  });
});

describe('orderTotals', () => {
  it('returns subtotal, tax, and total', () => {
    const config: CommerceConfig = { taxEngine: flatRateTaxEngine(0.2) };
    const basket = makeBasketWithItems(config);
    const order = convertToOrder(basket, 'order-1');
    const totals = orderTotals(order);

    expect(totals.subtotal.amount).toBe(65);
    expect(totals.tax.amount).toBe(13);
    expect(totals.total.amount).toBe(78);
  });
});
