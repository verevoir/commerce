/**
 * A monetary value with an explicit currency.
 * Every price, payment, and balance in the system carries a currency.
 */
export interface Money {
  readonly amount: number;
  readonly currency: string;
}

/**
 * Minimum product interface. The consumer extends this with domain-specific fields.
 * Commerce only reads these fields — everything else is ignored.
 */
export interface Product {
  readonly id: string;
  readonly type: string;
  readonly basePrice: Money;
}

/**
 * A line item in a basket or order.
 * Captures the resolved price at calculation time — a snapshot, not a live reference.
 */
export interface LineItem {
  readonly productId: string;
  readonly productType: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly tax: Money;
  readonly lineTotal: Money;
}

/**
 * A basket — a mutable collection of line items.
 * Consumer-owned: commerce reads/writes the fields it knows about (id, items).
 * The consumer can attach any additional fields.
 */
export interface Basket {
  readonly id: string;
  readonly items: readonly LineItem[];
}

/** Payment status lifecycle. */
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';

/**
 * A payment applied against an order.
 */
export interface Payment {
  readonly id: string;
  readonly amount: Money;
  readonly status: PaymentStatus;
  readonly callbackUrls?: PaymentCallbackUrls;
}

/** Callback URIs for external payment gateway notification. */
export interface PaymentCallbackUrls {
  readonly finalise?: string;
  readonly cancel?: string;
  readonly refund?: string;
}

/**
 * An order — an immutable snapshot of a basket after conversion.
 * Line items are frozen. Balance tracks how much is owed (or overpaid).
 * Payments are applied against the balance.
 */
export interface Order {
  readonly id: string;
  readonly items: readonly LineItem[];
  readonly balance: Money;
  readonly payments: readonly Payment[];
}

/**
 * Context passed to pricing and tax engines.
 * The consumer can attach any domain-specific data (customer info, discount codes, etc.).
 */
export interface EngineContext {
  readonly [key: string]: unknown;
}

/**
 * A pricing engine stage. Receives the current price, the product, quantity,
 * and a context object. Returns an adjusted price.
 *
 * Engines run in order — each stage sees the result of the previous stage.
 */
export interface PricingEngine {
  resolve(
    currentPrice: Money,
    product: Product,
    quantity: number,
    context: EngineContext,
  ): Money;
}

/**
 * A tax engine. Receives a line item (with resolved price) and a context object.
 * Returns the tax amount for that item.
 *
 * Tax is per-item — rates can vary by product category (e.g. UK VAT).
 */
export interface TaxEngine {
  calculate(unitPrice: Money, product: Product, context: EngineContext): Money;
}

/**
 * Configuration for commerce operations.
 */
export interface CommerceConfig {
  readonly pricingEngines?: readonly PricingEngine[];
  readonly taxEngine?: TaxEngine;
  readonly context?: EngineContext;
}
