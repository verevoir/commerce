import { describe, it, expect } from 'vitest';
import {
  createSubscription,
  updateSubscriptionStatus,
  changeSubscriptionPlan,
  renewSubscription,
  isSubscriptionActive,
  isInGracePeriod,
  effectiveFeatures,
  hasFeature,
} from '../src/subscription.js';
import type { SubscriptionPlan } from '../src/types.js';

const now = Math.floor(Date.now() / 1000);
const oneMonth = 30 * 24 * 60 * 60;

const proPlan: SubscriptionPlan = {
  id: 'pro',
  type: 'subscription',
  basePrice: { amount: 1000, currency: 'GBP' },
  interval: 'month',
  features: ['analytics', 'custom-qr'],
};

const brandPlan: SubscriptionPlan = {
  id: 'brand',
  type: 'subscription',
  basePrice: { amount: 2000, currency: 'GBP' },
  interval: 'month',
  features: ['analytics', 'custom-qr', 'custom-domain', 'api-access'],
};

describe('createSubscription', () => {
  it('creates an active subscription by default', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });

    expect(sub.id).toBe('sub-1');
    expect(sub.planId).toBe('pro');
    expect(sub.status).toBe('active');
    expect(sub.currentPeriodStart).toBe(now);
    expect(sub.currentPeriodEnd).toBe(now + oneMonth);
    expect(sub.trialEnd).toBeUndefined();
    expect(sub.externalId).toBeUndefined();
  });

  it('creates a trialling subscription', () => {
    const sub = createSubscription({
      id: 'sub-2',
      planId: 'pro',
      status: 'trialling',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
      trialEnd: now + 14 * 24 * 60 * 60,
    });

    expect(sub.status).toBe('trialling');
    expect(sub.trialEnd).toBe(now + 14 * 24 * 60 * 60);
  });

  it('stores an external ID', () => {
    const sub = createSubscription({
      id: 'sub-3',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
      externalId: 'sub_stripe_123',
    });

    expect(sub.externalId).toBe('sub_stripe_123');
  });
});

describe('updateSubscriptionStatus', () => {
  it('returns a new subscription with the updated status', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });

    const cancelled = updateSubscriptionStatus(sub, 'cancelled');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.id).toBe('sub-1');
    // Original unchanged
    expect(sub.status).toBe('active');
  });
});

describe('changeSubscriptionPlan', () => {
  it('returns a new subscription with the new plan ID', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });

    const upgraded = changeSubscriptionPlan(sub, 'brand');
    expect(upgraded.planId).toBe('brand');
    expect(upgraded.id).toBe('sub-1');
    expect(upgraded.status).toBe('active');
    // Original unchanged
    expect(sub.planId).toBe('pro');
  });
});

describe('renewSubscription', () => {
  it('sets new period dates and reactivates', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'past_due',
      currentPeriodStart: now - oneMonth,
      currentPeriodEnd: now,
    });

    const renewed = renewSubscription(sub, now, now + oneMonth);
    expect(renewed.status).toBe('active');
    expect(renewed.currentPeriodStart).toBe(now);
    expect(renewed.currentPeriodEnd).toBe(now + oneMonth);
  });
});

describe('isSubscriptionActive', () => {
  it('returns true for active', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(isSubscriptionActive(sub)).toBe(true);
  });

  it('returns true for trialling', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'trialling',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(isSubscriptionActive(sub)).toBe(true);
  });

  it('returns false for past_due', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'past_due',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(isSubscriptionActive(sub)).toBe(false);
  });

  it('returns false for cancelled', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'cancelled',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(isSubscriptionActive(sub)).toBe(false);
  });

  it('returns false for paused', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'paused',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(isSubscriptionActive(sub)).toBe(false);
  });
});

describe('isInGracePeriod', () => {
  it('returns true when past_due but period has not ended', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'past_due',
      currentPeriodStart: now - oneMonth,
      currentPeriodEnd: now + 3 * 24 * 60 * 60, // 3 days from now
    });
    expect(isInGracePeriod(sub, now)).toBe(true);
  });

  it('returns false when past_due and period has ended', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'past_due',
      currentPeriodStart: now - oneMonth,
      currentPeriodEnd: now - 60, // ended a minute ago
    });
    expect(isInGracePeriod(sub, now)).toBe(false);
  });

  it('returns false for active subscription', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(isInGracePeriod(sub, now)).toBe(false);
  });

  it('returns false for cancelled subscription', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'cancelled',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(isInGracePeriod(sub, now)).toBe(false);
  });
});

describe('effectiveFeatures', () => {
  it('returns plan features for active subscription', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(effectiveFeatures(sub, proPlan)).toEqual(['analytics', 'custom-qr']);
  });

  it('returns plan features for trialling subscription', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'trialling',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(effectiveFeatures(sub, proPlan)).toEqual(['analytics', 'custom-qr']);
  });

  it('returns empty for cancelled subscription', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      status: 'cancelled',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(effectiveFeatures(sub, proPlan)).toEqual([]);
  });

  it('returns empty when plan ID does not match', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'brand',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(effectiveFeatures(sub, proPlan)).toEqual([]);
  });
});

describe('hasFeature', () => {
  it('returns true when subscription includes the feature', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'brand',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(hasFeature(sub, brandPlan, 'custom-domain')).toBe(true);
    expect(hasFeature(sub, brandPlan, 'analytics')).toBe(true);
  });

  it('returns false when subscription does not include the feature', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'pro',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(hasFeature(sub, proPlan, 'custom-domain')).toBe(false);
  });

  it('returns false for inactive subscription', () => {
    const sub = createSubscription({
      id: 'sub-1',
      planId: 'brand',
      status: 'cancelled',
      currentPeriodStart: now,
      currentPeriodEnd: now + oneMonth,
    });
    expect(hasFeature(sub, brandPlan, 'custom-domain')).toBe(false);
  });
});
