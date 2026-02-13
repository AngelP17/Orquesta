import type { AppConfig } from '../config';

export class AnalyticsAPI {
  constructor(private readonly config: AppConfig) {}

  async sendEvent(event: {
    eventType: string;
    projectId: string;
    sellerId?: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }): Promise<void> {
    if (!this.config.ANALYTICS_API_URL || !this.config.ANALYTICS_API_KEY) {
      return;
    }

    const response = await fetch(this.config.ANALYTICS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.ANALYTICS_API_KEY}`
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`Analytics API failed with status ${response.status}`);
    }
  }
}
