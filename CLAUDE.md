# @verevoir/commerce — Commerce Primitives

Abstract e-commerce primitives for Verevoir — products, baskets, orders, payments with pluggable pricing and tax engines.

## What It Does

- **Money** — typed monetary values (`{ amount, currency }`). Every price, payment, and balance carries a currency.
- **Product** — abstract interface. The consumer defines the product shape; commerce needs id, type, and basePrice.
- **Basket** — mutable collection of line items. Consumer-owned document. Add, remove, update items with automatic price and tax resolution.
- **Order** — immutable snapshot of a basket. Frozen line items, balance tracking, payment application.
- **Payment** — records against orders. Status lifecycle (pending → confirmed / failed / refunded). Callback URIs for external gateway notification.
- **Pricing Engine** — ordered pipeline, per-item. Default: base price passthrough. Consumer provides engines for discounts, loyalty, dynamic pricing.
- **Tax Engine** — per-item tax calculation. Default: configurable flat rate. Consumer provides engine for jurisdiction-specific rates (e.g. UK VAT).

## Design Principles

- **Consumer owns the document shapes** — Product, Basket, and Order are abstract interfaces with minimum required fields. Commerce operates on projections.
- **Money is always typed** — no implicit currency anywhere.
- **Tax is per-item** — tax rates vary by product category.
- **Line items are snapshots** — captured at calculation time, frozen on order conversion.
- **Balance is a number, not a boolean** — can be positive (owed), zero (paid), or negative (change owed).
- **Engines are optional** — no pricing engine = base price; no tax engine = zero tax.
- **No inventory in v1** — deferred to bookings (superset of inventory).
- **No payment processing** — reacts to payment events via callbacks, does not integrate with gateways.

## Quick Example

```typescript
import {
  createBasket,
  addItem,
  convertToOrder,
  applyPayment,
  money,
} from '@verevoir/commerce';

const product = { id: 'p1', type: 'ticket', basePrice: money(25, 'GBP') };

let basket = createBasket('basket-1');
basket = addItem(basket, product, 2);
// basket.items[0].unitPrice = { amount: 25, currency: 'GBP' }
// basket.items[0].lineTotal = { amount: 50, currency: 'GBP' }

const order = convertToOrder(basket, 'order-1');
// order.balance = { amount: 50, currency: 'GBP' }

const paid = applyPayment(order, {
  id: 'pay-1',
  amount: money(50, 'GBP'),
  status: 'confirmed',
});
// paid.balance = { amount: 0, currency: 'GBP' }
```

## Setup

```bash
npm install
```

## Commands

```bash
make build   # Compile TypeScript
make test    # Run test suite
make lint    # Lint and check formatting
make run     # No-op (library)
```

## Architecture

- `src/types.ts` — Core interfaces: Money, Product, LineItem, Basket, Order, Payment, PricingEngine, TaxEngine, SubscriptionPlan, Subscription
- `src/money.ts` — Money factory and arithmetic helpers
- `src/pricing.ts` — Pricing engine pipeline runner with default passthrough
- `src/tax.ts` — Per-item tax engine with default flat rate
- `src/basket.ts` — Basket operations: create, add, remove, update items
- `src/order.ts` — Order operations: convert basket, apply payment, balance tracking
- `src/subscription.ts` — Subscription operations: create, renew, change plan, status evaluation, feature entitlements
- `src/index.ts` — Public API exports

## Dependencies

- **Zero runtime dependencies** — all types defined locally
- **No** dependency on `@verevoir/schema` — commerce types are self-contained
- **No** dependency on `@verevoir/storage` — persistence is the consumer's responsibility
