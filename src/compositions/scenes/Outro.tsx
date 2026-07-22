/**
 * Scène de sortie (15 secondes).
 *
 * Volonté :
 * - conclusion quasi imperceptible
 * - disparition progressive vers le fond
 * - aucun appel visuel fort
 */
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { BackgroundStyle, Branding } from '../../data/schema';
import type { TimelineSegment } from '../timeline/types';
import {
  createBackgroundStyle,
  createCenterTextStyle,
  createHaloStyle,
  createOverlayStyle,
} from '../../styles/theme';

export interface OutroProps {
  segment: TimelineSegment;
  branding: Branding;
  backgroundStyle: BackgroundStyle;
  durationInFrames: number;
}

export const Outro: React.FC<OutroProps> = ({
  segment,
  branding,
  backgroundStyle,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const fadeInEnd = Math.max(1, Math.round(durationInFrames * 0.28));
  const fadeOutStart = Math.max(
    fadeInEnd + 1,
    Math.round(durationInFrames * 0.42),
  );

  const opacity = interpolate(
    frame,
    [0, fadeInEnd, fadeOutStart, durationInFrames],
    [0, 0.75, 0.75, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.03], {
    extrapolateRight: 'clamp',
  });

  const text = segment.text ?? "Merci d'avoir médité.";

  return (
    <AbsoluteFill style={createBackgroundStyle(backgroundStyle)}>
      <AbsoluteFill style={createOverlayStyle(branding)} />
      <AbsoluteFill
        style={{
          opacity,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            transform: `scale(${scale})`,
            ...createHaloStyle(branding.accentColor),
          }}
        />

        <div
          style={{
            ...createCenterTextStyle(branding, {
              size: 56,
              color: branding.secondaryColor,
              weight: 400,
            }),
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
