import type {
  Basket,
  LineItem,
  Money,
  Product,
  CommerceConfig,
  EngineContext,
} from './types.js';
import { addMoney, multiplyMoney, zeroMoney } from './money.js';
import { resolvePrice } from './pricing.js';
import { calculateTax } from './tax.js';

/** Create an empty basket. */
export function createBasket(id: string): Basket {
  return { id, items: [] };
}

/**
 * Add a product to the basket. If the product is already in the basket,
 * its quantity is increased. Pricing and tax are resolved on add.
 */
export function addItem(
  basket: Basket,
  product: Product,
  quantity: number,
  config: CommerceConfig = {},
): Basket {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }

  const existing = basket.items.find((i) => i.productId === product.id);
  if (existing) {
    const newQuantity = existing.quantity + quantity;
    return updateItemQuantity(basket, product.id, newQuantity, product, config);
  }

  const item = buildLineItem(product, quantity, config);
  return { ...basket, items: [...basket.items, item] };
}

/**
 * Remove a product from the basket entirely.
 */
export function removeItem(basket: Basket, productId: string): Basket {
  const items = basket.items.filter((i) => i.productId !== productId);
  return { ...basket, items };
}

/**
 * Update the quantity of an item in the basket.
 * Re-resolves pricing and tax for the new quantity.
 */
export function updateItemQuantity(
  basket: Basket,
  productId: string,
  quantity: number,
  product: Product,
  config: CommerceConfig = {},
): Basket {
  if (quantity <= 0) {
    return removeItem(basket, productId);
  }

  const item = buildLineItem(product, quantity, config);
  const items = basket.items.map((i) => (i.productId === productId ? item : i));

  if (!basket.items.some((i) => i.productId === productId)) {
    throw new Error(`Product ${productId} not found in basket`);
  }

  return { ...basket, items };
}

/**
 * Recalculate all line items in the basket against current engines.
 * Useful when pricing or tax configuration changes.
 */
export function recalculateBasket(
  basket: Basket,
  products: readonly Product[],
  config: CommerceConfig = {},
): Basket {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const items = basket.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(
        `Product ${item.productId} not found in provided products`,
      );
    }
    return buildLineItem(product, item.quantity, config);
  });
  return { ...basket, items };
}

/** Calculate the total of all line items in the basket (including tax). */
export function basketTotal(
  basket: Basket,
): { subtotal: Money; tax: Money; total: Money } | null {
  if (basket.items.length === 0) return null;

  const currency = basket.items[0].unitPrice.currency;
  let subtotal = zeroMoney(currency);
  let tax = zeroMoney(currency);

  for (const item of basket.items) {
    const itemSubtotal = multiplyMoney(item.unitPrice, item.quantity);
    const itemTax = multiplyMoney(item.tax, item.quantity);
    subtotal = addMoney(subtotal, itemSubtotal);
    tax = addMoney(tax, itemTax);
  }

  return {
    subtotal,
    tax,
    total: addMoney(subtotal, tax),
  };
}

function buildLineItem(
  product: Product,
  quantity: number,
  config: CommerceConfig,
): LineItem {
  const context: EngineContext = config.context ?? {};
  const engines = config.pricingEngines ?? [];

  const unitPrice = resolvePrice(product, quantity, engines, context);
  const tax = calculateTax(unitPrice, product, config.taxEngine, context);
  const lineTotal = addMoney(
    multiplyMoney(unitPrice, quantity),
    multiplyMoney(tax, quantity),
  );

  return {
    productId: product.id,
    productType: product.type,
    quantity,
    unitPrice,
    tax,
    lineTotal,
  };
}
