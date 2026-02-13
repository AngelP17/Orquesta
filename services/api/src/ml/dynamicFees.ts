/**
 * Dynamic Fees Model
 * 
 * Lead: SMLE (Staff Machine Learning Engineer)
 * Co-Authority: CFA (Chief Financial Agent), SFRE (Staff Fraud & Risk Engineer)
 * 
 * Uses Contextual Bandits to optimize fee rates per transaction.
 * Balances platform revenue vs seller churn risk.
 * 
 * Constraints:
 * - Fee range: [2.9%, 5.9%]
 * - Max change: +/- 0.5% per transaction
 * - Higher fees for high-risk sellers, lower for loyal/high-volume sellers
 */

import { logPrediction, getModelVersion } from './index';

// Fee rate in basis points (1% = 100 bps)
export type FeeRateBps = number;

// Constraints
const FEE_CONSTRAINTS = {
  minBps: 290,  // 2.9%
  maxBps: 590,  // 5.9%
  maxChangeBps: 50,  // +/- 0.5% max change per tx
};

// Seller context features
export interface SellerContext {
  /** Seller risk tier */
  riskTier: 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
  /** Transaction volume tier */
  volumeTier: 'low' | 'medium' | 'high' | 'enterprise';
  /** Days since first transaction */
  tenureDays: number;
  /** Churn risk score 0-1 */
  churnRisk: number;
  /** Historical dispute rate 0-1 */
  disputeRate: number;
  /** Average transaction size tier */
  transactionSizeTier: 'small' | 'medium' | 'large';
  /** Industry/category */
  category?: string;
  /** Previous fee rate applied (bps) */
  previousFeeBps?: number;
}

// Transaction context
export interface TransactionContext {
  /** Transaction amount in cents */
  amountCents: bigint;
  /** Payment method type */
  paymentMethod: 'yappy' | 'card' | 'bank_transfer' | 'cash';
  /** Whether transaction is international */
  isInternational: boolean;
  /** Whether transaction is recurring/subscription */
  isRecurring: boolean;
}

// Fee recommendation result
export interface FeeRecommendation {
  /** Recommended fee rate in basis points */
  recommendedRateBps: FeeRateBps;
  /** Recommended fee rate as percentage */
  recommendedRatePercent: number;
  /** Confidence in recommendation 0-1 */
  confidence: number;
  /** Reasoning for the rate */
  reasoning: string;
  /** Expected revenue impact vs baseline */
  expectedRevenueImpact: 'positive' | 'neutral' | 'negative';
  /** Model version */
  modelVersion: string;
}

// Volume thresholds (in cents)
const VOLUME_THRESHOLDS = {
  low: 100_000n,      // B/. 1,000
  medium: 1_000_000n, // B/. 10,000
  high: 10_000_000n,  // B/. 100,000
};

/**
 * Determine volume tier from monthly volume
 */
export function getVolumeTier(monthlyVolumeCents: bigint): SellerContext['volumeTier'] {
  if (monthlyVolumeCents >= VOLUME_THRESHOLDS.high) return 'enterprise';
  if (monthlyVolumeCents >= VOLUME_THRESHOLDS.medium) return 'high';
  if (monthlyVolumeCents >= VOLUME_THRESHOLDS.low) return 'medium';
  return 'low';
}

/**
 * Calculate dynamic fee rate
 * 
 * Uses a contextual bandit approach (simulated via rule-based logic).
 * In production, this would use an ONNX model trained on historical data.
 */
export async function calculateDynamicFee(
  seller: SellerContext,
  transaction: TransactionContext,
  requestId: string = crypto.randomUUID()
): Promise<FeeRecommendation> {
  const modelVersion = getModelVersion('dynamicFees')?.version || '1.0.0-fallback';

  // Start with base rate
  let baseRateBps = 350; // 3.5% baseline

  // Risk adjustments
  const riskAdjustments: Record<SellerContext['riskTier'], number> = {
    GREEN: -20,   // -0.2% for trusted sellers
    YELLOW: 0,    // No adjustment
    RED: 40,      // +0.4% for risky sellers
    BLACK: 100,   // +1.0% for high-risk (or reject)
  };

  // Volume adjustments (reward high volume)
  const volumeAdjustments: Record<SellerContext['volumeTier'], number> = {
    low: 20,      // +0.2% for low volume
    medium: 0,    // No adjustment
    high: -20,    // -0.2% discount
    enterprise: -40, // -0.4% discount for enterprise
  };

  // Tenure adjustments (reward loyalty)
  let tenureAdjustment = 0;
  if (seller.tenureDays > 365) {
    tenureAdjustment = -20; // -0.2% for sellers > 1 year
  } else if (seller.tenureDays > 180) {
    tenureAdjustment = -10; // -0.1% for sellers > 6 months
  }

  // Churn risk adjustment (lower fees if churn risk is high)
  let churnAdjustment = 0;
  if (seller.churnRisk > 0.7) {
    churnAdjustment = -30; // -0.3% to retain at-risk sellers
  } else if (seller.churnRisk > 0.5) {
    churnAdjustment = -15; // -0.15% for medium churn risk
  }

  // Dispute rate adjustment
  let disputeAdjustment = 0;
  if (seller.disputeRate > 0.05) {
    disputeAdjustment = 30; // +0.3% for high dispute rate
  } else if (seller.disputeRate > 0.02) {
    disputeAdjustment = 15; // +0.15% for elevated dispute rate
  }

  // Payment method adjustments
  const methodAdjustments: Record<TransactionContext['paymentMethod'], number> = {
    yappy: -10,        // -0.1% for Yappy (lower cost)
    card: 10,          // +0.1% for cards (higher processing cost)
    bank_transfer: -20, // -0.2% for bank transfers
    cash: 0,           // No adjustment
  };

  // Transaction size adjustments
  const amount = Number(transaction.amountCents);
  let sizeAdjustment = 0;
  if (amount > 100_000_00) { // > B/. 100,000
    sizeAdjustment = -20; // Volume discount for large transactions
  } else if (amount < 1_000_00) { // < B/. 1,000
    sizeAdjustment = 10; // Small transaction fee
  }

  // Calculate final rate
  let recommendedRateBps = baseRateBps 
    + riskAdjustments[seller.riskTier]
    + volumeAdjustments[seller.volumeTier]
    + tenureAdjustment
    + churnAdjustment
    + disputeAdjustment
    + methodAdjustments[transaction.paymentMethod]
    + sizeAdjustment;

  // Apply constraints
  recommendedRateBps = Math.max(
    FEE_CONSTRAINTS.minBps,
    Math.min(FEE_CONSTRAINTS.maxBps, recommendedRateBps)
  );

  // Apply max change constraint if previous rate exists
  if (seller.previousFeeBps !== undefined) {
    const maxUp = seller.previousFeeBps + FEE_CONSTRAINTS.maxChangeBps;
    const maxDown = seller.previousFeeBps - FEE_CONSTRAINTS.maxChangeBps;
    recommendedRateBps = Math.max(maxDown, Math.min(maxUp, recommendedRateBps));
  }

  // Build reasoning
  const reasoningParts: string[] = [];
  reasoningParts.push(`Base rate: ${(baseRateBps / 100).toFixed(2)}%`);
  
  if (riskAdjustments[seller.riskTier] !== 0) {
    reasoningParts.push(`Risk (${seller.riskTier}): ${formatAdjustment(riskAdjustments[seller.riskTier])}`);
  }
  if (volumeAdjustments[seller.volumeTier] !== 0) {
    reasoningParts.push(`Volume (${seller.volumeTier}): ${formatAdjustment(volumeAdjustments[seller.volumeTier])}`);
  }
  if (tenureAdjustment !== 0) {
    reasoningParts.push(`Tenure (${seller.tenureDays}d): ${formatAdjustment(tenureAdjustment)}`);
  }
  if (churnAdjustment !== 0) {
    reasoningParts.push(`Churn risk (${(seller.churnRisk * 100).toFixed(0)}%): ${formatAdjustment(churnAdjustment)}`);
  }
  if (disputeAdjustment !== 0) {
    reasoningParts.push(`Dispute rate (${(seller.disputeRate * 100).toFixed(1)}%): ${formatAdjustment(disputeAdjustment)}`);
  }
  if (methodAdjustments[transaction.paymentMethod] !== 0) {
    reasoningParts.push(`Payment method (${transaction.paymentMethod}): ${formatAdjustment(methodAdjustments[transaction.paymentMethod])}`);
  }

  // Determine expected impact
  let expectedRevenueImpact: FeeRecommendation['expectedRevenueImpact'];
  if (recommendedRateBps > baseRateBps) {
    expectedRevenueImpact = 'positive';
  } else if (recommendedRateBps < baseRateBps) {
    expectedRevenueImpact = 'negative';
  } else {
    expectedRevenueImpact = 'neutral';
  }

  // Calculate confidence based on data quality
  let confidence = 0.85;
  if (seller.tenureDays < 30) confidence -= 0.15; // Less confident for new sellers
  if (seller.churnRisk > 0.7) confidence -= 0.1; // Less confident for high churn risk

  const result: FeeRecommendation = {
    recommendedRateBps,
    recommendedRatePercent: recommendedRateBps / 100,
    confidence: Math.max(0.5, confidence),
    reasoning: reasoningParts.join('; '),
    expectedRevenueImpact,
    modelVersion,
  };

  // Log prediction
  logPrediction({
    modelName: 'dynamicFees',
    modelVersion,
    inputFeatures: { seller, transaction },
    prediction: result,
    confidence: result.confidence,
    requestId,
  });

  return result;
}

/**
 * Format basis point adjustment as string
 */
function formatAdjustment(bps: number): string {
  const percent = bps / 100;
  return percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
}

/**
 * Calculate fee amount for a transaction
 */
export function calculateFeeAmount(
  amountCents: bigint,
  feeRateBps: FeeRateBps
): { feeCents: bigint; netCents: bigint } {
  // Fee calculation: FLOOR(amount * rate / 10000)
  // This ensures we never overcharge
  const feeCents = (amountCents * BigInt(feeRateBps)) / 10000n;
  const netCents = amountCents - feeCents;

  return { feeCents, netCents };
}

/**
 * Get fee constraints
 */
export function getFeeConstraints(): typeof FEE_CONSTRAINTS {
  return { ...FEE_CONSTRAINTS };
}

/**
 * Validate fee rate against constraints
 */
export function validateFeeRate(
  proposedRateBps: number,
  previousRateBps?: number
): { valid: boolean; adjustedRateBps: number; violations: string[] } {
  const violations: string[] = [];
  let adjustedRate = proposedRateBps;

  // Check min/max bounds
  if (proposedRateBps < FEE_CONSTRAINTS.minBps) {
    violations.push(`Rate below minimum ${(FEE_CONSTRAINTS.minBps / 100).toFixed(2)}%`);
    adjustedRate = FEE_CONSTRAINTS.minBps;
  }
  if (proposedRateBps > FEE_CONSTRAINTS.maxBps) {
    violations.push(`Rate above maximum ${(FEE_CONSTRAINTS.maxBps / 100).toFixed(2)}%`);
    adjustedRate = FEE_CONSTRAINTS.maxBps;
  }

  // Check max change
  if (previousRateBps !== undefined) {
    const change = Math.abs(proposedRateBps - previousRateBps);
    if (change > FEE_CONSTRAINTS.maxChangeBps) {
      violations.push(`Rate change ${(change / 100).toFixed(2)}% exceeds max ${(FEE_CONSTRAINTS.maxChangeBps / 100).toFixed(2)}%`);
      adjustedRate = proposedRateBps > previousRateBps
        ? previousRateBps + FEE_CONSTRAINTS.maxChangeBps
        : previousRateBps - FEE_CONSTRAINTS.maxChangeBps;
    }
  }

  return {
    valid: violations.length === 0,
    adjustedRateBps: adjustedRate,
    violations,
  };
}
