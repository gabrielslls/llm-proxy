# LLM Proxy - Statistics Feature Testing Guide

## Overview
This document describes manual test steps for validating the LLM proxy statistics feature, which provides:
- Global statistics display when pressing Enter in the console
- Statistics include: success/failure counts, total tokens, average response time
- Auto-disable in non-TTY environments
- 100ms debounce on Enter key presses
- Double-Enter within 2 seconds to exit the program
- Statistics stored in memory only (cleared on restart)

## Test Prerequisites
1. Node.js >= 18 installed
2. Project dependencies installed (`npm install`)
3. A test target endpoint (can use any OpenAI-compatible API, or mock responses)

## Test Cases

### Test Case 1: Basic Statistics Display
**Objective:** Verify that pressing Enter displays statistics with correct counts after requests

**Steps:**
1. Start the proxy: `npm start -- --target https://api.openai.com/v1` (or your test endpoint)
2. Send a few test requests using curl:
   ```bash
   curl http://localhost:9000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "model": "gpt-3.5-turbo",
       "messages": [{"role": "user", "content": "Hello"}]
     }'
   ```
3. Press Enter in the console where the proxy is running
4. Observe the statistics display

**Expected Results:**
- Statistics panel appears with:
  - Success requests count matches number of successful requests
  - Failed requests count excludes rate limit (429) responses
  - Total tokens shows sum of tokens from all successful requests
  - Average response time shows average of all request durations

---

### Test Case 2: Zero Requests Display
**Objective:** Verify statistics display works correctly when no requests have been made

**Steps:**
1. Start the proxy: `npm start -- --target https://api.openai.com/v1`
2. Before sending any requests, press Enter in the console

**Expected Results:**
- Statistics panel shows:
  - Success requests: 0
  - Failed requests: 0 (excluding rate limit 429 responses)
  - Total tokens consumed: 0
  - Average response time: N/A

---

### Test Case 3: Non-TTY Environment
**Objective:** Verify statistics feature is automatically disabled in non-TTY environments

**Steps:**
1. Run the proxy in non-TTY mode:
   ```bash
   npm start -- --target https://api.openai.com/v1 < /dev/null
   ```
2. Observe the console output

**Expected Results:**
- Message appears: "Statistics console disabled (non-TTY environment)"
- No statistics panel appears even if you try to simulate Enter presses
- Proxy continues to function normally otherwise

---

### Test Case 4: Rapid Enter Key Press Test (Debounce)
**Objective:** Verify that 100ms debounce prevents multiple rapid Enter presses from showing statistics multiple times

**Steps:**
1. Start the proxy in a TTY environment: `npm start -- --target https://api.openai.com/v1`
2. Send one test request (to have some statistics to display)
3. Press Enter multiple times in quick succession (at least 5 times within 1 second)
4. Count how many statistics panels appear

**Expected Results:**
- Only 1 statistics panel appears (or 2 if presses are spaced >100ms apart)
- Multiple rapid presses are ignored (debounced)
- To exit the program, press Enter to show statistics, then press Enter again within 2 seconds

---

### Test Case 5: Service Restart Statistics Reset
**Objective:** Verify statistics are cleared when the proxy restarts

**Steps:**
1. Start the proxy: `npm start -- --target https://api.openai.com/v1`
2. Send a few test requests
3. Press Enter to verify statistics show the counts
4. Stop the proxy (Ctrl+C)
5. Restart the proxy
6. Press Enter without sending any new requests

**Expected Results:**
- After restart, statistics panel shows all zeros and N/A for average response time
- No trace of previous session's statistics remains

---

### Test Case 6: Existing Functionality Compatibility
**Objective:** Verify existing proxy functionality still works correctly

**Steps:**
1. **Proxy Forwarding:**
   - Start proxy: `npm start -- --target https://api.openai.com/v1`
   - Send a chat completion request and verify response is received correctly

2. **Logging:**
   - Verify logs are written to `./logs/requests.log`
   - Verify log entries contain token counts

3. **Streaming:**
   - Test a streaming request using `stream: true` in the request payload
   - Verify streaming responses are received correctly

**Expected Results:**
- All existing functionality works as expected
- No regression in proxy forwarding, logging, or streaming
- Statistics feature does not interfere with core functionality

## Troubleshooting

### Issue: Statistics panel doesn't appear when pressing Enter
- Check if you're in a TTY environment
- Verify `process.stdin.isTTY` is true
- Make sure you're not running with `< /dev/null` or in a non-interactive shell

### Issue: Statistics counts are incorrect
- Check that all requests are being properly recorded
- Verify successful vs failed vs rate-limited (429) requests are being correctly categorized
- Note: 429 rate limit responses are tracked separately and do not count as failures
- Check that `CallRecord` objects are being properly passed to `StatisticsTracker.addRecord()`

### Issue: Debounce not working
- Check that the 100ms threshold is correctly implemented in `console.ts`
- Verify `lastEnterTime` is being properly updated
