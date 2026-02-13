/**
 * Churn Prediction Model
 * 
 * Lead: SMLE (Staff Machine Learning Engineer)
 * Co-Authority: SFRE (Staff Fraud & Risk Engineer), CFA (Chief Financial Agent)
 * 
 * Predicts seller churn probability using XGBoost model with RFM features:
 * - Recency: Days since last transaction
 * - Frequency: Transactions per month
 * - Monetary: Total GMV (Gross Merchandise Value)
 * 
 * Output: Probability 0-1, where >0.7 triggers retention workflow
 */

import { logPrediction, FeatureExtraction, getModelVersion } from './index';

// Churn risk levels
export type ChurnRiskLevel = 'low' | 'medium' | 'high';

// Feature vector for churn prediction
export interface ChurnFeatures {
  /** Days since last transaction */
  recencyDays: number;
  /** Number of transactions in last 30 days */
  frequency30d: number;
  /** Total GMV in last 30 days (cents) */
  monetary30dCents: bigint;
  /** Average transaction size (cents) */
  avgTransactionCents: bigint;
  /** Support tickets in last 30 days */
  supportTicketCount: number;
  /** Days since seller onboarding */
  tenureDays: number;
  /** Percentage change in volume vs previous month */
  volumeChangePercent: number;
}

// Prediction output
export interface ChurnPrediction {
  /** Churn probability 0-1 */
  probability: number;
  /** Risk level classification */
  riskLevel: ChurnRiskLevel;
  /** Contributing factors */
  contributingFactors: string[];
  /** Recommended actions */
  recommendedActions: string[];
  /** Model version used */
  modelVersion: string;
}

// Thresholds for risk levels
const RISK_THRESHOLDS = {
  low: 0.3,
  medium: 0.7,
  high: 1.0,
};

/**
 * Extract features from seller data for churn prediction
 */
export function extractChurnFeatures(
  sellerData: {
    lastTransactionAt?: Date;
    transactionCount30d: number;
    totalVolume30dCents: bigint;
    avgTransactionCents: bigint;
    supportTickets30d: number;
    createdAt: Date;
    previousMonthVolumeCents: bigint;
  }
): ChurnFeatures {
  const now = new Date();
  const createdAt = new Date(sellerData.createdAt);
  const tenureDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  let volumeChangePercent = 0;
  if (sellerData.previousMonthVolumeCents > BigInt(0)) {
    const current = Number(sellerData.totalVolume30dCents);
    const previous = Number(sellerData.previousMonthVolumeCents);
    volumeChangePercent = ((current - previous) / previous) * 100;
  }

  return {
    recencyDays: sellerData.lastTransactionAt
      ? FeatureExtraction.calculateRecency(sellerData.lastTransactionAt)
      : 999,
    frequency30d: sellerData.transactionCount30d,
    monetary30dCents: sellerData.totalVolume30dCents,
    avgTransactionCents: sellerData.avgTransactionCents,
    supportTicketCount: sellerData.supportTickets30d,
    tenureDays,
    volumeChangePercent,
  };
}

/**
 * Predict churn probability for a seller
 * 
 * In production, this would load and run an ONNX XGBoost model.
 * For now, we use a rule-based heuristic that approximates model behavior.
 */
export async function predictChurn(
  features: ChurnFeatures,
  requestId: string = crypto.randomUUID()
): Promise<ChurnPrediction> {
  const modelVersion = getModelVersion('churn')?.version || '1.0.0-fallback';

  // Calculate weighted score based on features
  // This simulates what an XGBoost model would output
  let score = 0;
  const factors: string[] = [];

  // Recency (higher = worse)
  if (features.recencyDays > 30) {
    score += 0.3;
    factors.push('No transactions in 30+ days');
  } else if (features.recencyDays > 14) {
    score += 0.15;
    factors.push('No transactions in 14+ days');
  }

  // Frequency (lower = worse)
  if (features.frequency30d === 0) {
    score += 0.25;
    factors.push('Zero transactions this month');
  } else if (features.frequency30d < 5) {
    score += 0.1;
    factors.push('Low transaction frequency');
  }

  // Volume change (negative = worse)
  if (features.volumeChangePercent < -50) {
    score += 0.2;
    factors.push('Volume dropped >50% vs last month');
  } else if (features.volumeChangePercent < -25) {
    score += 0.1;
    factors.push('Volume dropped >25% vs last month');
  }

  // Support tickets (higher = worse)
  if (features.supportTicketCount > 3) {
    score += 0.15;
    factors.push('High support ticket volume');
  }

  // Tenure (new sellers are higher risk)
  if (features.tenureDays < 30) {
    score += 0.1;
    factors.push('New seller (< 30 days)');
  }

  // Normalize score to 0-1
  const probability = Math.min(1, Math.max(0, score));

  // Determine risk level
  let riskLevel: ChurnRiskLevel;
  if (probability >= RISK_THRESHOLDS.medium) {
    riskLevel = 'high';
  } else if (probability >= RISK_THRESHOLDS.low) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Generate recommendations
  const recommendedActions = generateRecommendations(features, riskLevel);

  const prediction: ChurnPrediction = {
    probability,
    riskLevel,
    contributingFactors: factors.length > 0 ? factors : ['Normal activity pattern'],
    recommendedActions,
    modelVersion,
  };

  // Log prediction for audit trail
  logPrediction({
    modelName: 'churn',
    modelVersion,
    inputFeatures: features as Record<string, unknown>,
    prediction,
    confidence: 0.85, // Simulated confidence
    requestId,
  });

  return prediction;
}

/**
 * Generate recommended actions based on risk level and features
 */
function generateRecommendations(
  features: ChurnFeatures,
  riskLevel: ChurnRiskLevel
): string[] {
  const actions: string[] = [];

  if (riskLevel === 'high') {
    actions.push('Immediate: Contact seller via phone');
    actions.push('Offer: Reduced fees for next 30 days');
    actions.push('Schedule: Account manager check-in');
  } else if (riskLevel === 'medium') {
    actions.push('Send: Re-engagement email campaign');
    actions.push('Offer: Feature tutorial or training');
    
    if (features.supportTicketCount > 0) {
      actions.push('Review: Recent support tickets for unresolved issues');
    }
  } else {
    actions.push('Continue: Standard engagement');
    actions.push('Monitor: Monthly health check');
  }

  if (features.recencyDays > 7) {
    actions.push('Trigger: "We miss you" notification');
  }

  return actions;
}

/**
 * Batch predict churn for multiple sellers
 */
export async function batchPredictChurn(
  sellers: Array<{ sellerId: string; features: ChurnFeatures }>
): Promise<Array<{ sellerId: string; prediction: ChurnPrediction }>> {
  const results = await Promise.all(
    sellers.map(async ({ sellerId, features }) => ({
      sellerId,
      prediction: await predictChurn(features, `batch_${sellerId}`),
    }))
  );

  return results;
}

/**
 * Get sellers requiring retention outreach
 * Returns sellers with high churn probability (>0.7)
 */
export function getHighRiskSellers(
  predictions: Array<{ sellerId: string; prediction: ChurnPrediction }>
): Array<{ sellerId: string; prediction: ChurnPrediction }> {
  return predictions.filter(p => p.prediction.riskLevel === 'high');
}
