import type { CallRecord, Statistics, CodingPlanConfig } from './types';

export class StatisticsTracker {
  private successCount: number = 0;
  private failureCount: number = 0;
  private rateLimitCount: number = 0;
  private totalTokens: number = 0;
  private totalResponseTime: number = 0;
  private totalRequests: number = 0;
  private startTime: string;
  private codingplanLimit?: number;
  private codingplanConfig?: CodingPlanConfig;
  private currentUsage: number = 0;

  constructor(codingplanLimit?: number, codingplanConfig?: CodingPlanConfig) {
    this.startTime = new Date().toISOString();
    if (codingplanConfig && codingplanConfig.limit > 0) {
      this.codingplanConfig = codingplanConfig;
      this.codingplanLimit = codingplanConfig.limit;
      this.currentUsage = codingplanConfig.startingCount;
    } else if (codingplanLimit && codingplanLimit > 0) {
      // Backward compatibility: create config for requests type
      this.codingplanLimit = codingplanLimit;
      this.codingplanConfig = {
        type: 'requests',
        limit: codingplanLimit,
        startingCount: 0
      };
      this.currentUsage = 0;
    }
  }

  addRecord(record: CallRecord): void {
    this.totalRequests++;

    const status = record.response?.status;
    const isSuccess = status && status >= 200 && status < 300;
    const isRateLimit = status === 429;

    if (isSuccess) {
      this.successCount++;
      this.totalTokens += record.response?.usage?.totalTokens || 0;

      // Update currentUsage based on plan type
      if (this.codingplanConfig) {
        if (this.codingplanConfig.type === 'requests') {
          this.currentUsage += 1;
        } else if (this.codingplanConfig.type === 'tokens') {
          this.currentUsage += record.response?.usage?.totalTokens || 0;
        }
      }
    } else if (isRateLimit) {
      this.rateLimitCount++;
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
      rateLimitCount: this.rateLimitCount,
      totalTokens: this.totalTokens,
      averageResponseTime,
      totalRequests: this.totalRequests,
      startTime: this.startTime
    };

    if (this.codingplanConfig) {
      stats.codingplanLimit = this.codingplanConfig.limit;
      stats.codingplanType = this.codingplanConfig.type;
      stats.startingCount = this.codingplanConfig.startingCount;
      stats.remaining = Math.max(this.codingplanConfig.limit - this.currentUsage, 0);
      stats.usagePercent = (this.currentUsage / this.codingplanConfig.limit) * 100;
    }

    return stats;
  }
}
