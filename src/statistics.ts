import type { CallRecord, Statistics } from './types';

export class StatisticsTracker {
  private successCount: number = 0;
  private failureCount: number = 0;
  private totalTokens: number = 0;
  private totalCost: number = 0;
  private totalResponseTime: number = 0;
  private totalRequests: number = 0;
  private startTime: string;
  private codingplanLimit?: number;

  constructor(codingplanLimit?: number) {
    this.startTime = new Date().toISOString();
    if (codingplanLimit && codingplanLimit > 0) {
      this.codingplanLimit = codingplanLimit;
    }
  }

  addRecord(record: CallRecord): void {
    this.totalRequests++;

    const isSuccess = !record.error && record.response?.status && record.response.status >= 200 && record.response.status < 300;

    if (isSuccess) {
      this.successCount++;
      this.totalTokens += record.response?.usage?.totalTokens || 0;
      this.totalCost += record.response?.cost || 0;
    } else {
      this.failureCount++;
    }

    if (record.durationMs) {
      this.totalResponseTime += record.durationMs;
    }
  }

  getStats(): Statistics {
    const averageResponseTime = this.totalRequests > 0 
      ? this.totalResponseTime / this.totalRequests 
      : 'N/A';

    const stats: Statistics = {
      successCount: this.successCount,
      failureCount: this.failureCount,
      totalTokens: this.totalTokens,
      totalCost: this.totalCost,
      averageResponseTime,
      totalRequests: this.totalRequests,
      startTime: this.startTime
    };

    if (this.codingplanLimit) {
      stats.codingplanLimit = this.codingplanLimit;
      stats.remaining = Math.max(this.codingplanLimit - this.totalRequests, 0);
      stats.usagePercent = (this.totalRequests / this.codingplanLimit) * 100;
    }

    return stats;
  }
}
