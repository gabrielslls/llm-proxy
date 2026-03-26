export interface ProxyConfig {
  port: number;
  target: string;
  logDir: string;
  logPayloads: boolean;
}

export interface LLMRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  [key: string]: unknown;
}

export interface CallRecord {
  traceId: string;
  timestamp: string;
  responseTimestamp?: string;
  clientIp?: string;
  requestNumber?: number;
  successNumber?: number;
  errorNumber?: number;
  request?: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body: LLMRequest;
  };
  response?: {
    status: number;
    body: unknown;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      reasoningTokens?: number;
      cachedTokens?: number;
    };
    providerTraceId?: string;
    providerRequestId?: string;
    providerHeaders?: Record<string, string>;
  };
  error?: {
    message: string;
    stack?: string;
  };
  durationMs?: number;
}

export type CodingPlanType = 'requests' | 'tokens';

export interface CodingPlanConfig {
  type: CodingPlanType;
  limit: number;
  startingCount: number;
}

export interface Statistics {
  successCount: number;
  failureCount: number;
  rateLimitCount: number;
  totalTokens: number;
  averageResponseTime: number | string;
  totalRequests: number;
  startTime: string;
  codingplanLimit?: number;
  codingplanType?: CodingPlanType;
  startingCount?: number;
  remaining?: number;
  usagePercent?: number;
}
