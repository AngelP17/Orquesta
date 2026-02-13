/**
 * Anomaly Detection Model
 * 
 * Lead: SMLE (Staff Machine Learning Engineer)
 * Co-Authority: SFRE (Staff Fraud & Risk Engineer)
 * 
 * Detects suspicious transactions using Isolation Forest algorithm.
 * Features: velocity, amount Z-score, time-of-day, geographic anomalies
 * 
 * Output: Anomaly score 0-100, where >70 flags for review
 */

import { logPrediction, FeatureExtraction, getModelVersion } from './index';

// Risk tiers for transactions
export type RiskTier = 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';

// Transaction features for anomaly detection
export interface TransactionFeatures {
  /** Transaction amount in cents */
  amountCents: bigint;
  /** Seller's average transaction amount (cents) */
  sellerAvgAmountCents: bigint;
  /** Seller's transaction amount std deviation */
  sellerAmountStdCents: bigint;
  /** Transactions in last hour */
  velocity1h: number;
  /** Transactions in last 24 hours */
  velocity24h: number;
  /** Transaction timestamp */
  timestamp: Date;
  /** Seller's registered country */
  sellerCountry: string;
  /** IP address country (if available) */
  ipCountry?: string;
  /** Device fingerprint confidence (0-1) */
  deviceConfidence?: number;
  /** Whether payment method is new for this seller */
  isNewPaymentMethod: boolean;
  /** Seller's risk tier */
  sellerRiskTier: RiskTier;
}

// Anomaly detection result
export interface AnomalyScore {
  /** Anomaly score 0-100 */
  score: number;
  /** Whether transaction is flagged as anomalous */
  isAnomalous: boolean;
  /** Risk classification */
  riskTier: RiskTier;
  /** Detected signals */
  signals: AnomalySignal[];
  /** Recommended action */
  recommendedAction: 'allow' | 'flag_for_review' | 'block';
  /** Model version */
  modelVersion: string;
}

// Individual anomaly signal
export interface AnomalySignal {
  /** Signal type */
  type: 'velocity' | 'amount' | 'time' | 'geography' | 'device' | 'pattern';
  /** Signal description */
  description: string;
  /** Signal weight/contribution to score */
  weight: number;
}

// Thresholds for risk classification
const ANOMALY_THRESHOLDS = {
  GREEN: 30,   // Normal
  YELLOW: 60,  // Suspicious, allow but flag
  RED: 80,     // High risk, manual review required
  BLACK: 100,  // Block immediately
};

// Panama-specific velocity limits
const VELOCITY_LIMITS = {
  perHour: 50,
  perDay: 200,
  maxSingleTxCents: 1_000_000n, // B/. 10,000
  maxDailyVolumeCents: 5_000_000n, // B/. 50,000
};

/**
 * Extract features from transaction data
 */
export function extractTransactionFeatures(
  transaction: {
    amountCents: bigint;
    sellerId: string;
    timestamp: Date;
    paymentMethodId?: string;
    ipAddress?: string;
  },
  sellerHistory: {
    avgAmountCents: bigint;
    amountStdCents: bigint;
    transactions1h: number;
    transactions24h: number;
    knownPaymentMethods: string[];
    country: string;
    riskTier: RiskTier;
  },
  geoData?: {
    ipCountry?: string;
    deviceConfidence?: number;
  }
): TransactionFeatures {
  return {
    amountCents: transaction.amountCents,
    sellerAvgAmountCents: sellerHistory.avgAmountCents,
    sellerAmountStdCents: sellerHistory.amountStdCents,
    velocity1h: sellerHistory.transactions1h,
    velocity24h: sellerHistory.transactions24h,
    timestamp: transaction.timestamp,
    sellerCountry: sellerHistory.country,
    ipCountry: geoData?.ipCountry,
    deviceConfidence: geoData?.deviceConfidence,
    isNewPaymentMethod: transaction.paymentMethodId
      ? !sellerHistory.knownPaymentMethods.includes(transaction.paymentMethodId)
      : false,
    sellerRiskTier: sellerHistory.riskTier,
  };
}

/**
 * Detect anomalies in a transaction
 * 
 * In production, this would use an ONNX Isolation Forest model.
 * For now, we use rule-based detection that approximates model behavior.
 */
export async function detectAnomalies(
  features: TransactionFeatures,
  requestId: string = crypto.randomUUID()
): Promise<AnomalyScore> {
  const modelVersion = getModelVersion('anomaly')?.version || '1.0.0-fallback';
  
  const signals: AnomalySignal[] = [];
  let totalScore = 0;

  // 1. Amount anomaly (Z-score)
  const amountZScore = FeatureExtraction.calculateZScore(
    Number(features.amountCents),
    Number(features.sellerAvgAmountCents),
    Number(features.sellerAmountStdCents)
  );
  
  if (Math.abs(amountZScore) > 3) {
    signals.push({
      type: 'amount',
      description: `Amount ${amountZScore > 0 ? 'much higher' : 'much lower'} than average (Z=${amountZScore.toFixed(2)})`,
      weight: 25,
    });
    totalScore += 25;
  } else if (Math.abs(amountZScore) > 2) {
    signals.push({
      type: 'amount',
      description: `Amount ${amountZScore > 0 ? 'higher' : 'lower'} than average`,
      weight: 15,
    });
    totalScore += 15;
  }

  // Check against hard limits
  if (features.amountCents > VELOCITY_LIMITS.maxSingleTxCents) {
    signals.push({
      type: 'amount',
      description: `Amount exceeds single transaction limit (${formatCents(VELOCITY_LIMITS.maxSingleTxCents)})`,
      weight: 40,
    });
    totalScore += 40;
  }

  // 2. Velocity anomaly
  if (features.velocity1h > VELOCITY_LIMITS.perHour) {
    signals.push({
      type: 'velocity',
      description: `Transaction velocity exceeded: ${features.velocity1h} in last hour`,
      weight: 30,
    });
    totalScore += 30;
  } else if (features.velocity1h > VELOCITY_LIMITS.perHour * 0.8) {
    signals.push({
      type: 'velocity',
      description: 'High transaction velocity',
      weight: 15,
    });
    totalScore += 15;
  }

  if (features.velocity24h > VELOCITY_LIMITS.perDay) {
    signals.push({
      type: 'velocity',
      description: `Daily transaction limit approached: ${features.velocity24h}`,
      weight: 20,
    });
    totalScore += 20;
  }

  // 3. Time-of-day anomaly
  if (FeatureExtraction.isUnusualHours(features.timestamp)) {
    signals.push({
      type: 'time',
      description: 'Transaction during unusual hours (00:00-05:00 Panama time)',
      weight: 10,
    });
    totalScore += 10;
  }

  // 4. Geographic anomaly
  if (features.ipCountry && features.ipCountry !== features.sellerCountry) {
    signals.push({
      type: 'geography',
      description: `IP country (${features.ipCountry}) differs from seller country (${features.sellerCountry})`,
      weight: 20,
    });
    totalScore += 20;
  }

  // 5. Device confidence
  if (features.deviceConfidence !== undefined && features.deviceConfidence < 0.5) {
    signals.push({
      type: 'device',
      description: 'Low device confidence score',
      weight: 10,
    });
    totalScore += 10;
  }

  // 6. New payment method
  if (features.isNewPaymentMethod) {
    signals.push({
      type: 'pattern',
      description: 'New payment method used',
      weight: 5,
    });
    totalScore += 5;
  }

  // 7. Seller risk tier multiplier
  if (features.sellerRiskTier === 'RED') {
    totalScore = Math.min(100, totalScore * 1.3);
  } else if (features.sellerRiskTier === 'BLACK') {
    totalScore = 100;
    signals.push({
      type: 'pattern',
      description: 'Seller account flagged as high risk',
      weight: 50,
    });
  }

  // Normalize score to 0-100
  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // Determine risk tier and action
  let riskTier: RiskTier;
  let recommendedAction: 'allow' | 'flag_for_review' | 'block';

  if (finalScore >= ANOMALY_THRESHOLDS.RED) {
    riskTier = 'BLACK';
    recommendedAction = 'block';
  } else if (finalScore >= ANOMALY_THRESHOLDS.YELLOW) {
    riskTier = 'RED';
    recommendedAction = 'flag_for_review';
  } else if (finalScore >= ANOMALY_THRESHOLDS.GREEN) {
    riskTier = 'YELLOW';
    recommendedAction = 'flag_for_review';
  } else {
    riskTier = 'GREEN';
    recommendedAction = 'allow';
  }

  const result: AnomalyScore = {
    score: finalScore,
    isAnomalous: finalScore >= ANOMALY_THRESHOLDS.YELLOW,
    riskTier,
    signals: signals.length > 0 ? signals : [{ type: 'pattern', description: 'No anomalies detected', weight: 0 }],
    recommendedAction,
    modelVersion,
  };

  // Log prediction
  logPrediction({
    modelName: 'anomaly',
    modelVersion,
    inputFeatures: features as Record<string, unknown>,
    prediction: result,
    confidence: 0.9,
    requestId,
  });

  return result;
}

/**
 * Format cents to human-readable string
 */
function formatCents(cents: bigint): string {
  const amount = Number(cents) / 100;
  return `B/. ${amount.toFixed(2)}`;
}

/**
 * Batch detect anomalies for multiple transactions
 */
export async function batchDetectAnomalies(
  transactions: Array<{ txId: string; features: TransactionFeatures }>
): Promise<Array<{ txId: string; score: AnomalyScore }>> {
  const results = await Promise.all(
    transactions.map(async ({ txId, features }) => ({
      txId,
      score: await detectAnomalies(features, `batch_${txId}`),
    }))
  );

  return results;
}

/**
 * Get velocity limits for validation
 */
export function getVelocityLimits(): typeof VELOCITY_LIMITS {
  return { ...VELOCITY_LIMITS };
}

/**
 * Check if transaction exceeds velocity limits
 */
export function checkVelocityLimits(
  amountCents: bigint,
  velocity1h: number,
  velocity24h: number,
  dailyVolumeCents: bigint
): { allowed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (amountCents > VELOCITY_LIMITS.maxSingleTxCents) {
    violations.push(`Amount exceeds maximum transaction limit`);
  }

  if (velocity1h > VELOCITY_LIMITS.perHour) {
    violations.push(`Hourly transaction limit exceeded (${velocity1h}/${VELOCITY_LIMITS.perHour})`);
  }

  if (velocity24h > VELOCITY_LIMITS.perDay) {
    violations.push(`Daily transaction limit exceeded (${velocity24h}/${VELOCITY_LIMITS.perDay})`);
  }

  if (dailyVolumeCents > VELOCITY_LIMITS.maxDailyVolumeCents) {
    violations.push(`Daily volume limit exceeded`);
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}
