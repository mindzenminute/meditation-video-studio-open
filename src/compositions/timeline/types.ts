/**
 * Types de la timeline résolue.
 *
 * La timeline est la source de vérité utilisée par Remotion :
 * - frames exactes
 * - segments ordonnés
 * - événements discrets (scènes, sous-sections, pauses, respiration)
 */
import type {
  BackgroundStyle,
  Branding,
  PauseRules,
  SceneType,
} from '../../data/schema';

export interface TimelineSubsection {
  id: string;
  text: string;
  startFrame: number;
  durationInFrames: number;
  spokenStartFrame: number;
  spokenDurationInFrames: number;
  pauseAfterFrames: number;
  isPause: boolean;
}

export interface TimelineSegment {
  id: string;
  type: SceneType;
  startFrame: number;
  durationInFrames: number;
  durationSeconds: number;
  text?: string;
  subsections?: TimelineSubsection[];
}

export type TimelineEventType =
  | 'scene-start'
  | 'scene-end'
  | 'subsection-start'
  | 'subsection-end'
  | 'pause-start'
  | 'pause-end'
  | 'breath-in'
  | 'breath-out';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  frame: number;
  segmentId: string;
  payload?: Record<string, unknown>;
}

export interface TimelineAudio {
  url: string;
  startFrame: number;
  durationInFrames: number | null;
  durationSeconds: number | null;
  offsetSeconds: number;
}

export interface Timeline {
  version: '1.0';
  title: string;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  totalSeconds: number;
  segments: TimelineSegment[];
  events: TimelineEvent[];
  audio: TimelineAudio;
  branding: Branding;
  backgroundStyle: BackgroundStyle;
  pauseRules: PauseRules;
  warnings: string[];
}
