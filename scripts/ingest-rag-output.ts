/**
 * Script d'ingestion du JSON n8n/RAG.
 *
 * Usage :
 * - npm run ingest -- input.json
 * - cat input.json | npm run ingest
 *
 * Sorties :
 * - public/output/timeline.json
 * - public/output/render-props.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertMeditationVideoInput } from '../src/data/schema';
import {
  buildTimeline,
  validateTimeline,
  type ValidationIssue,
} from '../src/compositions/timeline/buildTimeline';

function printIssues(issues: ValidationIssue[]): void {
  for (const issue of issues) {
    const icon = issue.level === 'error' ? '❌' : '⚠️';
    const logger = issue.level === 'error' ? console.error : console.warn;
    logger(`${icon} [${issue.code}] ${issue.message}`);
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];

  let raw: string;

  if (inputPath) {
    raw = readFileSync(inputPath, 'utf8');
  } else {
    if (process.stdin.isTTY) {
      throw new Error(
        'Usage: npm run ingest -- <input.json> or pipe JSON through stdin.',
      );
    }

    raw = await readStdin();
  }

  if (!raw.trim()) {
    throw new Error('Input JSON is empty.');
  }

  const json: unknown = JSON.parse(raw);
  const input = assertMeditationVideoInput(json);
  const timeline = buildTimeline(input);
  const issues = validateTimeline(timeline);

  printIssues(issues);

  const errors = issues.filter((issue) => issue.level === 'error');

  if (errors.length > 0) {
    console.error(`\nIngestion failed with ${errors.length} error(s).`);
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'public', 'output');
  mkdirSync(outputDir, { recursive: true });

  const timelinePath = path.join(outputDir, 'timeline.json');
  const renderPropsPath = path.join(outputDir, 'render-props.json');

  writeFileSync(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`, 'utf8');
  writeFileSync(
    renderPropsPath,
    `${JSON.stringify({ input }, null, 2)}\n`,
    'utf8',
  );

  console.log('\n✅ Ingestion succeeded.');
  console.log(`- Timeline: ${timelinePath}`);
  console.log(`- Render props: ${renderPropsPath}`);
}

main().catch((error) => {
  console.error('❌ Ingestion failed.');
  console.error(error);
  process.exit(1);
});
