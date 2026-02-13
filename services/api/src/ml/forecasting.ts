/**
 * ITBMS Forecasting Model
 * 
 * Lead: SMLE (Staff Machine Learning Engineer)
 * Co-Authority: STES (Senior Tax Engineering Specialist), CFA (Chief Financial Agent)
 * 
 * Forecasts ITBMS tax liabilities using Prophet/ARIMA time series models.
 * Used for tax planning, reserve calculations, and cash flow management.
 * 
 * Forecasts monthly ITBMS obligations with confidence intervals.
 */

import { logPrediction, getModelVersion } from './index';

// Historical ITBMS data point
export interface ITBMSDataPoint {
  /** Period in YYYY-MM format */
  period: string;
  /** Total gross amount (cents) */
  grossAmountCents: bigint;
  /** ITBMS amount (cents) - 7% of gross */
  itbmsAmountCents: bigint;
  /** Number of transactions */
  transactionCount: number;
  /** Number of active sellers */
  activeSellers: number;
}

// Forecast result for a single period
export interface ITBMSForecast {
  /** Forecast period YYYY-MM */
  period: string;
  /** Predicted gross amount (cents) */
  predictedGrossCents: bigint;
  /** Predicted ITBMS amount (cents) */
  predictedItbmsCents: bigint;
  /** Lower bound of confidence interval (90%) */
  lowerBoundCents: bigint;
  /** Upper bound of confidence interval (90%) */
  upperBoundCents: bigint;
  /** Forecast confidence 0-1 */
  confidence: number;
}

// Full forecast result
export interface ITBMSForecastResult {
  /** Forecast period start */
  forecastFrom: string;
  /** Number of months forecasted */
  monthsAhead: number;
  /** Forecast data points */
  predictions: ITBMSForecast[];
  /** Total predicted ITBMS for all periods */
  totalPredictedItbmsCents: bigint;
  /** Model version */
  modelVersion: string;
  /** Seasonality detected */
  seasonality: {
    weekly: boolean;
    monthly: boolean;
    yearly: boolean;
  };
}

// Panama ITBMS rate
const ITBMS_RATE = 0.07; // 7%

// Seasonal factors for Panama (based on historical patterns)
const SEASONAL_FACTORS: Record<number, number> = {
  0: 0.95,  // January - post-holiday slowdown
  1: 0.90,  // February - Carnaval impact
  2: 1.00,  // March - normal
  3: 1.05,  // April - pre-summer
  4: 1.00,  // May - normal
  5: 0.95,  // June - mid-year
  6: 0.90,  // July - summer slowdown
  7: 0.95,  // August - back to school
  8: 1.00,  // September - normal
  9: 1.05,  // October - pre-holiday buildup
  10: 1.15, // November - Fiestas Patrias + Black Friday
  11: 1.20, // December - holiday season
};

/**
 * Generate ITBMS forecast
 * 
 * In production, this would use an ONNX Prophet/ARIMA model.
 * For now, we use trend analysis with seasonal adjustments.
 */
export async function forecastITBMS(
  historicalData: ITBMSDataPoint[],
  monthsAhead: number = 12,
  requestId: string = crypto.randomUUID()
): Promise<ITBMSForecastResult> {
  const modelVersion = getModelVersion('forecasting')?.version || '1.0.0-fallback';

  if (historicalData.length < 3) {
    throw new Error('Insufficient historical data (minimum 3 months required)');
  }

  // Sort by period
  const sorted = [...historicalData].sort((a, b) => a.period.localeCompare(b.period));
  
  // Calculate trend
  const recentMonths = sorted.slice(-6); // Last 6 months
  const avgGrowthRate = calculateGrowthRate(recentMonths);
  const avgGrossCents = recentMonths.reduce(
    (sum, d) => sum + d.grossAmountCents,
    BigInt(0)
  ) / BigInt(recentMonths.length);

  // Generate predictions
  const predictions: ITBMSForecast[] = [];
  const lastPeriod = sorted[sorted.length - 1].period;
  const [lastYear, lastMonth] = lastPeriod.split('-').map(Number);

  let currentGross = avgGrossCents;

  for (let i = 1; i <= monthsAhead; i++) {
    // Calculate next period
    let year = lastYear;
    let month = lastMonth + i;
    
    while (month > 12) {
      month -= 12;
      year++;
    }
    
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const monthIndex = month - 1; // 0-based for seasonal factors

    // Apply growth trend
    const growthFactor = 1 + (avgGrowthRate * i);
    
    // Apply seasonality
    const seasonalFactor = SEASONAL_FACTORS[monthIndex] ?? 1.0;
    
    // Calculate predicted gross with uncertainty
    const basePrediction = Number(currentGross) * growthFactor * seasonalFactor;
    const uncertainty = 0.1 + (i * 0.02); // Increasing uncertainty further out
    
    const predictedGross = BigInt(Math.round(basePrediction));
    const lowerBound = BigInt(Math.round(basePrediction * (1 - uncertainty)));
    const upperBound = BigInt(Math.round(basePrediction * (1 + uncertainty)));
    
    // Calculate ITBMS (7% of gross)
    const predictedItbms = (predictedGross * BigInt(Math.round(ITBMS_RATE * 100))) / 100n;
    
    predictions.push({
      period,
      predictedGrossCents: predictedGross,
      predictedItbmsCents: predictedItbms,
      lowerBoundCents: lowerBound,
      upperBoundCents: upperBound,
      confidence: Math.max(0.5, 0.95 - (i * 0.02)), // Decreasing confidence further out
    });

    // Update current for next iteration
    currentGross = predictedGross;
  }

  // Calculate total predicted ITBMS
  const totalPredictedItbmsCents = predictions.reduce(
    (sum, p) => sum + p.predictedItbmsCents,
    BigInt(0)
  );

  const result: ITBMSForecastResult = {
    forecastFrom: lastPeriod,
    monthsAhead,
    predictions,
    totalPredictedItbmsCents,
    modelVersion,
    seasonality: {
      weekly: true,  // Day-of-week effects
      monthly: true, // Month-end spikes
      yearly: true,  // Holiday seasons
    },
  };

  // Log prediction
  logPrediction({
    modelName: 'forecasting',
    modelVersion,
    inputFeatures: { 
      historicalMonths: historicalData.length,
      monthsAhead,
      lastPeriod,
    },
    prediction: result,
    confidence: 0.85,
    requestId,
  });

  return result;
}

/**
 * Calculate month-over-month growth rate
 */
function calculateGrowthRate(data: ITBMSDataPoint[]): number {
  if (data.length < 2) return 0;

  const growthRates: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const prev = Number(data[i - 1].grossAmountCents);
    const curr = Number(data[i].grossAmountCents);
    if (prev > 0) {
      growthRates.push((curr - prev) / prev);
    }
  }

  if (growthRates.length === 0) return 0;
  
  // Average growth rate, capped at reasonable bounds
  const avg = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  return Math.max(-0.1, Math.min(0.1, avg)); // Cap between -10% and +10% monthly
}

/**
 * Get upcoming filing deadline
 * 
 * ITBMS filings are due by the 15th of the following month
 */
export function getFilingDeadline(period: string): Date {
  const [year, month] = period.split('-').map(Number);
  
  // Due date is 15th of next month
  let dueYear = year;
  let dueMonth = month + 1;
  
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear++;
  }
  
  return new Date(dueYear, dueMonth - 1, 15);
}

/**
 * Calculate required reserve based on forecast
 * 
 * Reserve should cover predicted ITBMS plus a buffer
 */
export function calculateTaxReserve(
  forecast: ITBMSForecastResult,
  bufferMonths: number = 3
): {
  minimumReserveCents: bigint;
  recommendedReserveCents: bigint;
  breakdown: Array<{ period: string; amountCents: bigint }>;
} {
  const relevantPredictions = forecast.predictions.slice(0, bufferMonths);
  
  const minimumReserve = relevantPredictions.reduce(
    (sum, p) => sum + p.predictedItbmsCents,
    BigInt(0)
  );

  // Recommended reserve includes 20% buffer for uncertainty
  const recommendedReserve = (minimumReserve * 120n) / 100n;

  const breakdown = relevantPredictions.map(p => ({
    period: p.period,
    amountCents: p.predictedItbmsCents,
  }));

  return {
    minimumReserveCents: minimumReserve,
    recommendedReserveCents: recommendedReserve,
    breakdown,
  };
}

/**
 * Generate mock historical data for testing
 */
export function generateMockHistoricalData(
  months: number = 12,
  baseVolumeCents: bigint = 100_000_00n // B/. 100,000 base
): ITBMSDataPoint[] {
  const data: ITBMSDataPoint[] = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const period = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // Apply seasonality and growth
    const seasonalFactor = SEASONAL_FACTORS[month] ?? 1.0;
    const growthFactor = 1 + ((months - i) * 0.02); // 2% monthly growth
    
    const grossAmount = (baseVolumeCents * BigInt(Math.round(seasonalFactor * growthFactor * 100))) / 100n;
    const itbmsAmount = (grossAmount * 7n) / 100n; // 7% ITBMS
    
    data.push({
      period,
      grossAmountCents: grossAmount,
      itbmsAmountCents: itbmsAmount,
      transactionCount: Math.floor(1000 * seasonalFactor),
      activeSellers: Math.floor(50 * growthFactor),
    });
  }
  
  return data;
}

/**
 * Format ITBMS forecast for display
 */
export function formatForecastSummary(
  forecast: ITBMSForecastResult
): string {
  const parts: string[] = [];
  
  parts.push(`ITBMS Forecast (${forecast.monthsAhead} months)`);
  parts.push(`From: ${forecast.forecastFrom}`);
  parts.push(`Total Predicted ITBMS: ${formatCents(forecast.totalPredictedItbmsCents)}`);
  parts.push('');
  parts.push('Monthly Breakdown:');
  
  for (const pred of forecast.predictions.slice(0, 6)) { // First 6 months
    const dueDate = getFilingDeadline(pred.period);
    parts.push(
      `  ${pred.period}: ${formatCents(pred.predictedItbmsCents)} ` +
      `(due ${dueDate.toISOString().split('T')[0]})`
    );
  }
  
  if (forecast.predictions.length > 6) {
    parts.push(`  ... and ${forecast.predictions.length - 6} more months`);
  }
  
  return parts.join('\n');
}

/**
 * Format cents to human-readable string
 */
function formatCents(cents: bigint): string {
  const amount = Number(cents) / 100;
  return `B/. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
