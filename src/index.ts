import { LLMProxy } from "./proxy";
import { ProxyConfig } from "./types";
import { resolve } from "path";

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
  --port <number>   监听端口 (默认: 8000)
  --log-dir <path>  日志文件目录 (默认: ./logs)
  --help            显示帮助信息
  --version         输出版本号
`);
}

function parseArgs(): ProxyConfig {
  const args = process.argv.slice(2);
  let target: string | undefined;
  let port = 8000;
  let logDir = "./logs";

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

  return {
    port,
    target: target.endsWith("/") ? target.slice(0, -1) : target,
    logDir: resolvedLogDir,
  };
}

const config = parseArgs();
const proxy = new LLMProxy(config);
proxy.start();
