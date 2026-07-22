/**
 * Générateur de timeline à partir du JSON n8n/RAG.
 *
 * Rôle :
 * - Transformer les secondes métier en frames Remotion.
 * - Répartir le guidage en sous-sections avec pauses naturelles.
 * - Garantir le format global : 596 secondes.
 * - Produire des événements de timeline exploitables pour la validation.
 */
import {
  DEFAULT_BACKGROUND_STYLE,
  DEFAULT_BRANDING,
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_PAUSE_RULES,
  DEFAULT_WIDTH,
  EXPECTED_SCENE_SECONDS,
  TEXT_LIMITS,
  TIMING,
  TOTAL_SECONDS,
} from '../../data/defaults';
import type {
  BackgroundStyle,
  Branding,
  GuidanceSegmentInput,
  MeditationVideoInput,
  PauseRules,
  SceneType,
  SegmentInput,
} from '../../data/schema';
import {
  clamp,
  distributeFrames,
  rangeFromSeconds,
  secondsToFrames,
  sumNumbers,
} from '../../lib/timing';
import { countChars, normalizeText, splitTextIntoSubsections } from '../../lib/text';
import type {
  Timeline,
  TimelineEvent,
  TimelineSegment,
  TimelineSubsection,
} from './types';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

type NormalizedGuidanceSubsection = {
  id: string;
  text: string;
  pauseAfterSeconds?: number;
  durationSeconds?: number;
};

function findSegment<T extends SceneType>(
  segments: SegmentInput[],
  type: T,
): Extract<SegmentInput, { type: T }> | undefined {
  return segments.find(
    (segment): segment is Extract<SegmentInput, { type: T }> =>
      segment.type === type,
  );
}

function buildGuidanceSegment(
  segment: GuidanceSegmentInput,
  startFrame: number,
  durationInFrames: number,
  durationSeconds: number,
  fps: number,
  pauseRules: PauseRules,
  warnings: string[],
): TimelineSegment {
  const rawSubsections =
    segment.subsections && segment.subsections.length > 0
      ? segment.subsections
      : splitTextIntoSubsections(
          segment.text ?? '',
          TEXT_LIMITS.recommendedCharsPerSlide,
        );

  let subsectionsInput: NormalizedGuidanceSubsection[] = rawSubsections
    .map((subsection, index) => ({
      id: subsection.id ?? `guidance-${index + 1}`,
      text: normalizeText(subsection.text),
      pauseAfterSeconds: subsection.pauseAfterSeconds,
      durationSeconds: subsection.durationSeconds,
    }))
    .filter((subsection) => subsection.text.length > 0);

  if (subsectionsInput.length === 0) {
    warnings.push(
      'Guidance segment has no usable text. A silent placeholder was inserted.',
    );

    subsectionsInput = [
      {
        id: 'guidance-placeholder',
        text: 'Prenez un instant pour revenir à vous.',
        pauseAfterSeconds: pauseRules.minPauseSeconds,
      },
    ];
  }

  let pauseFrames = subsectionsInput.map((subsection, index) => {
    const isLast = index === subsectionsInput.length - 1;
    const fallbackPause = isLast
      ? Math.min(pauseRules.maxPauseSeconds, 2.0)
      : pauseRules.pauseAfterParagraphSeconds;

    const pauseSeconds = clamp(
      subsection.pauseAfterSeconds ?? fallbackPause,
      pauseRules.minPauseSeconds,
      pauseRules.maxPauseSeconds,
    );

    return secondsToFrames(pauseSeconds, fps);
  });

  let totalPauseFrames = sumNumbers(pauseFrames);

  const maxPauseFrames = Math.floor(durationInFrames * 0.45);

  if (totalPauseFrames > maxPauseFrames && totalPauseFrames > 0) {
    const scale = maxPauseFrames / totalPauseFrames;
    pauseFrames = pauseFrames.map((frames) => Math.floor(frames * scale));
    totalPauseFrames = sumNumbers(pauseFrames);

    warnings.push(
      'Guidance pauses were compressed to preserve enough spoken content time.',
    );
  }

  let speechFrames = durationInFrames - totalPauseFrames;

  if (speechFrames < subsectionsInput.length) {
    pauseFrames = pauseFrames.map(() => 0);
    totalPauseFrames = 0;
    speechFrames = durationInFrames;

    warnings.push(
      'Guidance segment was too short for planned pauses. Pauses were removed.',
    );
  }

  const weights = subsectionsInput.map((subsection) =>
    subsection.durationSeconds !== undefined
      ? Math.max(0.001, subsection.durationSeconds)
      : Math.max(1, countChars(subsection.text)),
  );

  const speechDistribution = distributeFrames(speechFrames, weights);

  let cursor = startFrame;

  const subsections: TimelineSubsection[] = subsectionsInput.map(
    (subsection, index) => {
      const spokenDurationInFrames = speechDistribution[index] ?? 0;
      const pauseAfterFrames = pauseFrames[index] ?? 0;
      const subStartFrame = cursor;
      const subDurationInFrames = spokenDurationInFrames + pauseAfterFrames;

      cursor += subDurationInFrames;

      const spokenSeconds = spokenDurationInFrames / fps;
      const maxChars = Math.floor(spokenSeconds * TEXT_LIMITS.maxCharsPerSecond);
      const chars = countChars(subsection.text);

      if (chars > maxChars) {
        warnings.push(
          `Guidance subsection "${subsection.id}" may overflow: ${chars} chars for ${spokenSeconds.toFixed(1)}s (max ${maxChars}).`,
        );
      }

      return {
        id: subsection.id,
        text: subsection.text,
        startFrame: subStartFrame,
        durationInFrames: subDurationInFrames,
        spokenStartFrame: subStartFrame,
        spokenDurationInFrames,
        pauseAfterFrames,
        isPause: false,
      };
    },
  );

  // Correction de bord : garantit que la fin tombe exactement sur la fin du segment.
  const expectedEnd = startFrame + durationInFrames;
  if (cursor !== expectedEnd && subsections.length > 0) {
    const diff = expectedEnd - cursor;
    const last = subsections[subsections.length - 1] as TimelineSubsection;

    last.durationInFrames += diff;

    if (diff >= 0) {
      last.pauseAfterFrames += diff;
    } else {
      const pauseReduction = Math.min(last.pauseAfterFrames, -diff);
      last.pauseAfterFrames -= pauseReduction;

      const remaining = -diff - pauseReduction;
      last.spokenDurationInFrames = Math.max(
        0,
        last.spokenDurationInFrames - remaining,
      );
    }
  }

  return {
    id: segment.id ?? 'guidance',
    type: 'guidance',
    startFrame,
    durationInFrames,
    durationSeconds,
    text: segment.text,
    subsections,
  };
}

function buildEvents(segments: TimelineSegment[], fps: number): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const segment of segments) {
    events.push({
      id: `${segment.id}:start`,
      type: 'scene-start',
      frame: segment.startFrame,
      segmentId: segment.id,
      payload: {
        sceneType: segment.type,
      },
    });

    events.push({
      id: `${segment.id}:end`,
      type: 'scene-end',
      frame: segment.startFrame + segment.durationInFrames,
      segmentId: segment.id,
      payload: {
        sceneType: segment.type,
      },
    });

    if (segment.type === 'breathing') {
      const cycleSeconds = 6;
      const cycles = Math.floor(segment.durationSeconds / cycleSeconds);

      for (let i = 0; i < cycles; i += 1) {
        const inhaleFrame =
          segment.startFrame + secondsToFrames(i * cycleSeconds, fps);
        const exhaleFrame =
          segment.startFrame + secondsToFrames(i * cycleSeconds + 3.3, fps);

        events.push({
          id: `${segment.id}:inhale-${i + 1}`,
          type: 'breath-in',
          frame: inhaleFrame,
          segmentId: segment.id,
        });

        events.push({
          id: `${segment.id}:exhale-${i + 1}`,
          type: 'breath-out',
          frame: exhaleFrame,
          segmentId: segment.id,
        });
      }
    }

    if (segment.subsections) {
      for (const subsection of segment.subsections) {
        events.push({
          id: `${subsection.id}:start`,
          type: 'subsection-start',
          frame: subsection.startFrame,
          segmentId: segment.id,
          payload: {
            subsectionId: subsection.id,
          },
        });

        const pauseStartFrame =
          subsection.startFrame + subsection.spokenDurationInFrames;

        if (subsection.pauseAfterFrames > 0) {
          events.push({
            id: `${subsection.id}:pause-start`,
            type: 'pause-start',
            frame: pauseStartFrame,
            segmentId: segment.id,
            payload: {
              subsectionId: subsection.id,
            },
          });

          events.push({
            id: `${subsection.id}:pause-end`,
            type: 'pause-end',
            frame: subsection.startFrame + subsection.durationInFrames,
            segmentId: segment.id,
            payload: {
              subsectionId: subsection.id,
            },
          });
        }

        events.push({
          id: `${subsection.id}:end`,
          type: 'subsection-end',
          frame: subsection.startFrame + subsection.durationInFrames,
          segmentId: segment.id,
          payload: {
            subsectionId: subsection.id,
          },
        });
      }
    }
  }

  return events.sort((a, b) => a.frame - b.frame);
}

export function buildTimeline(input: MeditationVideoInput): Timeline {
  const fps = input.fps ?? DEFAULT_FPS;
  const width = input.width ?? DEFAULT_WIDTH;
  const height = input.height ?? DEFAULT_HEIGHT;

  const branding: Branding = {
    ...DEFAULT_BRANDING,
    ...input.branding,
    title: input.branding?.title ?? input.title,
    subtitle: input.branding?.subtitle ?? DEFAULT_BRANDING.subtitle,
  };

  const backgroundStyle: BackgroundStyle = {
    ...DEFAULT_BACKGROUND_STYLE,
    ...input.backgroundStyle,
  };

  const pauseRules: PauseRules = {
    ...DEFAULT_PAUSE_RULES,
    ...input.pauseRules,
  };

  const warnings: string[] = [];

  const intro = findSegment(input.segments, 'intro');
  const breathing = findSegment(input.segments, 'breathing');
  const guidance = findSegment(input.segments, 'guidance');
  const outro = findSegment(input.segments, 'outro');

  if (!intro) throw new Error('Missing required segment: intro.');
  if (!breathing) throw new Error('Missing required segment: breathing.');
  if (!guidance) throw new Error('Missing required segment: guidance.');
  if (!outro) throw new Error('Missing required segment: outro.');

  const durations = {
    intro: intro.durationSeconds ?? EXPECTED_SCENE_SECONDS.intro,
    breathing: breathing.durationSeconds ?? EXPECTED_SCENE_SECONDS.breathing,
    guidance: guidance.durationSeconds ?? EXPECTED_SCENE_SECONDS.guidance,
    outro: outro.durationSeconds ?? EXPECTED_SCENE_SECONDS.outro,
  };

  const totalSeconds = sumNumbers(Object.values(durations));

  if (Math.abs(totalSeconds - TOTAL_SECONDS) > 0.001) {
    throw new Error(
      `Total segment duration must equal ${TOTAL_SECONDS}s, received ${totalSeconds.toFixed(3)}s.`,
    );
  }

  let elapsedSeconds = 0;

  const introRange = rangeFromSeconds(elapsedSeconds, durations.intro, fps);
  elapsedSeconds += durations.intro;

  const breathingRange = rangeFromSeconds(elapsedSeconds, durations.breathing, fps);
  elapsedSeconds += durations.breathing;

  const guidanceRange = rangeFromSeconds(elapsedSeconds, durations.guidance, fps);
  elapsedSeconds += durations.guidance;

  const outroRange = rangeFromSeconds(elapsedSeconds, durations.outro, fps);

  const segments: TimelineSegment[] = [];

  segments.push({
    id: intro.id ?? 'intro',
    type: 'intro',
    startFrame: introRange.startFrame,
    durationInFrames: introRange.durationInFrames,
    durationSeconds: durations.intro,
    text: intro.text,
  });

  segments.push({
    id: breathing.id ?? 'breathing',
    type: 'breathing',
    startFrame: breathingRange.startFrame,
    durationInFrames: breathingRange.durationInFrames,
    durationSeconds: durations.breathing,
    text: breathing.text,
  });

  segments.push(
    buildGuidanceSegment(
      guidance,
      guidanceRange.startFrame,
      guidanceRange.durationInFrames,
      durations.guidance,
      fps,
      pauseRules,
      warnings,
    ),
  );

  segments.push({
    id: outro.id ?? 'outro',
    type: 'outro',
    startFrame: outroRange.startFrame,
    durationInFrames: outroRange.durationInFrames,
    durationSeconds: durations.outro,
    text: outro.text,
  });

  const events = buildEvents(segments, fps);

  const audioDurationSeconds = input.audioDurationSeconds ?? null;
  const audioDurationInFrames =
    audioDurationSeconds === null
      ? null
      : secondsToFrames(audioDurationSeconds, fps);

  return {
    version: '1.0',
    title: input.title,
    fps,
    width,
    height,
    totalFrames: secondsToFrames(totalSeconds, fps),
    totalSeconds,
    segments,
    events,
    audio: {
      url: input.audioUrl,
      startFrame: 0,
      durationInFrames: audioDurationInFrames,
      durationSeconds: audioDurationSeconds,
      offsetSeconds: 0,
    },
    branding,
    backgroundStyle,
    pauseRules,
    warnings,
  };
}

export function validateTimeline(timeline: Timeline): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const totalSeconds = timeline.totalFrames / timeline.fps;

  if (Math.abs(totalSeconds - TOTAL_SECONDS) > 0.05) {
    issues.push({
      level: 'error',
      code: 'duration.total',
      message: `Expected total duration ${TOTAL_SECONDS}s, got ${totalSeconds.toFixed(2)}s.`,
    });
  }

  const segmentTypes = new Set(timeline.segments.map((segment) => segment.type));

  for (const requiredType of ['intro', 'breathing', 'guidance', 'outro'] as const) {
    if (!segmentTypes.has(requiredType)) {
      issues.push({
        level: 'error',
        code: 'segment.missing',
        message: `Missing required segment: ${requiredType}.`,
      });
    }
  }

  const sumSegmentFrames = sumNumbers(
    timeline.segments.map((segment) => segment.durationInFrames),
  );

  if (sumSegmentFrames !== timeline.totalFrames) {
    issues.push({
      level: 'error',
      code: 'frames.sum',
      message: `Segment frames sum ${sumSegmentFrames} does not match total frames ${timeline.totalFrames}.`,
    });
  }

  for (const segment of timeline.segments) {
    const expectedSeconds = EXPECTED_SCENE_SECONDS[segment.type];

    if (Math.abs(segment.durationSeconds - expectedSeconds) > 0.05) {
      issues.push({
        level: 'error',
        code: `duration.${segment.type}`,
        message: `Segment ${segment.type} should be ${expectedSeconds}s, got ${segment.durationSeconds.toFixed(2)}s.`,
      });
    }
  }

  const guidance = timeline.segments.find((segment) => segment.type === 'guidance');

  if (guidance?.subsections) {
    const sumSubsectionFrames = sumNumbers(
      guidance.subsections.map((subsection) => subsection.durationInFrames),
    );

    if (sumSubsectionFrames !== guidance.durationInFrames) {
      issues.push({
        level: 'error',
        code: 'guidance.frames',
        message: `Guidance subsection frames sum ${sumSubsectionFrames} does not match guidance duration ${guidance.durationInFrames}.`,
      });
    }

    for (const subsection of guidance.subsections) {
      const spokenSeconds = subsection.spokenDurationInFrames / timeline.fps;
      const maxChars = Math.floor(spokenSeconds * TEXT_LIMITS.maxCharsPerSecond);
      const chars = countChars(subsection.text);

      if (chars > maxChars) {
        issues.push({
          level: 'error',
          code: 'text.overflow',
          message: `Guidance subsection "${subsection.id}" has ${chars} chars for ${spokenSeconds.toFixed(2)}s. Max allowed: ${maxChars}.`,
        });
      } else if (chars > TEXT_LIMITS.recommendedCharsPerSlide) {
        issues.push({
          level: 'warning',
          code: 'text.length',
          message: `Guidance subsection "${subsection.id}" has ${chars} chars. Recommended max per slide: ${TEXT_LIMITS.recommendedCharsPerSlide}.`,
        });
      }
    }
  }

  if (!timeline.audio.url) {
    issues.push({
      level: 'warning',
      code: 'audio.missing-url',
      message: 'No audio URL provided. The video will be silent.',
    });
  }

  if (timeline.audio.durationSeconds !== null) {
    const delta = timeline.audio.durationSeconds - totalSeconds;
    const absoluteDelta = Math.abs(delta);

    if (absoluteDelta > 1) {
      issues.push({
        level: 'error',
        code: 'audio.alignment',
        message: `Audio duration ${timeline.audio.durationSeconds.toFixed(2)}s does not match timeline ${totalSeconds.toFixed(2)}s.`,
      });
    } else if (absoluteDelta > 0.25) {
      issues.push({
        level: 'warning',
        code: 'audio.alignment',
        message: `Audio duration differs from timeline by ${delta.toFixed(2)}s.`,
      });
    }
  } else if (timeline.audio.url) {
    issues.push({
      level: 'warning',
      code: 'audio.duration-unknown',
      message:
        'Audio duration unknown. Provide audioDurationSeconds or set FETCH_AUDIO_DURATION=true.',
    });
  }

  for (const warning of timeline.warnings) {
    issues.push({
      level: 'warning',
      code: 'timeline.warning',
      message: warning,
    });
  }

  return issues;
}
