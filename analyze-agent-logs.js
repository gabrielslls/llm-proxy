#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';

const logPath = './logs/calls.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

let lineCount = 0;
let unknownCount = 0;
let knownCount = 0;
let unknownExamples = [];
let knownExamples = [];

rl.on('line', (line) => {
  lineCount++;
  try {
    const record = JSON.parse(line);
    const messages = record.request?.body?.messages || [];
    const systemMessage = messages.find((m) => m.role === 'system');
    const systemContent = systemMessage?.content || '';
    
    const nameMatch = systemContent.match(/You are "([^"]+)"/i);
    const agentName = nameMatch ? nameMatch[1] : 'Unknown';
    
    if (agentName === 'Unknown') {
      unknownCount++;
      if (unknownExamples.length < 5) {
        unknownExamples.push({
          line: lineCount,
          traceId: record.traceId,
          systemContent: systemContent.substring(0, 500)
        });
      }
    } else {
      knownCount++;
      if (knownExamples.length < 3) {
        knownExamples.push({
          line: lineCount,
          traceId: record.traceId,
          agentName,
          systemContent: systemContent.substring(0, 200)
        });
      }
    }
    
  } catch (error) {
    console.error(`Error parsing line ${lineCount}:`, error.message);
  }
});

rl.on('close', () => {
  console.log('=== Agent Name Analysis ===');
  console.log(`Total lines: ${lineCount}`);
  console.log(`Known Agent: ${knownCount}`);
  console.log(`Unknown Agent: ${unknownCount}`);
  console.log();
  
  console.log('=== Known Agent Examples ===');
  knownExamples.forEach((ex, i) => {
    console.log(`${i+1}. Line ${ex.line}, Agent: "${ex.agentName}"`);
    console.log(`   System content snippet: "${ex.systemContent}"`);
    console.log();
  });
  
  console.log('=== Unknown Agent Examples ===');
  unknownExamples.forEach((ex, i) => {
    console.log(`${i+1}. Line ${ex.line}, TraceId: ${ex.traceId}`);
    console.log(`   System content snippet: "${ex.systemContent}"`);
    console.log();
  });
});
