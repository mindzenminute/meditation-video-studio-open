/**
 * Script de validation de la timeline.
 *
 * Vérifie :
 * - durée totale = 596s
 * - présence des segments requis
 * - cohérence des frames
 * - densité du texte de guidage
 * - alignement audio si la durée est connue
 */
import { readFileSync } from 'node:fs';
import { assertMeditationVideoInput } from '../src/data/schema';
import {
  buildTimeline,
  validateTimeline,
  type ValidationIssue,
} from '../src/compositions/timeline/buildTimeline';
import type { Timeline } from '../src/compositions/timeline/types';
import { getAudioDurationInSeconds } from '../src/lib/audio';
import { secondsToFrames } from '../src/lib/timing';

function isTimeline(value: unknown): value is Timeline {
  return (
    typeof value === 'object' &&
    value !== null &&
    'totalFrames' in value &&
    'segments' in value &&
    'fps' in value
  );
}

function printIssues(issues: ValidationIssue[]): void {
  for (const issue of issues) {
    const icon = issue.level === 'error' ? '❌' : '⚠️';
    const logger = issue.level === 'error' ? console.error : console.warn;
    logger(`${icon} [${issue.code}] ${issue.message}`);
  }
}

async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? 'src/data/example-input.json';
  const raw = readFileSync(inputPath, 'utf8');
  const json: unknown = JSON.parse(raw);

  let timeline: Timeline;

  if (isTimeline(json)) {
    timeline = json;
  } else {
    const input = assertMeditationVideoInput(json);
    timeline = buildTimeline(input);
  }

  const shouldFetchAudio = process.env.FETCH_AUDIO_DURATION === 'true';

  if (
    shouldFetchAudio &&
    timeline.audio.url &&
    timeline.audio.durationSeconds === null
  ) {
    try {
      const duration = await getAudioDurationInSeconds(timeline.audio.url);
      timeline.audio.durationSeconds = duration;
      timeline.audio.durationInFrames = secondsToFrames(duration, timeline.fps);

      console.log(`ℹ️ Fetched audio duration: ${duration.toFixed(2)}s`);
    } catch (error) {
      console.warn('⚠️ Failed to fetch audio duration.');
      console.warn(error);
    }
  }

  const issues = validateTimeline(timeline);
  printIssues(issues);

  const errors = issues.filter((issue) => issue.level === 'error');

  if (errors.length > 0) {
    console.error(`\nValidation failed with ${errors.length} error(s).`);
    process.exit(1);
  }

  console.log('\n✅ Timeline validation succeeded.');
}

main().catch((error) => {
  console.error('❌ Validation failed.');
  console.error(error);
  process.exit(1);
});
