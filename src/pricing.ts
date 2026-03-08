import type { Money, Product, PricingEngine, EngineContext } from './types.js';

/**
 * Resolve the unit price for a product by running it through a pricing pipeline.
 *
 * Each engine stage receives the running price and returns an adjusted price.
 * If no engines are provided, returns the product's base price (passthrough).
 */
export function resolvePrice(
  product: Product,
  quantity: number,
  engines: readonly PricingEngine[],
  context: EngineContext,
): Money {
  let price = product.basePrice;
  for (const engine of engines) {
    price = engine.resolve(price, product, quantity, context);
  }
  return price;
}

/**
 * A pricing engine that applies a fixed discount amount per unit.
 */
export function fixedDiscountEngine(discount: Money): PricingEngine {
  return {
    resolve(currentPrice: Money): Money {
      if (currentPrice.currency !== discount.currency) {
        throw new Error(
          `Currency mismatch: discount is ${discount.currency} but price is ${currentPrice.currency}`,
        );
      }
      return {
        amount: Math.max(0, currentPrice.amount - discount.amount),
        currency: currentPrice.currency,
      };
    },
  };
}

/**
 * A pricing engine that applies a percentage discount (0–1 range).
 * e.g. 0.1 = 10% off.
 */
export function percentageDiscountEngine(fraction: number): PricingEngine {
  if (fraction < 0 || fraction > 1) {
    throw new Error(
      `Discount fraction must be between 0 and 1, got ${fraction}`,
    );
  }
  return {
    resolve(currentPrice: Money): Money {
      return {
        amount: currentPrice.amount * (1 - fraction),
        currency: currentPrice.currency,
      };
    },
  };
}
