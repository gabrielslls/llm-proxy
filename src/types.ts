export interface ProxyConfig {
  port: number;
  target: string;
  logDir: string;
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
