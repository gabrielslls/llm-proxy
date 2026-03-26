import { LLMProxy } from "./proxy";
import { ProxyConfig, CodingPlanConfig } from "./types";
import { StatisticsTracker } from "./statistics";
import { ConsoleStats } from "./console";
import { resolve } from "path";
import { promptForPlanConfig } from "./plan-config";

// 全局异常处理
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const VERSION = "1.0.0";

function printHelp() {
  console.log(`LLM Proxy - LLM API 请求拦截代理
Usage: llm-proxy --target <target-url> [options]

Required:
  --target <url>    目标 API 地址

Options:
  --port <number>          监听端口 (默认: 9000)
  --log-dir <path>         日志文件目录 (默认: ./logs)
  --log-payloads           记录完整 API 请求和响应报文 (JSONL 格式)
  --plan                   交互式配置编码计划 (requests/tokens limit + starting count)
  --help                   显示帮助信息
  --version                输出版本号
`);
}

function parseArgs(): { config: ProxyConfig; planConfig?: CodingPlanConfig } {
  const args = process.argv.slice(2);
  let target: string | undefined;
  let port = 9000;
  let logDir = "./logs";
  let logPayloads = false;
  let usePlan = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--target":
        target = args[++i];
        break;
      case "--port":
        port = parseInt(args[++i], 10);
        break;
      case "--log-dir":
        logDir = args[++i];
        break;
      case "--log-payloads":
        logPayloads = true;
        break;
      case "--plan":
        usePlan = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
      case "--version":
        console.log(`llm-proxy v${VERSION}`);
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  if (!target) {
    console.error("Error: --target is required");
    printHelp();
    process.exit(1);
  }

  const resolvedLogDir = resolve(process.cwd(), logDir);

  const config: ProxyConfig = {
    port,
    target: target.endsWith("/") ? target.slice(0, -1) : target,
    logDir: resolvedLogDir,
    logPayloads,
  };

  return { config, planConfig: undefined };
}

async function main() {
  const { config, planConfig } = parseArgs();
  
  let effectivePlanConfig = planConfig;
  if (planConfig === undefined && process.argv.includes('--plan')) {
    console.log('\n--- 交互式编码计划配置 ---');
    effectivePlanConfig = await promptForPlanConfig();
  }
  
  const statisticsTracker = new StatisticsTracker(effectivePlanConfig);
  const proxy = new LLMProxy(config, statisticsTracker);
  new ConsoleStats(statisticsTracker);
  proxy.start();
}

main();
