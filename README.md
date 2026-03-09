# @verevoir/commerce

Abstract e-commerce primitives — products, baskets, orders, and payments — with pluggable pricing and tax engines. Zero runtime dependencies. Standalone.

## What It Does

- **Money** — typed monetary values with currency-safe arithmetic
- **Product** — abstract interface; your domain defines the shape, commerce needs `id`, `type`, and `basePrice`
- **Basket** — add, remove, and update line items with automatic price and tax resolution
- **Order** — frozen snapshot of a basket with balance tracking and payment application
- **Pricing Engine** — ordered pipeline that transforms unit price per item (discounts, loyalty, dynamic pricing)
- **Tax Engine** — per-item tax calculation (VAT, sales tax, zero-rated categories)

## Install

```bash
npm install @verevoir/commerce
```

## Quick Example

```typescript
import {
  money,
  createBasket,
  addItem,
  convertToOrder,
  applyPayment,
  isFullyPaid,
  percentageDiscountEngine,
  productTypeTaxEngine,
} from '@verevoir/commerce';
import type { CommerceConfig } from '@verevoir/commerce';

// Define a product (your domain shape — commerce only needs id, type, basePrice)
const shirt = { id: 'p1', type: 'clothing', basePrice: money(25, 'GBP') };
const book = { id: 'p2', type: 'books', basePrice: money(15, 'GBP') };

// Configure engines
const config: CommerceConfig = {
  pricingEngines: [percentageDiscountEngine(0.1)], // 10% off
  taxEngine: productTypeTaxEngine({ books: 0, clothing: 0.2 }, 0.2), // UK VAT
};

// Build a basket
let basket = createBasket('basket-1');
basket = addItem(basket, shirt, 2, config); // 2 shirts
basket = addItem(basket, book, 1, config);  // 1 book

// Convert to order and pay
const order = convertToOrder(basket, 'order-1');
const paid = applyPayment(order, {
  id: 'pay-1',
  amount: money(58.5, 'GBP'),
  status: 'confirmed',
});
console.log(isFullyPaid(paid)); // true
```

## API

### Money

| Export | Description |
| --- | --- |
| `money(amount, currency)` | Create a Money value |
| `addMoney(a, b)` | Add two Money values (same currency) |
| `subtractMoney(a, b)` | Subtract (same currency) |
| `multiplyMoney(m, factor)` | Multiply by a scalar |
| `zeroMoney(currency)` | Zero value for a currency |

### Basket

| Export | Description |
| --- | --- |
| `createBasket(id)` | Create an empty basket |
| `addItem(basket, product, qty, config?)` | Add or increase quantity |
| `removeItem(basket, productId)` | Remove a product entirely |
| `updateItemQuantity(basket, productId, qty, product, config?)` | Set quantity |
| `recalculateBasket(basket, products, config?)` | Re-run all pricing and tax |
| `basketTotal(basket)` | Get subtotal, tax, and total |

### Order

| Export | Description |
| --- | --- |
| `convertToOrder(basket, orderId)` | Freeze basket into an order |
| `applyPayment(order, payment)` | Record a payment against an order |
| `updatePaymentStatus(order, paymentId, status)` | Change payment status |
| `isFullyPaid(order)` | Check if balance is zero or negative |
| `changeOwed(order)` | Get overpayment amount |
| `orderTotals(order)` | Get subtotal, tax, and total |

### Engines

| Export | Description |
| --- | --- |
| `fixedDiscountEngine(amount)` | Subtract a fixed amount per unit |
| `percentageDiscountEngine(rate)` | Subtract a percentage (0–1) |
| `flatRateTaxEngine(rate)` | Same tax rate for all products |
| `productTypeTaxEngine(rates, defaultRate)` | Tax rate by `product.type` |

## Architecture

| File | Responsibility |
| --- | --- |
| `src/types.ts` | Core interfaces: Money, Product, LineItem, Basket, Order, Payment, PricingEngine, TaxEngine |
| `src/money.ts` | Money factory and currency-safe arithmetic |
| `src/pricing.ts` | Pricing engine pipeline runner and built-in engines |
| `src/tax.ts` | Tax engine runner and built-in engines |
| `src/basket.ts` | Basket operations — add, remove, update, recalculate |
| `src/order.ts` | Order operations — convert, pay, balance tracking |
| `src/index.ts` | Public API exports |

## Design Decisions

- **Consumer owns the document shapes.** Product, Basket, and Order are abstract interfaces with minimum required fields. Commerce operates on projections.
- **Money is always typed.** Every monetary value carries a currency. No implicit currency anywhere.
- **Tax is per-item.** Tax rates vary by product category (e.g. UK VAT: 20% standard, 0% zero-rated for books).
- **Line items are snapshots.** Captured at calculation time, frozen on order conversion.
- **Balance can go negative.** Overpayment means change owed — cash purchases, pre-paid cards.
- **Engines are optional.** No pricing engine means base price. No tax engine means zero tax.
- **No payment processing.** The commerce layer reacts to payment events via callback URIs. It does not integrate with any gateway.
- **Zero runtime dependencies.** Standalone — no dependency on any Verevoir package.

## Documentation

- [Commerce](https://verevoir.io/docs/commerce) — products, baskets, orders, payments, pricing and tax engines
- [Integration Guide](https://verevoir.io/docs/integration) — connecting content models, storage, editor, and more

## Development

```bash
npm install    # Install dependencies
make build     # Compile TypeScript
make test      # Run test suite
make lint      # Check formatting
```
