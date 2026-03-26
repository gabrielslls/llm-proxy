import { appendFile, mkdir, stat, rename, readdir, unlink, writeFile } from "fs/promises";
import { CallRecord } from "./types";
import { dirname, basename, join, extname } from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";

const MAX_LOG_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_LOG_FILES = 10;

export class CallLogger {
  private logFilePath: string;
  private requestLogPath: string;
  private writeQueue: Array<{ record: CallRecord; resolve: () => void; reject: (error: Error) => void }> = [];
  private isWriting: boolean = false;
  private logPayloads: boolean;

  constructor(logDir: string, logPayloads: boolean = false) {
    this.logFilePath = join(logDir, 'calls.jsonl');
    this.requestLogPath = join(logDir, 'requests.log');
    this.logPayloads = logPayloads;
    this.ensureLogDirectory().catch(err => 
      console.error('[LOG ERROR] Failed to initialize log directory:', err)
    );
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }

  getRequestLogPath(): string {
    return this.requestLogPath;
  }

  private async ensureLogDirectory(): Promise<void> {
    const dir = dirname(this.logFilePath);
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`[LOG ERROR] Failed to create log directory: ${error}`);
    }
  }



  async log(record: CallRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({ record, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;

    try {
      while (this.writeQueue.length > 0) {
        const { record, resolve, reject } = this.writeQueue.shift()!;
        try {
          if (this.logPayloads) {
            await this.checkAndRotateLog();
            // 写入完整日志
            const line = JSON.stringify(record) + "\n";
            await appendFile(this.logFilePath, line, "utf-8");
          }
          
          // 写入请求级日志
          await this.writeRequestLog(record);
          resolve();
        } catch (error) {
          console.error(`[LOG ERROR] Failed to write log: ${error}`);
          reject(error as Error);
        }
      }
    } finally {
      this.isWriting = false;
    }
  }

  private async writeRequestLog(record: CallRecord): Promise<void> {
    const date = new Date(record.timestamp).toLocaleDateString();
    const time = new Date(record.timestamp).toLocaleTimeString();
    const respTime = record.responseTimestamp ? new Date(record.responseTimestamp).toLocaleTimeString() : '-';
    const model = record.request?.body?.model || 'unknown';
    const status = record.response?.status || 0;
    const duration = record.durationMs || 0;
    const providerReqId = record.response?.providerRequestId || '';
    const reqSize = record.request?.body ? JSON.stringify(record.request.body).length : 0;
    const respSize = record.response?.body ? JSON.stringify(record.response.body).length : 0;
    const clientIp = record.clientIp || 'unknown';
    
    let numberLabel: string;
    if (record.successNumber) {
      numberLabel = `[SUCCESS #${record.successNumber}]`;
    } else if (record.errorNumber) {
      numberLabel = `[ERROR #${record.errorNumber}]`;
    } else if (record.requestNumber) {
      numberLabel = `[#${record.requestNumber}]`;
    } else {
      numberLabel = `[#0]`;
    }

    const durationSec = (duration / 1000).toFixed(2);
    const usage = record.response?.usage;
    const tokens = usage ? `${usage.promptTokens}+${usage.completionTokens}` : '-';
    
    const reasoningPart = usage?.reasoningTokens ? `+${usage.reasoningTokens}r` : '';
    const cachedPart = usage?.cachedTokens ? `-${usage.cachedTokens}c` : '';
    const extendedTokens = usage ? `${tokens}${reasoningPart}${cachedPart}` : '-';

    const logLine = `${numberLabel} ${date} ${time} | ${clientIp} | ${model} | Tokens:${extendedTokens} | Req:${(reqSize/1024).toFixed(1)}KB | Resp:${(respSize/1024).toFixed(1)}KB | ${respTime} | ${status} | ${durationSec}s | ${providerReqId}
`;

    await appendFile(this.requestLogPath, logLine, "utf-8");
  }

  private extractAgentInfo(systemContent: string): {
    name?: string;
    type?: string;
    source?: string;
    capabilities?: string[];
  } {
    const agentInfo: any = {};
    
    let nameMatch = systemContent.match(/You are\s+(?:a|an)?\s*["']?([^"'\s]+(?:\s+[^"'\s]+)*)["']?/i);
    if (nameMatch) {
      agentInfo.name = nameMatch[1];
    } else {
      agentInfo.name = 'unknown';
    }
    
    // 提取 Agent 类型
    const typeMatch = systemContent.match(/([A-Z][a-zA-Z\s]+Agent(?:\s+[a-zA-Z]+)*)/);
    if (typeMatch) {
      agentInfo.type = typeMatch[1].trim();
    }
    
    // 提取来源
    const sourceMatch = systemContent.match(/from\s+([A-Z][a-zA-Z]+)/);
    if (sourceMatch) {
      agentInfo.source = sourceMatch[1];
    }
    
    // 提取能力列表
    const capabilitiesMatch = systemContent.match(/Core Competencies[\s\S]*?([\s\S]*?)(?=\n\n|$)/i);
    if (capabilitiesMatch) {
      const capabilities = capabilitiesMatch[1]
        .split(/\n-\s*/)
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);
      if (capabilities.length > 0) {
        agentInfo.capabilities = capabilities;
      }
    }
    
    return agentInfo;
  }

  private async checkAndRotateLog(): Promise<void> {
    try {
      const stats = await stat(this.logFilePath);
      if (stats.size >= MAX_LOG_SIZE) {
        await this.rotateLog();
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error(`[LOG ERROR] Failed to check log size: ${error}`);
      }
    }
  }

  private async rotateLog(): Promise<void> {
    const dir = dirname(this.logFilePath);
    const baseName = basename(this.logFilePath, '.jsonl');
    
    try {
      const files = await readdir(dir);
      const logFiles = files
        .filter(f => f.startsWith(baseName) && (f.endsWith('.jsonl') || f.endsWith('.jsonl.gz')))
        .map(f => {
          const match = f.match(/\.(\d+)\.(jsonl|jsonl\.gz)$/);
          return {
            name: f,
            index: match ? parseInt(match[1]) : 0,
            compressed: f.endsWith('.gz')
          };
        })
        .sort((a, b) => b.index - a.index);
      
      for (const file of logFiles) {
        const newIndex = file.index + 1;
        const oldPath = join(dir, file.name);
        
        if (newIndex >= MAX_LOG_FILES) {
          await unlink(oldPath);
          console.log(`[LOG] Deleted old log: ${file.name}`);
        } else {
          const extension = file.compressed ? 'jsonl.gz' : 'jsonl';
          const newPath = join(dir, `${baseName}.${newIndex}.${extension}`);
          await rename(oldPath, newPath);
          console.log(`[LOG] Rotated log: ${file.name} -> ${basename(newPath)}`);
        }
      }
      
      const rotatedPath = join(dir, `${baseName}.1.jsonl`);
      await rename(this.logFilePath, rotatedPath);
      console.log(`[LOG] Rotated current log to ${basename(rotatedPath)}`);
      
      // 压缩旧日志
      await this.compressOldLog(rotatedPath);
    } catch (error) {
      console.error(`[LOG ERROR] Failed to rotate log: ${error}`);
    }
  }

  private async compressOldLog(logPath: string): Promise<void> {
    try {
      const stats = await stat(logPath);
      if (stats.size > 0) {
        const compressedPath = logPath + '.gz';
        const source = createReadStream(logPath);
        const destination = createWriteStream(compressedPath);
        const gzip = createGzip();
        
        await pipeline(source, gzip, destination);
        await unlink(logPath);
        console.log(`[LOG] Compressed log: ${basename(logPath)} -> ${basename(compressedPath)}`);
      }
    } catch (error) {
      console.error(`[LOG ERROR] Failed to compress log: ${error}`);
    }
  }

  async logError(record: Partial<CallRecord>, error: Error): Promise<void> {
    const fullRecord = {
      traceId: record.traceId!,
      timestamp: new Date().toISOString(),
      clientIp: record.clientIp,
      requestNumber: record.requestNumber,
      successNumber: record.successNumber,
      errorNumber: record.errorNumber,
      durationMs: record.durationMs,
      responseTimestamp: record.responseTimestamp,
      request: record.request,
      response: record.response,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
    return this.log(fullRecord as CallRecord);
  }
}
