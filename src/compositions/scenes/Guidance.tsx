/**
 * Scène de guidage (555 secondes).
 *
 * Choix de conception :
 * - affichage en fondu doux des sous-sections
 * - pas de coupure franche : translation légère + opacity
 * - les pauses font partie du rythme, sans écran vide brutal
 */
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { BackgroundStyle, Branding } from '../../data/schema';
import type { TimelineSegment, TimelineSubsection } from '../timeline/types';
import {
  createBackgroundStyle,
  createCenterTextStyle,
  createOverlayStyle,
} from '../../styles/theme';

export interface GuidanceProps {
  segment: TimelineSegment;
  branding: Branding;
  backgroundStyle: BackgroundStyle;
  durationInFrames: number;
}

export const Guidance: React.FC<GuidanceProps> = ({
  segment,
  branding,
  backgroundStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fallbackSubsections: TimelineSubsection[] = segment.text
    ? [
        {
          id: `${segment.id}-fallback`,
          text: segment.text,
          startFrame: segment.startFrame,
          durationInFrames: segment.durationInFrames,
          spokenStartFrame: segment.startFrame,
          spokenDurationInFrames: segment.durationInFrames,
          pauseAfterFrames: 0,
          isPause: false,
        },
      ]
    : [];

  const subsections =
    segment.subsections && segment.subsections.length > 0
      ? segment.subsections
      : fallbackSubsections;

  return (
    <AbsoluteFill style={createBackgroundStyle(backgroundStyle)}>
      <AbsoluteFill style={createOverlayStyle(branding)} />

      {subsections.map((subsection) => {
        const localStart = subsection.startFrame - segment.startFrame;
        const localEnd = localStart + subsection.durationInFrames;

        if (subsection.durationInFrames <= 0) {
          return null;
        }

        if (subsection.durationInFrames <= 2) {
          const opacity = frame >= localStart && frame < localEnd ? 0.96 : 0;

          return (
            <AbsoluteFill
              key={subsection.id}
              style={{
                opacity,
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 14%',
              }}
            >
              <p
                style={{
                  margin: 0,
                  ...createCenterTextStyle(branding, {
                    size: 64,
                    lineHeight: 1.45,
                  }),
                }}
              >
                {subsection.text}
              </p>
            </AbsoluteFill>
          );
        }

        const maxFade = Math.max(1, Math.floor(subsection.durationInFrames / 3));
        const fadeIn = Math.min(Math.round(fps * 1.1), maxFade);
        const fadeOut = Math.min(Math.round(fps * 1.3), maxFade);

        const fadeInEnd = localStart + fadeIn;
        const fadeOutStart = localEnd - fadeOut;

        const opacity = interpolate(
          frame,
          [localStart, fadeInEnd, fadeOutStart, localEnd],
          [0, 0.96, 0.96, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        );

        const translateY = interpolate(
          frame,
          [localStart, fadeInEnd, fadeOutStart, localEnd],
          [16, 0, 0, -12],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        );

        return (
          <AbsoluteFill
            key={subsection.id}
            style={{
              opacity,
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 14%',
            }}
          >
            <p
              style={{
                margin: 0,
                transform: `translateY(${translateY}px)`,
                ...createCenterTextStyle(branding, {
                  size: 64,
                  lineHeight: 1.45,
                }),
              }}
            >
              {subsection.text}
            </p>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
