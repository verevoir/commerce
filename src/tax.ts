import type { Money, Product, TaxEngine, EngineContext } from './types.js';
import { zeroMoney } from './money.js';

/**
 * Calculate tax for a line item using the provided tax engine.
 * If no engine is provided, returns zero tax in the unit price's currency.
 */
export function calculateTax(
  unitPrice: Money,
  product: Product,
  engine: TaxEngine | undefined,
  context: EngineContext,
): Money {
  if (!engine) {
    return zeroMoney(unitPrice.currency);
  }
  return engine.calculate(unitPrice, product, context);
}

/**
 * A tax engine that applies a flat rate to all items.
 * Rate is a multiplier — e.g. 0.2 for 20% VAT.
 */
export function flatRateTaxEngine(rate: number): TaxEngine {
  return {
    calculate(unitPrice: Money): Money {
      return {
        amount: unitPrice.amount * rate,
        currency: unitPrice.currency,
      };
    },
  };
}

/**
 * A tax engine that looks up rates by product type.
 * Falls back to a default rate for unknown types.
 */
export function productTypeTaxEngine(
  rates: Record<string, number>,
  defaultRate: number = 0,
): TaxEngine {
  return {
    calculate(unitPrice: Money, product: Product): Money {
      const rate = rates[product.type] ?? defaultRate;
      return {
        amount: unitPrice.amount * rate,
        currency: unitPrice.currency,
      };
    },
  };
}
