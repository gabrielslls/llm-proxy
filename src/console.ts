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

    const formatStartTime = (isoString: string): string => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const headerContent = `Global Statistics (since ${formatStartTime(stats.startTime)})`;
    const tableWidth = Math.max(headerContent.length, 45) + 2;

    const createHorizontalLine = (leftChar: string, fillChar: string, rightChar: string): string => {
      return leftChar + fillChar.repeat(tableWidth - 2) + rightChar;
    };

    const createContentLine = (content: string): string => {
      const paddedContent = content.padEnd(tableWidth - 2);
      return `│${paddedContent}│`;
    };

    const lines: string[] = [];
    lines.push(createHorizontalLine('┌', '─', '┐'));
    lines.push(createContentLine(headerContent));
    lines.push(createHorizontalLine('├', '─', '┤'));
    lines.push(createContentLine(`Success requests:     ${formatNumber(stats.successCount).padStart(10)}`));
    lines.push(createContentLine(`Failed requests:      ${formatNumber(stats.failureCount).padStart(10)}`));
    lines.push(createContentLine(`Total tokens consumed:${formatNumber(stats.totalTokens).padStart(10)}`));
    lines.push(createContentLine(`Total cost:           ${formatCost(stats.totalCost).padStart(10)}`));
    lines.push(createContentLine(`Average response time:${formatResponseTime(stats.averageResponseTime).padStart(10)}`));
    lines.push(createHorizontalLine('└', '─', '┘'));

    console.log('\n' + lines.join('\n') + '\n');
  }
}
