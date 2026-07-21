/**
 * Constantes métier et identité visuelle par défaut.
 *
 * Règle métier centrale :
 * Intro 8s + Respiration 18s + Guidage 555s + Outro 15s = 596s.
 */
import type {
  BackgroundStyle,
  Branding,
  PauseRules,
  SceneType,
} from './schema';

export const TIMING = {
  introSeconds: 8,
  breathingSeconds: 18,
  guidanceSeconds: 555,
  outroSeconds: 15,
} as const;

export const TOTAL_SECONDS: number =
  TIMING.introSeconds +
  TIMING.breathingSeconds +
  TIMING.guidanceSeconds +
  TIMING.outroSeconds;

export const DEFAULT_FPS = 30;
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;

export const EXPECTED_SCENE_SECONDS: Record<SceneType, number> = {
  intro: TIMING.introSeconds,
  breathing: TIMING.breathingSeconds,
  guidance: TIMING.guidanceSeconds,
  outro: TIMING.outroSeconds,
};

export const TEXT_LIMITS = {
  /**
   * Vitesse de lecture confortable pour une méditation lente.
   * Utilisé pour détecter les textes trop denses par rapport au temps parlé.
   */
  maxCharsPerSecond: 14,

  /**
   * Confort visuel : pas trop de texte à l'écran.
   */
  recommendedCharsPerSlide: 220,
  maxCharsPerSlide: 320,

  minGuidanceSubsectionSeconds: 8,
  maxGuidanceSubsectionSeconds: 90,
} as const;

export const DEFAULT_BRANDING: Branding = {
  title: 'Instants de fraîcheur dans une journée',
  subtitle: 'Méditation guidée · 10 minutes',
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  primaryColor: '#EAF6FF',
  secondaryColor: '#BBD7EA',
  accentColor: '#88B7D5',
  backgroundColor: '#07131d',
  overlayOpacity: 0.22,
};

export const DEFAULT_BACKGROUND_STYLE: BackgroundStyle = {
  type: 'gradient',
  colors: ['#07131d', '#12324a', '#0d4b5e'],
  angle: 160,
  animation: 'slow-pan',
};

export const DEFAULT_PAUSE_RULES: PauseRules = {
  minPauseSeconds: 1.0,
  maxPauseSeconds: 3.5,
  pauseAfterSentenceSeconds: 0.75,
  pauseAfterParagraphSeconds: 2.4,
  breathPauseEverySeconds: 45,
  enableMicroPauses: true,
};
