import { StatisticsTracker } from './statistics';
import type { Statistics } from './types';

export class ConsoleStats {
  private statisticsTracker: StatisticsTracker;
  private enabled: boolean = true;
  private lastEnterTime: number = 0;
  private originalIsRaw: boolean | undefined;

  constructor(statisticsTracker: StatisticsTracker) {
    this.statisticsTracker = statisticsTracker;

    if (!process.stdin.isTTY) {
      console.log('Statistics console disabled (non-TTY environment)');
      this.enabled = false;
      return;
    }

    this.originalIsRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (data: string) => {
      if (data === '\r' || data === '\n') {
        this.handleEnter();
      } else if (data === '\u0003') {
        process.emit('SIGINT');
      }
    });

    const cleanup = () => {
      if (this.enabled && process.stdin.isTTY) {
        process.stdin.setRawMode(this.originalIsRaw ?? false);
      }
    };

    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
    process.on('exit', cleanup);
  }

  private handleEnter(): void {
    const now = Date.now();
    if (now - this.lastEnterTime < 100) {
      return;
    }
    this.lastEnterTime = now;

    const stats = this.statisticsTracker.getStats();
    this.displayStats(stats);
  }

  private displayStats(stats: Statistics): void {
    const formatNumber = (num: number): string => {
      return new Intl.NumberFormat().format(num);
    };

    const formatCost = (cost: number): string => {
      return `$${cost.toFixed(4)}`;
    };

    const formatResponseTime = (time: number | string): string => {
      if (time === 'N/A') {
        return 'N/A';
      }
      return `${Math.round(time as number)}ms`;
    };

    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────┐');
    lines.push(`│ Global Statistics (since ${stats.startTime}) │`);
    lines.push('├─────────────────────────────────────────┤');
    lines.push(`│ Success requests:     ${formatNumber(stats.successCount).padStart(10)} │`);
    lines.push(`│ Failed requests:      ${formatNumber(stats.failureCount).padStart(10)} │`);
    lines.push(`│ Total tokens consumed:${formatNumber(stats.totalTokens).padStart(10)} │`);
    lines.push(`│ Total cost:           ${formatCost(stats.totalCost).padStart(10)} │`);
    lines.push(`│ Average response time:${formatResponseTime(stats.averageResponseTime).padStart(10)} │`);
    lines.push('└─────────────────────────────────────────┘');

    console.log('\n' + lines.join('\n') + '\n');
  }
}
