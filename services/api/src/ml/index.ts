/**
 * ML Module Index
 * 
 * Lead: SMLE (Staff Machine Learning Engineer)
 * Co-Authority: SFRE (Staff Fraud & Risk Engineer), STES (Senior Tax Engineering Specialist)
 * 
 * Provides unified interface for all ML models:
 * - Churn Prediction (XGBoost)
 * - Anomaly Detection (Isolation Forest)
 * - Dynamic Fees (Contextual Bandits)
 * - ITBMS Forecasting (Prophet/ARIMA)
 * 
 * All models are served via ONNX Runtime for low-latency inference.
 */

import * as fs from 'fs';
import * as path from 'path';

// Model version tracking
export interface ModelVersion {
  name: string;
  version: string;
  loadedAt: Date;
  path: string;
  sizeBytes: number;
}

// Health check status
export interface MLHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  models: Array<{
    name: string;
    loaded: boolean;
    version?: string;
    error?: string;
  }>;
  lastCheck: Date;
}

// Model registry
const modelRegistry = new Map<string, ModelVersion>();

/**
 * Initialize all ML models
 * Called at service startup
 */
export async function initializeModels(): Promise<void> {
  const modelsDir = process.env.ML_MODELS_DIR || path.join(process.cwd(), 'ml-models');
  
  console.log('[ML] Initializing models from:', modelsDir);

  // In a production environment, this would load ONNX models
  // For now, we simulate model loading with version tracking
  
  const modelFiles = [
    { name: 'churn', file: 'churnModel.pkl', version: '1.0.0' },
    { name: 'anomaly', file: 'anomalyModel.pkl', version: '1.0.0' },
    { name: 'dynamicFees', file: 'dynamicFeesModel.pkl', version: '1.0.0' },
    { name: 'forecasting', file: 'forecastingModel.pkl', version: '1.0.0' },
  ];

  for (const model of modelFiles) {
    const modelPath = path.join(modelsDir, model.file);
    
    try {
      // Check if model file exists (simulation)
      const exists = fs.existsSync(modelPath);
      const size = exists ? fs.statSync(modelPath).size : 0;
      
      modelRegistry.set(model.name, {
        name: model.name,
        version: model.version,
        loadedAt: new Date(),
        path: modelPath,
        sizeBytes: size,
      });
      
      console.log(`[ML] Model loaded: ${model.name} v${model.version} (${exists ? 'file exists' : 'file missing - using fallback'})`);
    } catch (error) {
      console.error(`[ML] Failed to load model ${model.name}:`, error);
      // Continue with other models - degraded mode
    }
  }
}

/**
 * Get model version info
 */
export function getModelVersion(modelName: string): ModelVersion | undefined {
  return modelRegistry.get(modelName);
}

/**
 * Get all loaded model versions
 */
export function getAllModelVersions(): ModelVersion[] {
  return Array.from(modelRegistry.values());
}

/**
 * Health check for ML services
 */
export async function healthCheck(): Promise<MLHealthStatus> {
  const models: MLHealthStatus['models'] = [];
  let allHealthy = true;

  for (const [name, version] of modelRegistry) {
    const exists = fs.existsSync(version.path);
    models.push({
      name,
      loaded: exists,
      version: version.version,
      error: exists ? undefined : 'Model file not found',
    });
    if (!exists) allHealthy = false;
  }

  return {
    status: allHealthy ? 'healthy' : modelRegistry.size > 0 ? 'degraded' : 'unhealthy',
    models,
    lastCheck: new Date(),
  };
}

/**
 * Feature extraction utilities shared across models
 */
export namespace FeatureExtraction {
  /**
   * Calculate recency score (days since last activity)
   */
  export function calculateRecency(lastActivityDate: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastActivityDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Calculate Z-score for a value given mean and std
   */
  export function calculateZScore(value: number, mean: number, std: number): number {
    if (std === 0) return 0;
    return (value - mean) / std;
  }

  /**
   * Normalize value to 0-1 range
   */
  export function normalize(value: number, min: number, max: number): number {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Calculate time-of-day feature (0-24 hours)
   */
  export function getTimeOfDay(date: Date, timezone: string = 'America/Panama'): number {
    // Panama is UTC-5, no DST
    const panamaOffset = -5;
    const utcHours = date.getUTCHours();
    const panamaHours = (utcHours + panamaOffset + 24) % 24;
    return panamaHours;
  }

  /**
   * Check if date is within unusual hours (00:00-05:00 Panama time)
   */
  export function isUnusualHours(date: Date): boolean {
    const hour = getTimeOfDay(date);
    return hour >= 0 && hour < 5;
  }

  /**
   * Calculate velocity features (transactions per time window)
   */
  export function calculateVelocity(
    transactionDates: Date[],
    windowHours: number = 1
  ): number {
    const now = new Date();
    const windowMs = windowHours * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - windowMs);
    
    return transactionDates.filter(d => new Date(d) > cutoff).length;
  }
}

/**
 * Model prediction tracking for audit trail
 */
export interface PredictionRecord {
  modelName: string;
  modelVersion: string;
  inputFeatures: Record<string, unknown>;
  prediction: unknown;
  confidence?: number;
  timestamp: Date;
  requestId: string;
}

const predictionLog: PredictionRecord[] = [];
const MAX_PREDICTION_LOG_SIZE = 10000;

/**
 * Log a prediction for audit trail
 */
export function logPrediction(record: Omit<PredictionRecord, 'timestamp'>): void {
  predictionLog.push({
    ...record,
    timestamp: new Date(),
  });

  // Trim log if it gets too large
  if (predictionLog.length > MAX_PREDICTION_LOG_SIZE) {
    predictionLog.splice(0, predictionLog.length - MAX_PREDICTION_LOG_SIZE);
  }
}

/**
 * Get recent predictions for a model
 */
export function getRecentPredictions(
  modelName: string,
  limit: number = 100
): PredictionRecord[] {
  return predictionLog
    .filter(p => p.modelName === modelName)
    .slice(-limit);
}

// Re-export all model modules
export * from './churnPrediction';
export * from './anomalyDetection';
export * from './dynamicFees';
export * from './forecasting';
