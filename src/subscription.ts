import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from './types.js';

/** Options for creating a new subscription. */
export interface CreateSubscriptionOptions {
  readonly id: string;
  readonly planId: string;
  readonly currentPeriodStart: number;
  readonly currentPeriodEnd: number;
  readonly status?: SubscriptionStatus;
  readonly trialEnd?: number;
  readonly externalId?: string;
}

/** Create a new subscription. Defaults to 'active' status. */
export function createSubscription(
  options: CreateSubscriptionOptions,
): Subscription {
  return {
    id: options.id,
    planId: options.planId,
    status: options.status ?? 'active',
    currentPeriodStart: options.currentPeriodStart,
    currentPeriodEnd: options.currentPeriodEnd,
    ...(options.trialEnd != null && { trialEnd: options.trialEnd }),
    ...(options.externalId != null && { externalId: options.externalId }),
  };
}

/** Update the status of a subscription. Returns a new subscription. */
export function updateSubscriptionStatus(
  subscription: Subscription,
  status: SubscriptionStatus,
): Subscription {
  return { ...subscription, status };
}

/** Change a subscription to a different plan. Returns a new subscription. */
export function changeSubscriptionPlan(
  subscription: Subscription,
  newPlanId: string,
): Subscription {
  return { ...subscription, planId: newPlanId };
}

/** Renew a subscription with new period dates. Returns a new subscription. */
export function renewSubscription(
  subscription: Subscription,
  periodStart: number,
  periodEnd: number,
): Subscription {
  return {
    ...subscription,
    status: 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  };
}

/** Check whether a subscription is in an active billing state (active or trialling). */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialling';
}

/**
 * Check whether a past_due subscription is still within a grace period.
 * Returns false for any other status.
 */
export function isInGracePeriod(
  subscription: Subscription,
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  if (subscription.status !== 'past_due') return false;
  return now < subscription.currentPeriodEnd;
}

/**
 * Resolve the effective features for a subscription against its plan.
 * Returns the plan's features if the subscription is active or trialling,
 * an empty array otherwise.
 */
export function effectiveFeatures(
  subscription: Subscription,
  plan: SubscriptionPlan,
): readonly string[] {
  if (subscription.planId !== plan.id) return [];
  if (!isSubscriptionActive(subscription)) return [];
  return plan.features;
}

/** Check whether a subscription includes a specific feature. */
export function hasFeature(
  subscription: Subscription,
  plan: SubscriptionPlan,
  feature: string,
): boolean {
  return effectiveFeatures(subscription, plan).includes(feature);
}
