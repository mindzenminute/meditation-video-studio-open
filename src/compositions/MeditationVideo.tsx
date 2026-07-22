/**
 * Composition principale.
 *
 * Rôle :
 * - orchestrer les 4 scènes dans des Sequences Remotion
 * - brancher l'audio pré-généré
 * - consommer la timeline résolue comme source de vérité
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import type { MeditationVideoInput } from '../data/schema';
import { createBackgroundStyle } from '../styles/theme';
import { Breathing } from './scenes/Breathing';
import { Guidance } from './scenes/Guidance';
import { Intro } from './scenes/Intro';
import { Outro } from './scenes/Outro';
import { buildTimeline } from './timeline/buildTimeline';
import type { Timeline } from './timeline/types';

export interface MeditationVideoProps {
  input: MeditationVideoInput;
  timeline?: Timeline;
}

export const MeditationVideo: React.FC<MeditationVideoProps> = ({
  input,
  timeline,
}) => {
  const resolvedTimeline = timeline ?? buildTimeline(input);

  return (
    <AbsoluteFill style={createBackgroundStyle(resolvedTimeline.backgroundStyle)}>
      {resolvedTimeline.audio.url ? (
        <Audio
          src={resolvedTimeline.audio.url}
          startFrom={resolvedTimeline.audio.startFrame}
          volume={1}
        />
      ) : null}

      {resolvedTimeline.segments.map((segment) => {
        const sequenceKey = segment.id;
        const from = segment.startFrame;
        const durationInFrames = segment.durationInFrames;

        if (segment.type === 'intro') {
          return (
            <Sequence
              key={sequenceKey}
              from={from}
              durationInFrames={durationInFrames}
              name="Intro"
            >
              <Intro
                segment={segment}
                branding={resolvedTimeline.branding}
                backgroundStyle={resolvedTimeline.backgroundStyle}
                durationInFrames={durationInFrames}
              />
            </Sequence>
          );
        }

        if (segment.type === 'breathing') {
          return (
            <Sequence
              key={sequenceKey}
              from={from}
              durationInFrames={durationInFrames}
              name="Breathing"
            >
              <Breathing
                segment={segment}
                branding={resolvedTimeline.branding}
                backgroundStyle={resolvedTimeline.backgroundStyle}
                durationInFrames={durationInFrames}
              />
            </Sequence>
          );
        }

        if (segment.type === 'guidance') {
          return (
            <Sequence
              key={sequenceKey}
              from={from}
              durationInFrames={durationInFrames}
              name="Guidance"
            >
              <Guidance
                segment={segment}
                branding={resolvedTimeline.branding}
                backgroundStyle={resolvedTimeline.backgroundStyle}
                durationInFrames={durationInFrames}
              />
            </Sequence>
          );
        }

        return (
          <Sequence
            key={sequenceKey}
            from={from}
            durationInFrames={durationInFrames}
            name="Outro"
          >
            <Outro
              segment={segment}
              branding={resolvedTimeline.branding}
              backgroundStyle={resolvedTimeline.backgroundStyle}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
