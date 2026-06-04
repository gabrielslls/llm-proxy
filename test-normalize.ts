import { ResponseNormalizer } from './src/normalize';
import { NormalizerConfig, NormalizedResult } from './src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  const a = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
  const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
  if (a === e) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label} (expected: ${e}, got: ${a})`);
  }
}

function makeConfig(provider: string): NormalizerConfig {
  return { provider: provider as any, enabled: true };
}

function disabledConfig(): NormalizerConfig {
  return { provider: 'none', enabled: false };
}

// ===== Test Suite =====
console.log('\n=== ResponseNormalizer Tests ===\n');

// --- isOpenAIFormat ---
console.log('--- isOpenAIFormat ---');

{
  const n = new ResponseNormalizer(makeConfig('xfyun'));

  assert(n.isOpenAIFormat({ choices: [] }), 'choices array -> true');

  assert(n.isOpenAIFormat({ choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }] }), 'valid choices -> true');

  assert(n.isOpenAIFormat({ error: { message: 'test', type: 'error', code: '400' } }), 'OpenAI error -> true');

  assert(!n.isOpenAIFormat({ code: 10013, message: 'error' }), 'xfyun error -> false');

  assert(!n.isOpenAIFormat({}), 'empty object -> false');

  assert(!n.isOpenAIFormat(null), 'null -> false');

  assert(!n.isOpenAIFormat('string'), 'string -> false');
}

// --- normalizeNonStreaming: pass through ---
console.log('\n--- normalizeNonStreaming: pass through ---');

{
  const n = new ResponseNormalizer(makeConfig('xfyun'));

  const choicesBody = { id: 'x', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } };
  let r = n.normalizeNonStreaming(choicesBody, 200);
  assert(!r.normalized, 'OpenAI valid response passes through');
  assertEqual(r.status, 200, 'status preserved');
  assertEqual(r.body, choicesBody, 'body preserved');

  const openaiError = { error: { message: 'Bad key', type: 'invalid_request_error', code: 'invalid_api_key' } };
  r = n.normalizeNonStreaming(openaiError, 400);
  assert(!r.normalized, 'OpenAI error passes through');
  assertEqual(r.status, 400, 'status preserved');

  const successCode = { code: 0, message: 'success', data: { choices: [{}] } };
  r = n.normalizeNonStreaming(successCode, 200);
  assert(!r.normalized, 'xfyun code=0 passes through');
}

// --- normalizeNonStreaming: xfyun error codes ---
console.log('\n--- normalizeNonStreaming: xfyun error codes ---');

{
  const n = new ResponseNormalizer(makeConfig('xfyun'));

  let r = n.normalizeNonStreaming({ code: 10013, message: '敏感内容' }, 200);
  assert(r.normalized, '10013 normalized');
  assertEqual(r.status, 400, '10013 -> 400');
  assertEqual(r.body, { error: { message: 'Content policy violation', type: 'content_filter', code: '10013' } }, '10013 body format');

  r = n.normalizeNonStreaming({ code: 11221, message: 'model not supported' }, 200);
  assert(r.normalized, '11221 normalized');
  assertEqual(r.status, 400, '11221 -> 400');
  assert(r.body && typeof r.body === 'object' && 'error' in r.body, 'body has error field');

  r = n.normalizeNonStreaming({ code: 11201, message: 'rate limited' }, 200);
  assert(r.normalized, '11201 normalized');
  assertEqual(r.status, 429, '11201 -> 429');

  r = n.normalizeNonStreaming({ code: 10907, message: 'token too long' }, 200);
  assert(r.normalized, '10907 normalized');
  assertEqual(r.status, 400, '10907 -> 400');

  r = n.normalizeNonStreaming({ code: 11200, message: 'no auth' }, 200);
  assert(r.normalized, '11200 normalized');
  assertEqual(r.status, 403, '11200 -> 403');
}

// --- normalizeNonStreaming: unmapped code ---
{
  const n = new ResponseNormalizer(makeConfig('xfyun'));
  let r = n.normalizeNonStreaming({ code: 99999, message: 'unknown error' }, 200);
  assert(r.normalized, 'unmapped code normalized');
  assertEqual(r.status, 500, 'unmapped -> 500');
}

// --- normalizeNonStreaming: baidu pattern ---
console.log('\n--- normalizeNonStreaming: baidu ---');

{
  const n = new ResponseNormalizer(makeConfig('baidu'));
  let r = n.normalizeNonStreaming({ error_code: 1, error_msg: 'fail' }, 200);
  assert(r.normalized, 'baidu error_code=1 normalized');
  assertEqual(r.status, 500, 'baidu unmapped -> 500');

  r = n.normalizeNonStreaming({ error_code: 0, error_msg: 'success', result: {} }, 200);
  assert(!r.normalized, 'baidu error_code=0 passes through');
}

// --- normalizeNonStreaming: generic pattern ---
console.log('\n--- normalizeNonStreaming: generic ---');

{
  const n = new ResponseNormalizer(makeConfig('generic'));
  let r = n.normalizeNonStreaming({ error_code: 'ERR001', error_msg: 'something broke' }, 200);
  assert(r.normalized, 'generic error_code detected');
  assertEqual(r.status, 500, 'generic -> 500');
}

// --- normalizeNonStreaming: disabled ---
console.log('\n--- normalizeNonStreaming: disabled ---');

{
  const n = new ResponseNormalizer(disabledConfig());
  let r = n.normalizeNonStreaming({ code: 10013, message: 'error' }, 200);
  assert(!r.normalized, 'disabled normalizer: no normalization');
  assertEqual(r.status, 200, 'disabled: status preserved');
}

// --- normalizeErrorResponse ---
console.log('\n--- normalizeErrorResponse ---');

{
  const n = new ResponseNormalizer(makeConfig('xfyun'));

  let r = n.normalizeErrorResponse('{"code":10013,"message":"bad"}', 200);
  assert(r.normalized, 'error response with xfyun code normalized');
  assertEqual(r.status, 400, 'error response -> 400');

  r = n.normalizeErrorResponse('{"code":0,"message":"ok"}', 200);
  assert(!r.normalized, 'error response with code=0 passes through');

  r = n.normalizeErrorResponse('raw text error', 500);
  assert(r.normalized, 'non-JSON error body normalized');
  assertEqual(r.status, 500, 'non-JSON status preserved');
}

// --- normalizeStreamChunk ---
console.log('\n--- normalizeStreamChunk ---');

{
  const n = new ResponseNormalizer(makeConfig('xfyun'));

  let sr = n.normalizeStreamChunk('data: {"choices":[]}');
  assert(!sr.isError, 'chunk with choices -> no error');

  sr = n.normalizeStreamChunk('data: {"code":10013,"message":"bad"}');
  assert(sr.isError, 'chunk with 10013 -> error');
  if (sr.isError) {
    assertEqual(sr.errorEvent, { error: { message: 'Content policy violation', type: 'content_filter', code: '10013' } }, '10013 error event format');
  }

  sr = n.normalizeStreamChunk('data: [DONE]');
  assert(!sr.isError, '[DONE] -> no error');

  sr = n.normalizeStreamChunk('data: {"code":0,"message":"ok"}');
  assert(!sr.isError, 'chunk with code=0 -> no error');

  sr = n.normalizeStreamChunk('not json');
  assert(!sr.isError, 'non-JSON chunk -> no error');

  sr = n.normalizeStreamChunk('data: {"error":{"message":"real error"}}');
  assert(!sr.isError, 'chunk with OpenAI error -> no error');
}

// --- Summary ---
console.log('\n=== Summary ===');
const total = passed + failed;
console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) {
  console.error('  SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('  ALL TESTS PASSED');
}
