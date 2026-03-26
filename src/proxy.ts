import express, { Request, Response as ExpressResponse, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { CallLogger } from "./logger";
import { StatisticsTracker } from "./statistics";
import { ProxyConfig, CallRecord } from "./types";
import { t } from "./i18n";

export class LLMProxy {
  private config: ProxyConfig;
  private logger: CallLogger;
  private statisticsTracker: StatisticsTracker;
  private app: express.Application;
  private successCount: number = 0;
  private errorCount: number = 0;
  private retryCount: number = 0;

  constructor(config: ProxyConfig, statisticsTracker: StatisticsTracker) {
    this.config = config;
    this.logger = new CallLogger(config.logDir, config.logPayloads);
    this.statisticsTracker = statisticsTracker;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.raw({ type: "*/*", limit: "50mb" }));
    this.app.use((req: Request, res: ExpressResponse, next: NextFunction) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
      }
      next();
    });
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp) {
      return realIp;
    }
    return req.ip || 'unknown';
  }

  private setupRoutes(): void {
    this.app.all("*", async (req: Request, res: ExpressResponse) => {
      const traceId = uuidv4();
      const startTime = Date.now();
      const path = req.path;
      const clientIp = this.getClientIp(req);

        console.log(`[CALL] traceId=${traceId} ip=${clientIp} ${req.method} ${path}`);

       let requestBody: unknown = {};
       if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
         try {
           requestBody = JSON.parse(req.body.toString());
         } catch {
           requestBody = req.body.toString();
         }
       }

       const requestHeaders: Record<string, string> = {};
       for (const [key, value] of Object.entries(req.headers)) {
         if (value !== undefined) {
           requestHeaders[key] = Array.isArray(value) ? value[0] : value;
         }
       }

       const record: CallRecord = {
         traceId,
         timestamp: new Date().toISOString(),
         clientIp,
         request: {
           method: req.method,
           path,
           headers: requestHeaders,
           body: requestBody as any,
         },
        };

        let durationMs = 0;

        try {



         const targetUrl = `${this.config.target}${path}${
           req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""
         }`;

        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          if (
            key.toLowerCase() !== "host" &&
            key.toLowerCase() !== "content-length" &&
            value !== undefined
          ) {
            headers[key] = Array.isArray(value) ? value[0] : value;
          }
        }

        const fetchInit: RequestInit = {
          method: req.method,
          headers,
          body:
            req.method !== "GET" && req.method !== "HEAD" && req.body
              ? req.body
              : undefined,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        let fetchResponse: Response;
        try {
          fetchResponse = await fetch(targetUrl, {
            ...fetchInit,
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeout);
        }
        const endTime = Date.now();
        durationMs = endTime - startTime;

        record.responseTimestamp = new Date().toISOString();

        if (!fetchResponse.ok) {
          const errorBody = await fetchResponse.clone().text();
          const isRateLimit = fetchResponse.status === 429;
          
          const { providerRequestId } = this.extractProviderIds(fetchResponse);
          
          if (isRateLimit) {
            const retryNumber = ++this.retryCount;
            record.errorNumber = retryNumber;
            record.durationMs = durationMs;
            record.response = {
              status: fetchResponse.status,
              body: { error: errorBody },
              providerRequestId,
            };
            const providerPart = providerRequestId ? ` providerReqId=${providerRequestId}` : '';
            console.log(`[RESP #${retryNumber}] traceId=${traceId} status=${fetchResponse.status} ${durationMs}ms${providerPart}`);
          } else {
            const errorNumber = ++this.errorCount;
            record.errorNumber = errorNumber;
            record.durationMs = durationMs;
            record.response = {
              status: fetchResponse.status,
              body: { error: errorBody },
              providerRequestId,
            };
            const providerPart = providerRequestId ? ` providerReqId=${providerRequestId}` : '';
            console.log(`[RESP #${errorNumber}] traceId=${traceId} status=${fetchResponse.status} ${durationMs}ms${providerPart}`);
          }
          
          this.logger.logError(record, new Error(`HTTP ${fetchResponse.status}: ${errorBody}`)).catch(err => 
            console.error(`[LOG ERROR] Failed to log error ${traceId}:`, err)
          );
          try {
            this.statisticsTracker.addRecord(record);
          } catch (err) {
            console.error(`[STATS ERROR] Failed to update statistics for ${traceId}:`, err);
          }
          res.status(fetchResponse.status).send(errorBody);
          return;
        }

        const successNumber = ++this.successCount;
        record.successNumber = successNumber;

        const contentType = fetchResponse.headers.get("content-type") || "";
        if (contentType.includes("text/event-stream")) {
          await this.handleStreamingResponse(fetchResponse, res, record, durationMs);
        } else {
          await this.handleNonStreamingResponse(fetchResponse, res, record, durationMs);
        }
       } catch (error) {
          const errorNumber = ++this.errorCount;
          record.errorNumber = errorNumber;
          record.durationMs = durationMs || (Date.now() - startTime);
          record.responseTimestamp = new Date().toISOString();
           console.log(`[RESP #${errorNumber}] traceId=${traceId} status=EXCEPTION ${(error as Error).message}`);
          this.logger.logError(record, error as Error).catch(err => 
        console.error(`[LOG ERROR] Failed to log error ${traceId}:`, err)
      );
          try {
            this.statisticsTracker.addRecord(record);
          } catch (err) {
            console.error(`[STATS ERROR] Failed to update statistics for ${traceId}:`, err);
          }
          res.status(500).json({ error: (error as Error).message });
        }
    });
  }

  private extractProviderIds(fetchResponse: Response): {
    providerTraceId?: string;
    providerRequestId?: string;
    providerHeaders: Record<string, string>;
  } {
    const providerHeaders: Record<string, string> = {};
    let providerTraceId: string | undefined;
    let providerRequestId: string | undefined;

    for (const [key, value] of fetchResponse.headers.entries()) {
      providerHeaders[key] = value;
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("trace-id") || lowerKey.includes("trace_id")) {
        providerTraceId = value;
      }
      if (lowerKey.includes("request-id") || lowerKey.includes("request_id")) {
        providerRequestId = value;
      }
      if (lowerKey === "x-request-id") {
        providerRequestId = value;
      }
      if (lowerKey === "x-trace-id") {
        providerTraceId = value;
      }
    }

    return { providerTraceId, providerRequestId, providerHeaders };
  }

  private async handleNonStreamingResponse(
    fetchResponse: Response,
    res: ExpressResponse,
    record: CallRecord,
    durationMs: number
  ): Promise<void> {
    const responseBody = await fetchResponse.clone().json();
    const { providerTraceId, providerRequestId, providerHeaders } = this.extractProviderIds(fetchResponse);

    record.durationMs = durationMs;
    record.response = {
      status: fetchResponse.status,
      body: responseBody,
      usage: responseBody.usage
        ? {
            promptTokens: responseBody.usage.prompt_tokens,
            completionTokens: responseBody.usage.completion_tokens,
            totalTokens: responseBody.usage.total_tokens,
            reasoningTokens: responseBody.usage.completion_tokens_details?.reasoning_tokens,
            cachedTokens: responseBody.usage.prompt_tokens_details?.cached_tokens,
          }
        : undefined,
      providerTraceId,
      providerRequestId,
      providerHeaders
    };

    const providerPart = providerRequestId ? ` providerReqId=${providerRequestId}` : '';
    console.log(`[RESP #${record.successNumber}] traceId=${record.traceId} status=${fetchResponse.status} ${durationMs}ms${providerPart}`);

    this.logger.log(record).catch(err => 
      console.error(`[LOG ERROR] Failed to log ${record.traceId}:`, err)
    );
    try {
      this.statisticsTracker.addRecord(record);
    } catch (err) {
      console.error(`[STATS ERROR] Failed to update statistics for ${record.traceId}:`, err);
    }

    for (const [key, value] of fetchResponse.headers.entries()) {
      if (
        !["content-encoding", "transfer-encoding", "connection", "content-length"].includes(
          key.toLowerCase()
        )
      ) {
        res.setHeader(key, value);
      }
    }
    res.status(fetchResponse.status).json(responseBody);
  }

  private async handleStreamingResponse(
    fetchResponse: Response,
    res: ExpressResponse,
    record: CallRecord,
    durationMs: number
  ): Promise<void> {
    const { providerTraceId, providerRequestId, providerHeaders } = this.extractProviderIds(fetchResponse);
    const MAX_LOG_CONTENT_SIZE = 1024 * 1024; // 1MB

    for (const [key, value] of fetchResponse.headers.entries()) {
      if (
        !["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())
      ) {
        res.setHeader(key, value);
      }
    }

    if (!fetchResponse.body) {
      throw new Error('Response body is null');
    }
    const reader = fetchResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let truncated = false;
    let usage: any = undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        res.write(value);
        
        const chunk = decoder.decode(value, { stream: true });
        
        // 尝试从chunk中提取usage信息
        try {
          if (chunk.startsWith('data: ')) {
            const jsonStr = chunk.substring(6); // 跳过 "data: "
            if (jsonStr !== '[DONE]') {
              const chunkData = JSON.parse(jsonStr);
              if (chunkData.usage && typeof chunkData.usage === 'object' && chunkData.usage !== null) {
                usage = chunkData.usage;
              }
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
        
        // 也尝试从完整内容中提取usage信息
        if (!usage) {
          try {
            const lines = fullContent.split('\n');
            for (const line of lines) {
              if (line.includes('"usage":{')) {
                const jsonStr = line.startsWith('data: ') ? line.substring(6) : line;
                if (jsonStr !== '[DONE]') {
                  const chunkData = JSON.parse(jsonStr);
                  if (chunkData.usage && typeof chunkData.usage === 'object' && chunkData.usage !== null) {
                    usage = chunkData.usage;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        
        if (!truncated) {
          if (fullContent.length + chunk.length > MAX_LOG_CONTENT_SIZE) {
            fullContent += chunk.substring(0, MAX_LOG_CONTENT_SIZE - fullContent.length);
            fullContent += "... [truncated]";
            truncated = true;
          } else {
            fullContent += chunk;
          }
        }
      }

      record.durationMs = durationMs;
      record.response = {
        status: fetchResponse.status,
        body: { streamed: true, content: fullContent, truncated },
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
          cachedTokens: usage.prompt_tokens_details?.cached_tokens,
        } : undefined,
        providerTraceId,
        providerRequestId,
        providerHeaders
      };

      const providerPart = providerRequestId ? ` providerReqId=${providerRequestId}` : '';
      console.log(`[RESP #${record.successNumber}] traceId=${record.traceId} status=${fetchResponse.status} ${durationMs}ms${providerPart}`);

      this.logger.log(record).catch(err => 
      console.error(`[LOG ERROR] Failed to log ${record.traceId}:`, err)
    );
      try {
        this.statisticsTracker.addRecord(record);
      } catch (err) {
        console.error(`[STATS ERROR] Failed to update statistics for ${record.traceId}:`, err);
      }

      res.end();
      } catch (error) {
        this.logger.logError(record, error as Error).catch(err => 
          console.error(`[LOG ERROR] Failed to log error ${record.traceId}:`, err)
        );
        res.end();
      }
  }

  start(): void {
    console.log(`[PROXY] Starting on port ${this.config.port}`);
    console.log(`[PROXY] Target: ${this.config.target}`);
    const logFilePath = this.logger.getLogFilePath();
    const requestLogPath = this.logger.getRequestLogPath();
    console.log(`[PROXY] Log files: ${logFilePath}`);
    console.log(`[PROXY]              ${requestLogPath}`);

    this.app.listen(this.config.port, () => {
      console.log(`[PROXY] Listening on http://localhost:${this.config.port}`);
      console.log(t.startupHint);
      console.log(t.startupTokenWarning);
    });
  }
}
