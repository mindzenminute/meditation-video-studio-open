/**
 * Scène de respiration (18 secondes).
 *
 * Rôle :
 * - transition entre l'intro et le guidage
 * - synchronisation visuelle simple : inspiration / rétention / expiration
 * - le cercle reste discret, sans rupture visuelle forte
 */
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { BackgroundStyle, Branding } from '../../data/schema';
import type { TimelineSegment } from '../timeline/types';
import {
  createBackgroundStyle,
  createCenterTextStyle,
  createHaloStyle,
  createOverlayStyle,
} from '../../styles/theme';

export interface BreathingProps {
  segment: TimelineSegment;
  branding: Branding;
  backgroundStyle: BackgroundStyle;
  durationInFrames: number;
}

export const Breathing: React.FC<BreathingProps> = ({
  segment,
  branding,
  backgroundStyle,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycleSeconds = 6;
  const inhaleSeconds = 2.7;
  const holdSeconds = 0.6;

  const timeSeconds = frame / fps;
  const cycleTime = timeSeconds % cycleSeconds;

  let scale = 0.72;
  let label = 'Inspirez';

  if (cycleTime < inhaleSeconds) {
    scale = interpolate(cycleTime, [0, inhaleSeconds], [0.72, 1], {
      extrapolateRight: 'clamp',
    });
    label = 'Inspirez';
  } else if (cycleTime < inhaleSeconds + holdSeconds) {
    scale = 1;
    label = 'Retenez';
  } else {
    scale = interpolate(
      cycleTime,
      [inhaleSeconds + holdSeconds, cycleSeconds],
      [1, 0.72],
      {
        extrapolateRight: 'clamp',
      },
    );
    label = 'Expirez';
  }

  const fade = Math.max(12, Math.round(durationInFrames * 0.16));

  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

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
            ...createHaloStyle(branding.accentColor),
          }}
        />

        <div
          style={{
            width: 430,
            height: 430,
            borderRadius: '50%',
            border: `1px solid ${branding.accentColor}55`,
            background: `radial-gradient(circle, ${branding.accentColor}22 0%, transparent 70%)`,
            transform: `scale(${scale})`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 220,
            opacity: 0.72,
            ...createCenterTextStyle(branding, {
              size: 42,
              color: branding.secondaryColor,
              weight: 400,
            }),
          }}
        >
          {label}
        </div>

        {segment.text ? (
          <div
            style={{
              position: 'absolute',
              bottom: 140,
              opacity: 0.42,
              ...createCenterTextStyle(branding, {
                size: 30,
                color: branding.secondaryColor,
                weight: 300,
              }),
            }}
          >
            {segment.text}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
