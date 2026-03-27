import * as readline from 'readline';
import { t } from './i18n';

export interface CodingPlanConfig {
  type: 'requests' | 'tokens';
  limit: number;
  startingCount: number;
}

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

export async function promptForPlanConfig(): Promise<CodingPlanConfig> {
  const rl = createInterface();

  try {
    const typeAnswer = await question(rl, `${t.selectPlanType}\n1) ${t.planTypeRequests}\n2) ${t.planTypeTokens}\n> `);
    let type: 'requests' | 'tokens';
    if (typeAnswer === '1') {
      type = 'requests';
    } else if (typeAnswer === '2') {
      type = 'tokens';
    } else {
      throw new Error('Invalid plan type. Please enter 1 or 2.');
    }

    const limitStr = await question(rl, `${t.enterTotalLimit} `);
    const limit = parseFloat(limitStr.replace(/,/g, ''));
    if (isNaN(limit) || limit <= 0) {
      throw new Error('Invalid limit. Please enter a positive number.');
    }

    const startingCountStr = await question(rl, `${t.enterStartingCount} `);
    let startingCount: number;

    if (startingCountStr.endsWith('%')) {
      const percentageStr = startingCountStr.slice(0, -1).trim();
      const percentage = parseFloat(percentageStr.replace(/,/g, ''));
      if (isNaN(percentage)) {
        throw new Error('Invalid percentage. Please enter a valid number.');
      }
      if (percentage > 100) {
        throw new Error(t.percentageExceedsLimit);
      }
      startingCount = limit * percentage / 100;
    } else if (startingCountStr.trim() === '') {
      startingCount = 0;
    } else {
      const parsed = parseFloat(startingCountStr.replace(/,/g, ''));
      if (isNaN(parsed)) {
        throw new Error('Invalid starting count. Please enter a number or percentage.');
      }
      if (parsed > limit) {
        throw new Error(t.startingCountExceedsLimit);
      }
      startingCount = parsed;
    }

    return { type, limit, startingCount };
  } finally {
    rl.close();
  }
}
