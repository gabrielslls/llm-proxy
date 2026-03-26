import * as readline from 'readline';

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
    const typeAnswer = await question(rl, 'Select plan type:\n1) Requests counting\n2) Tokens counting\n> ');
    let type: 'requests' | 'tokens';
    if (typeAnswer === '1') {
      type = 'requests';
    } else if (typeAnswer === '2') {
      type = 'tokens';
    } else {
      throw new Error('Invalid plan type. Please enter 1 or 2.');
    }

    const limitStr = await question(rl, 'Enter total limit: ');
    const limit = parseFloat(limitStr);
    if (isNaN(limit) || limit <= 0) {
      throw new Error('Invalid limit. Please enter a positive number.');
    }

    const startingCountStr = await question(rl, 'Enter starting count (number or %): ');
    let startingCount: number;

    if (startingCountStr.endsWith('%')) {
      const percentageStr = startingCountStr.slice(0, -1).trim();
      const percentage = parseFloat(percentageStr);
      if (isNaN(percentage)) {
        throw new Error('Invalid percentage. Please enter a valid number.');
      }
      startingCount = limit * percentage / 100;
    } else if (startingCountStr.trim() === '') {
      startingCount = 0;
    } else {
      const parsed = parseFloat(startingCountStr);
      if (isNaN(parsed)) {
        throw new Error('Invalid starting count. Please enter a number or percentage.');
      }
      startingCount = parsed;
    }

    return { type, limit, startingCount };
  } finally {
    rl.close();
  }
}
