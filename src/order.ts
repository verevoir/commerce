import type { Basket, Order, Payment, Money, LineItem } from './types.js';
import { addMoney, subtractMoney, multiplyMoney, zeroMoney } from './money.js';
import { basketTotal } from './basket.js';

/**
 * Convert a basket to an order.
 * Freezes line items and calculates the initial balance from line totals.
 */
export function convertToOrder(basket: Basket, orderId: string): Order {
  if (basket.items.length === 0) {
    throw new Error('Cannot convert an empty basket to an order');
  }

  const totals = basketTotal(basket);
  if (!totals) {
    throw new Error('Cannot convert an empty basket to an order');
  }

  return {
    id: orderId,
    items: [...basket.items],
    balance: totals.total,
    payments: [],
  };
}

/**
 * Apply a payment to an order. Adjusts the balance based on payment status.
 *
 * - confirmed: reduces the balance by the payment amount
 * - pending: records the payment but does not affect the balance
 * - failed: records the payment but does not affect the balance
 * - refunded: increases the balance by the payment amount
 *
 * Balance can go negative (change owed — cash, overpaid prepaid cards).
 */
export function applyPayment(order: Order, payment: Payment): Order {
  const payments = [...order.payments, payment];
  let balance = order.balance;

  if (payment.status === 'confirmed') {
    balance = subtractMoney(balance, payment.amount);
  } else if (payment.status === 'refunded') {
    balance = addMoney(balance, payment.amount);
  }

  return { ...order, payments, balance };
}

/**
 * Update the status of a payment on an order.
 * Recalculates the balance based on all payment statuses.
 */
export function updatePaymentStatus(
  order: Order,
  paymentId: string,
  newStatus: Payment['status'],
): Order {
  const paymentIndex = order.payments.findIndex((p) => p.id === paymentId);
  if (paymentIndex === -1) {
    throw new Error(`Payment ${paymentId} not found on order ${order.id}`);
  }

  const updatedPayments = order.payments.map((p) =>
    p.id === paymentId ? { ...p, status: newStatus } : p,
  );

  const balance = recalculateBalance(order.items, updatedPayments);

  return { ...order, payments: updatedPayments, balance };
}

/** Check whether the order balance is fully paid (zero or negative). */
export function isFullyPaid(order: Order): boolean {
  return order.balance.amount <= 0;
}

/** Calculate the change owed (if balance is negative). Returns zero if no change. */
export function changeOwed(order: Order): Money {
  if (order.balance.amount >= 0) {
    return zeroMoney(order.balance.currency);
  }
  return {
    amount: Math.abs(order.balance.amount),
    currency: order.balance.currency,
  };
}

/** Get the order subtotal, tax, and total from frozen line items. */
export function orderTotals(order: Order): {
  subtotal: Money;
  tax: Money;
  total: Money;
} {
  const currency = order.items[0].unitPrice.currency;
  let subtotal = zeroMoney(currency);
  let tax = zeroMoney(currency);

  for (const item of order.items) {
    subtotal = addMoney(subtotal, multiplyMoney(item.unitPrice, item.quantity));
    tax = addMoney(tax, multiplyMoney(item.tax, item.quantity));
  }

  return { subtotal, tax, total: addMoney(subtotal, tax) };
}

function recalculateBalance(
  items: readonly LineItem[],
  payments: readonly Payment[],
): Money {
  const currency = items[0].unitPrice.currency;
  let total = zeroMoney(currency);

  for (const item of items) {
    total = addMoney(total, item.lineTotal);
  }

  // Only confirmed payments reduce the balance.
  // Refunded, pending, and failed payments do not count.
  for (const payment of payments) {
    if (payment.status === 'confirmed') {
      total = subtractMoney(total, payment.amount);
    }
  }

  return total;
}
