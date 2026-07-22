/**
 * Scène d'introduction (8 secondes).
 *
 * Intentions :
 * - entrée très douce
 * - titre lisible mais non agressif
 * - léger zoom descendant pour installer le calme
 */
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { BackgroundStyle, Branding } from '../../data/schema';
import type { TimelineSegment } from '../timeline/types';
import {
  createBackgroundStyle,
  createCenterTextStyle,
  createOverlayStyle,
} from '../../styles/theme';

export interface IntroProps {
  segment: TimelineSegment;
  branding: Branding;
  backgroundStyle: BackgroundStyle;
  durationInFrames: number;
}

export const Intro: React.FC<IntroProps> = ({
  branding,
  backgroundStyle,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const fadeIn = Math.max(12, Math.round(durationInFrames * 0.18));
  const fadeOut = Math.max(12, Math.round(durationInFrames * 0.22));

  const titleInEnd = fadeIn;
  const titleOutStart = Math.max(titleInEnd + 1, durationInFrames - fadeOut);

  const titleOpacity = interpolate(
    frame,
    [0, titleInEnd, titleOutStart, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const subtitleInStart = Math.min(
    durationInFrames - 2,
    Math.round(durationInFrames * 0.22),
  );
  const subtitleInEnd = Math.min(
    durationInFrames - 1,
    subtitleInStart + Math.round(durationInFrames * 0.16),
  );
  const subtitleOutStart = Math.max(
    subtitleInEnd + 1,
    durationInFrames - Math.round(durationInFrames * 0.18),
  );

  const subtitleOpacity = interpolate(
    frame,
    [subtitleInStart, subtitleInEnd, subtitleOutStart, durationInFrames],
    [0, 0.92, 0.92, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const scale = interpolate(frame, [0, durationInFrames], [1.015, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={createBackgroundStyle(backgroundStyle)}>
      <AbsoluteFill style={createOverlayStyle(branding)} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 12%',
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${scale})`,
            ...createCenterTextStyle(branding, {
              size: 84,
              weight: 600,
              lineHeight: 1.18,
            }),
          }}
        >
          {branding.title}
        </div>

        <div
          style={{
            marginTop: 28,
            opacity: subtitleOpacity,
            ...createCenterTextStyle(branding, {
              size: 38,
              color: branding.secondaryColor,
              weight: 400,
            }),
          }}
        >
          {branding.subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
