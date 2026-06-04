import {
  NormalizerConfig,
  ErrorPattern,
  NormMapping,
  NormalizedResult,
} from './types';

const XFYUN_PATTERN: ErrorPattern = {
  name: 'xfyun',
  errorCodeField: 'code',
  errorMessageField: 'message',
  codeMappings: {
    // === Transient / Retryable (429) ===
    10006: { httpStatus: 429, type: 'rate_limit', message: 'Concurrent connection conflict. Only one connection allowed.', retryAfter: 10 },
    10007: { httpStatus: 429, type: 'rate_limit', message: 'Request in progress, wait for completion', retryAfter: 5 },
    11201: { httpStatus: 429, type: 'rate_limit', message: 'Request count limit exceeded', retryAfter: 5 },
    11202: { httpStatus: 429, type: 'rate_limit', message: 'Second-level concurrency limit exceeded', retryAfter: 5 },
    11203: { httpStatus: 429, type: 'rate_limit', message: 'Concurrency limit exceeded', retryAfter: 5 },
    11210: { httpStatus: 429, type: 'rate_limit', message: 'TPM limit exceeded. Retry after backoff.', retryAfter: 30 },

    // === Transient / Retryable (503) ===
    10008: { httpStatus: 503, type: 'server_error', message: 'Insufficient service capacity', retryAfter: 30 },
    10009: { httpStatus: 503, type: 'server_error', message: 'Failed to establish connection with engine', retryAfter: 30 },
    10010: { httpStatus: 503, type: 'server_error', message: 'Engine busy or queued. Retry with backoff.', retryAfter: 30 },
    10011: { httpStatus: 503, type: 'server_error', message: 'Failed to send data to engine', retryAfter: 30 },
    10110: { httpStatus: 503, type: 'server_error', message: 'Service busy, please retry', retryAfter: 30 },
    10222: { httpStatus: 503, type: 'server_error', message: 'Engine network error', retryAfter: 30 },
    10223: { httpStatus: 503, type: 'server_error', message: 'Load balancer cannot find engine node', retryAfter: 30 },

    // === Non-retryable (400) ===
    10013: { httpStatus: 400, type: 'content_filter', message: 'Content policy violation' },
    10014: { httpStatus: 400, type: 'content_filter', message: 'Response content filtered' },
    10019: { httpStatus: 400, type: 'content_filter', message: 'Response suspected sensitive' },
    10163: { httpStatus: 400, type: 'invalid_request_error', message: 'Invalid request parameters' },
    10404: { httpStatus: 400, type: 'invalid_request_error', message: 'Invalid configuration parameters' },
    10907: { httpStatus: 400, type: 'context_length_exceeded', message: 'Token limit exceeded. Reduce input length.' },
    10910: { httpStatus: 400, type: 'context_length_exceeded', message: 'Token limit exceeded. Control input/output length.' },
    11221: { httpStatus: 400, type: 'invalid_request_error', message: 'Model not available in current plan' },

    // === Non-retryable (403) ===
    10015: { httpStatus: 403, type: 'insufficient_quota', message: 'AppID in blacklist' },
    10016: { httpStatus: 403, type: 'insufficient_quota', message: 'Insufficient authorization or quota' },
    11200: { httpStatus: 403, type: 'insufficient_quota', message: 'No authorization for this feature' },
  },
};

const BAIDU_PATTERN: ErrorPattern = {
  name: 'baidu',
  errorCodeField: 'error_code',
  errorMessageField: 'error_msg',
  codeMappings: {},
};

const GENERIC_PATTERN: ErrorPattern = {
  name: 'generic',
  errorCodeField: 'error_code',
  errorMessageField: 'error_msg',
  codeMappings: {},
};

const PROVIDER_PATTERNS: Record<string, ErrorPattern> = {
  xfyun: XFYUN_PATTERN,
  baidu: BAIDU_PATTERN,
  generic: GENERIC_PATTERN,
  custom: GENERIC_PATTERN,
};

function isSuccessCode(code: unknown): boolean {
  if (code === null) return true;
  if (code === undefined) return true;
  if (code === 0) return true;
  if (code === '0') return true;
  return false;
}

function toCodeNumber(code: unknown): number {
  if (typeof code === 'number') return code;
  if (typeof code === 'string') return parseInt(code, 10);
  return NaN;
}

function buildErrorBody(message: string, type: string, code: string): Record<string, unknown> {
  return {
    error: { message, type, code },
  };
}

function lookupMapping(
  codeMappings: Record<number, NormMapping> | undefined,
  code: unknown,
): NormMapping | undefined {
  if (!codeMappings) return undefined;
  const codeNum = toCodeNumber(code);
  if (isNaN(codeNum)) return undefined;
  return codeMappings[codeNum];
}

function extractString(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key];
  return typeof val === 'string' ? val : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class ResponseNormalizer {
  private enabled: boolean;
  private pattern: ErrorPattern | null;

  constructor(config: NormalizerConfig) {
    this.enabled = config.enabled && config.provider !== 'none';
    if (this.enabled) {
      if (config.provider === 'custom' && config.customRules) {
        this.pattern = {
          name: 'custom',
          errorCodeField: config.customRules.errorCodeField || 'error_code',
          errorMessageField: config.customRules.errorMessageField || 'error_msg',
          codeMappings: config.customRules.codeMappings || {},
        };
      } else {
        this.pattern = PROVIDER_PATTERNS[config.provider] || GENERIC_PATTERN;
      }
    } else {
      this.pattern = null;
    }
  }

  /**
   * Normalize a non-streaming response body.
   *
   * - OpenAI-format responses (with `choices` or `error` shape) are passed through.
   * - Provider success (code=0/null/undefined/"0") is passed through.
   * - Provider errors are mapped to OpenAI error format.
   */
  normalizeNonStreaming(body: unknown, httpStatus: number): NormalizedResult {
    const passthrough: NormalizedResult = {
      body: isRecord(body) ? body : {},
      status: httpStatus,
      normalized: false,
    };

    if (!this.pattern || !this.enabled) return passthrough;
    if (!isRecord(body)) return passthrough;

    if (this.isOpenAIFormat(body)) return passthrough;

    const code = body[this.pattern.errorCodeField];

    if (isSuccessCode(code)) return passthrough;

    const msg = extractString(body, this.pattern.errorMessageField) ?? 'Unknown error';
    const mapping = lookupMapping(this.pattern.codeMappings, code);

    if (mapping) {
      const codeNum = toCodeNumber(code);
      return {
        body: buildErrorBody(mapping.message, mapping.type, String(isNaN(codeNum) ? code : codeNum)),
        status: mapping.httpStatus,
        normalized: true,
        originalBody: body,
        retryAfter: mapping.retryAfter,
      };
    }

    return {
      body: buildErrorBody(msg, 'server_error', String(code)),
      status: 500,
      normalized: true,
      originalBody: body,
    };
  }

  /**
   * Normalize an error response (non-2xx) that may contain a raw error body.
   *
   * Attempts JSON parsing first; falls back to wrapping the raw text.
   */
  normalizeErrorResponse(errorBody: string, httpStatus: number): NormalizedResult {
    if (!this.pattern || !this.enabled) {
      return {
        body: buildErrorBody(errorBody, 'server_error', String(httpStatus)),
        status: httpStatus,
        normalized: false,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(errorBody);
    } catch {
      return {
        body: buildErrorBody(errorBody, 'server_error', String(httpStatus)),
        status: httpStatus,
        normalized: true,
        originalBody: errorBody,
      };
    }

    if (isRecord(parsed)) {
      return this.normalizeNonStreaming(parsed, httpStatus);
    }

    return {
      body: buildErrorBody(errorBody, 'server_error', String(httpStatus)),
      status: httpStatus,
      normalized: true,
      originalBody: errorBody,
    };
  }

  /**
   * Inspect a streaming SSE chunk for mid-stream errors.
   *
   * Returns `{ isError: false }` for normal chunks.
   * Returns `{ isError: true, errorEvent: {...} }` when an error is detected.
   */
  normalizeStreamChunk(
    rawChunk: string,
  ): { isError: true; errorEvent: Record<string, unknown> } | { isError: false } {
    if (!this.pattern || !this.enabled) {
      return { isError: false };
    }

    const trimmed = rawChunk.trim();

    if (trimmed === '[DONE]') {
      return { isError: false };
    }

    let jsonStr = trimmed;
    if (jsonStr.startsWith('data: ')) {
      jsonStr = jsonStr.slice(6);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return { isError: false };
    }

    if (!isRecord(parsed)) {
      return { isError: false };
    }

    if (Array.isArray(parsed.choices)) return { isError: false };
    if (
      typeof parsed.error === 'object' &&
      parsed.error !== null &&
      isRecord(parsed.error) &&
      typeof parsed.error.message === 'string'
    ) {
      return { isError: false };
    }

    const code = parsed[this.pattern.errorCodeField];

    if (isSuccessCode(code)) return { isError: false };

    const msg = extractString(parsed, this.pattern.errorMessageField) ?? 'Unknown error';
    const mapping = lookupMapping(this.pattern.codeMappings, code);

    if (mapping) {
      const codeNum = toCodeNumber(code);
      return {
        isError: true,
        errorEvent: {
          error: {
            message: mapping.message,
            type: mapping.type,
            code: String(isNaN(codeNum) ? code : codeNum),
          },
        },
      };
    }

    return {
      isError: true,
      errorEvent: {
        error: { message: msg, type: 'server_error', code: String(code) },
      },
    };
  }

  /**
   * Check whether a response body is already in OpenAI-compatible format.
   *
   * Returns true if the body contains a `choices` array (chat completion)
   * or an `error` object with a `message` field (OpenAI error).
   */
  isOpenAIFormat(body: unknown): boolean {
    if (!isRecord(body)) return false;

    if (Array.isArray(body.choices)) return true;

    if (typeof body.error === 'object' && body.error !== null) {
      const err = body.error;
      if (isRecord(err) && typeof err.message === 'string') {
        return true;
      }
    }

    return false;
  }
}
