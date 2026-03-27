import { StatisticsTracker } from './statistics';
import type { Statistics } from './types';
import { t } from './i18n';

export class ConsoleStats {
  private statisticsTracker: StatisticsTracker;
  private enabled: boolean = true;
  private lastEnterTime: number = 0;
  private originalIsRaw: boolean | undefined;
  private lastStatsDisplayTime: number = 0;

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

    if (now - this.lastStatsDisplayTime < 2000) {
      const cleanup = () => {
        if (this.enabled && process.stdin.isTTY) {
          process.stdin.setRawMode(this.originalIsRaw ?? false);
        }
      };
      cleanup();
      process.exit(0);
    } else {
      const stats = this.statisticsTracker.getStats();
      this.displayStats(stats);
      this.lastStatsDisplayTime = now;
    }
  }

  private displayStats(stats: Statistics): void {
    const formatNumber = (num: number): string => {
      return new Intl.NumberFormat().format(num);
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

    // Calculate visual width: English chars = 1, Chinese chars = 2
    const getVisualWidth = (str: string): number => {
      let width = 0;
      for (const char of str) {
        width += (char.charCodeAt(0) > 127) ? 2 : 1;
      }
      return width;
    };

    // Custom padEnd for visual alignment
    const visualPadEnd = (str: string, targetWidth: number): string => {
      const currentWidth = getVisualWidth(str);
      const padLength = targetWidth - currentWidth;
      return padLength > 0 ? str + ' '.repeat(padLength) : str;
    };

    // Right-align numbers accounting for visual width of label
    const alignRight = (label: string, value: string, totalWidth: number): string => {
      const labelWidth = getVisualWidth(label);
      const valueWidth = getVisualWidth(value);
      const spaceBetween = totalWidth - labelWidth - valueWidth;
      return label + ' '.repeat(Math.max(1, spaceBetween)) + value;
    };

    const headerContent = t.globalStats.replace('{time}', formatStartTime(stats.startTime));
    let tableWidth = Math.max(getVisualWidth(headerContent), 45) + 2;

    if (stats.codingplanLimit) {
      const codingplanLines = [
        alignRight(t.codingPlanLimit + ':', formatNumber(stats.codingplanLimit), 45),
        alignRight(t.used + ':', formatNumber(stats.currentUsage || 0), 45),
        alignRight(t.remaining + ':', formatNumber(stats.remaining || 0), 45),
        alignRight(t.usage + ':', `${(stats.usagePercent || 0).toFixed(1)}%`, 45)
      ];
      const maxCodingplanLineLength = Math.max(...codingplanLines.map(l => getVisualWidth(l)));
      tableWidth = Math.max(tableWidth, maxCodingplanLineLength + 2);
    }

    const createHorizontalLine = (leftChar: string, fillChar: string, rightChar: string): string => {
      return leftChar + fillChar.repeat(tableWidth - 2) + rightChar;
    };

    const createContentLine = (content: string): string => {
      const paddedContent = visualPadEnd(content, tableWidth - 2);
      return `│${paddedContent}│`;
    };

    const lines: string[] = [];
    const contentWidth = tableWidth - 2;
    lines.push(createHorizontalLine('┌', '─', '┐'));
    lines.push(createContentLine(headerContent));
    lines.push(createHorizontalLine('├', '─', '┤'));
    lines.push(createContentLine(alignRight(t.successRequests, formatNumber(stats.successCount), contentWidth)));
    lines.push(createContentLine(alignRight(t.rateLimitedRequests, formatNumber(stats.rateLimitCount), contentWidth)));
    lines.push(createContentLine(alignRight(t.failedRequests, formatNumber(stats.failureCount), contentWidth)));
    lines.push(createContentLine(alignRight(t.totalTokens, formatNumber(stats.totalTokens), contentWidth)));
    lines.push(createContentLine(alignRight(t.avgResponseTime, formatResponseTime(stats.averageResponseTime), contentWidth)));
    
    if (stats.codingplanLimit) {
      lines.push(createHorizontalLine('├', '─', '┤'));
      const typeLabel = stats.codingplanType === 'requests' ? t.planTypeRequests : t.planTypeTokens;
      lines.push(createContentLine(alignRight(t.planType, typeLabel, contentWidth)));
      lines.push(createContentLine(alignRight(t.codingPlanLimit, formatNumber(stats.codingplanLimit), contentWidth)));
      const usedValue = formatNumber(stats.currentUsage || 0);
      lines.push(createContentLine(alignRight(t.used, usedValue, contentWidth)));
      lines.push(createContentLine(alignRight(t.remaining, formatNumber(stats.remaining || 0), contentWidth)));
      lines.push(createContentLine(alignRight(t.usage, `${(stats.usagePercent || 0).toFixed(1)}%`, contentWidth)));
    }
    
    lines.push(createHorizontalLine('└', '─', '┘'));

    console.log('\n' + lines.join('\n') + '\n');
    if (stats.codingplanLimit && stats.usagePercent && stats.usagePercent >= 100) {
      console.log(t.warningLimit + '\n');
    }
    if (stats.codingplanLimit) {
      console.log(t.countSyncNotice + '\n');
    }
    console.log(t.tokenNotice + '\n');
  }
}
