/**
 * Schéma d'entrée pour la charge utile JSON produite par n8n/OpenRouter RAG.
 *
 * Objectif :
 * - Définir un contrat TypeScript strict entre n8n, le pipeline de validation
 *   et la composition Remotion.
 * - Garantir la présence des 4 segments métier :
 *   intro, breathing, guidance, outro.
 */

export const REQUIRED_SCENE_TYPES = [
  'intro',
  'breathing',
  'guidance',
  'outro',
] as const;

export type SceneType = (typeof REQUIRED_SCENE_TYPES)[number];

export interface Branding {
  title: string;
  subtitle: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  overlayOpacity: number;
  logoUrl?: string;
}

export interface BackgroundStyle {
  type: 'gradient' | 'solid' | 'image';
  colors?: string[];
  angle?: number;
  imageUrl?: string;
  animation?: 'none' | 'slow-pan' | 'breathing';
}

export interface PauseRules {
  minPauseSeconds: number;
  maxPauseSeconds: number;
  pauseAfterSentenceSeconds: number;
  pauseAfterParagraphSeconds: number;
  breathPauseEverySeconds: number;
  enableMicroPauses: boolean;
}

export interface GuidanceSubsectionInput {
  id?: string;
  text: string;
  pauseAfterSeconds?: number;
  durationSeconds?: number;
}

interface BaseSegmentInput {
  id?: string;
  durationSeconds?: number;
}

export interface IntroSegmentInput extends BaseSegmentInput {
  type: 'intro';
  text?: string;
}

export interface BreathingSegmentInput extends BaseSegmentInput {
  type: 'breathing';
  text?: string;
}

export interface GuidanceSegmentInput extends BaseSegmentInput {
  type: 'guidance';
  text?: string;
  subsections?: GuidanceSubsectionInput[];
}

export interface OutroSegmentInput extends BaseSegmentInput {
  type: 'outro';
  text?: string;
}

export type SegmentInput =
  | IntroSegmentInput
  | BreathingSegmentInput
  | GuidanceSegmentInput
  | OutroSegmentInput;

export interface MeditationVideoInput {
  title: string;
  fps?: number;
  width?: number;
  height?: number;
  segments: SegmentInput[];
  audioUrl: string;
  audioDurationSeconds?: number;
  backgroundStyle?: Partial<BackgroundStyle>;
  branding?: Partial<Branding>;
  pauseRules?: Partial<PauseRules>;
  metadata?: Record<string, unknown>;
}

export class SchemaValidationError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid meditation video input:\n- ${issues.join('\n- ')}`);
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
  issues: string[],
  context: string,
  required: boolean,
): string | undefined {
  const value = record[key];

  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined || value === null) {
    if (required) {
      issues.push(`${context}.${key} is required and must be a string.`);
    }
    return undefined;
  }

  issues.push(`${context}.${key} must be a string.`);
  return undefined;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
  issues: string[],
  context: string,
  required: boolean,
): number | undefined {
  const value = record[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    if (required) {
      issues.push(`${context}.${key} is required and must be a finite number.`);
    }
    return undefined;
  }

  issues.push(`${context}.${key} must be a finite number.`);
  return undefined;
}

function parseGuidanceSubsection(
  raw: unknown,
  index: number,
  issues: string[],
  context: string,
): GuidanceSubsectionInput | undefined {
  if (!isRecord(raw)) {
    issues.push(`${context} must be an object.`);
    return undefined;
  }

  const text = readString(raw, 'text', issues, context, true);
  if (text === undefined) {
    return undefined;
  }

  const id = readString(raw, 'id', issues, context, false);
  const pauseAfterSeconds = readNumber(
    raw,
    'pauseAfterSeconds',
    issues,
    context,
    false,
  );
  const durationSeconds = readNumber(
    raw,
    'durationSeconds',
    issues,
    context,
    false,
  );

  return {
    id,
    text,
    pauseAfterSeconds,
    durationSeconds,
  };
}

function parseSegment(
  raw: unknown,
  index: number,
  issues: string[],
): SegmentInput | undefined {
  const context = `segments[${index}]`;

  if (!isRecord(raw)) {
    issues.push(`${context} must be an object.`);
    return undefined;
  }

  const type = readString(raw, 'type', issues, context, true);
  const id = readString(raw, 'id', issues, context, false);
  const durationSeconds = readNumber(
    raw,
    'durationSeconds',
    issues,
    context,
    false,
  );
  const text = readString(raw, 'text', issues, context, false);

  switch (type) {
    case 'intro':
      return {
        id,
        type: 'intro',
        durationSeconds,
        text,
      } satisfies IntroSegmentInput;

    case 'breathing':
      return {
        id,
        type: 'breathing',
        durationSeconds,
        text,
      } satisfies BreathingSegmentInput;

    case 'guidance': {
      let subsections: GuidanceSubsectionInput[] | undefined;

      if (raw.subsections !== undefined) {
        if (!Array.isArray(raw.subsections)) {
          issues.push(`${context}.subsections must be an array.`);
        } else {
          subsections = raw.subsections.flatMap((subsection, subIndex) => {
            const parsed = parseGuidanceSubsection(
              subsection,
              subIndex,
              issues,
              `${context}.subsections[${subIndex}]`,
            );
            return parsed ? [parsed] : [];
          });
        }
      }

      if (text === undefined && (!subsections || subsections.length === 0)) {
        issues.push(`${context} requires either text or subsections.`);
        return undefined;
      }

      return {
        id,
        type: 'guidance',
        durationSeconds,
        text,
        subsections,
      } satisfies GuidanceSegmentInput;
    }

    case 'outro':
      return {
        id,
        type: 'outro',
        durationSeconds,
        text,
      } satisfies OutroSegmentInput;

    default:
      issues.push(`${context}.type is invalid. Expected intro|breathing|guidance|outro.`);
      return undefined;
  }
}

export function assertMeditationVideoInput(
  value: unknown,
): MeditationVideoInput {
  const issues: string[] = [];

  if (!isRecord(value)) {
    throw new SchemaValidationError(['Input payload must be a JSON object.']);
  }

  const title = readString(value, 'title', issues, 'input', true);
  const audioUrl = readString(value, 'audioUrl', issues, 'input', true);

  const fps = readNumber(value, 'fps', issues, 'input', false);
  const width = readNumber(value, 'width', issues, 'input', false);
  const height = readNumber(value, 'height', issues, 'input', false);
  const audioDurationSeconds = readNumber(
    value,
    'audioDurationSeconds',
    issues,
    'input',
    false,
  );

  if (!Array.isArray(value.segments)) {
    issues.push('input.segments must be an array.');
  }

  const segments = Array.isArray(value.segments)
    ? value.segments.flatMap((segment, index) => {
        const parsed = parseSegment(segment, index, issues);
        return parsed ? [parsed] : [];
      })
    : [];

  const segmentTypes = new Set(segments.map((segment) => segment.type));
  for (const requiredType of REQUIRED_SCENE_TYPES) {
    if (!segmentTypes.has(requiredType)) {
      issues.push(`Missing required segment type: ${requiredType}.`);
    }
  }

  if (fps !== undefined && fps <= 0) {
    issues.push('input.fps must be greater than 0.');
  }

  if (width !== undefined && width <= 0) {
    issues.push('input.width must be greater than 0.');
  }

  if (height !== undefined && height <= 0) {
    issues.push('input.height must be greater than 0.');
  }

  if (audioDurationSeconds !== undefined && audioDurationSeconds <= 0) {
    issues.push('input.audioDurationSeconds must be greater than 0.');
  }

  if (value.backgroundStyle !== undefined && !isRecord(value.backgroundStyle)) {
    issues.push('input.backgroundStyle must be an object.');
  }

  if (value.branding !== undefined && !isRecord(value.branding)) {
    issues.push('input.branding must be an object.');
  }

  if (value.pauseRules !== undefined && !isRecord(value.pauseRules)) {
    issues.push('input.pauseRules must be an object.');
  }

  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    issues.push('input.metadata must be an object.');
  }

  if (issues.length > 0) {
    throw new SchemaValidationError(issues);
  }

  return {
    title: title as string,
    fps,
    width,
    height,
    segments,
    audioUrl: audioUrl as string,
    audioDurationSeconds,
    backgroundStyle: isRecord(value.backgroundStyle)
      ? (value.backgroundStyle as Partial<BackgroundStyle>)
      : undefined,
    branding: isRecord(value.branding)
      ? (value.branding as Partial<Branding>)
      : undefined,
    pauseRules: isRecord(value.pauseRules)
      ? (value.pauseRules as Partial<PauseRules>)
      : undefined,
    metadata: isRecord(value.metadata)
      ? (value.metadata as Record<string, unknown>)
      : undefined,
  };
}
