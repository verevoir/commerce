# Intent — @verevoir/commerce

## Purpose

Provide abstract e-commerce primitives — products, baskets, orders, payments — with pluggable pricing and tax engines. Designed for systems where the consumer defines the product and location shapes. The commerce layer works with minimum required fields and ignores the rest.

## Goals

- Abstract products: the system neither knows nor cares about the product shape beyond id, type, and base price
- Basket-to-order lifecycle with line item snapshots and balance tracking
- Pluggable pricing engine pipeline with sensible default (base price passthrough)
- Per-item tax calculation with sensible default (configurable flat rate, including zero)
- Payment tracking with status lifecycle and callback URIs for external gateways
- Balance can go negative (change owed — cash purchases, overpaid prepaid cards)

## Non-goals

- Payment processing — the commerce layer reacts to payment events; it does not integrate with any gateway directly
- Inventory management — deferred to bookings (superset of inventory). Products are implicitly infinite stock.
- Storefront UI — the consumer builds their own
- Shipping and fulfilment — consumer-specific
- Tax calculation logic — the library provides the hook; jurisdiction-specific rates are the consumer's responsibility

## Key design decisions

- **Consumer owns the document shapes.** Product, Basket, and Order are abstract interfaces. The consumer extends them with whatever fields their domain needs. Commerce operates on projections — it reads/writes the fields it knows about.
- **Money is always typed.** Every monetary value carries a currency. `{ amount: number, currency: string }`. No implicit currency anywhere. This is trivially simple now and avoids a painful retrofit later.
- **Tax is per-item.** UK VAT rates vary by product category (20% standard, 5% reduced, 0% zero-rated). The tax engine runs per line item, not on the basket total.
- **Line items are snapshots.** A line item captures the resolved price at the time of calculation. Order line items are frozen — they record what was bought at what price.
- **Engines are optional with sensible defaults.** No pricing engine? Base price. No tax engine? Zero tax. Complexity is opt-in.
- **Functional style.** Operations return new state rather than mutating. Baskets and orders are plain objects, not class instances.

## Constraints

- Single runtime dependency: `@verevoir/schema`
- No dependency on `@verevoir/storage` — persistence is the consumer's responsibility
- All monetary operations must preserve currency information
- No floating point arithmetic for money — amounts are numbers, but the consumer is responsible for precision (integer cents recommended)
