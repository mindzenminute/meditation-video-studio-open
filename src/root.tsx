/**
 * Point d'entrée Remotion.
 *
 * La durée et les props sont calculées dynamiquement à partir de l'input n8n.
 * Cela permet de garder une seule composition déclarée tout en supportant
 * des contenus différents.
 */
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MeditationVideo } from './compositions/MeditationVideo';
import { buildTimeline } from './compositions/timeline/buildTimeline';
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  TOTAL_SECONDS,
} from './data/defaults';
import exampleInput from './data/example-input.json';
import type { MeditationVideoInput } from './data/schema';

const defaultInput = exampleInput as MeditationVideoInput;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MeditationVideo"
      component={MeditationVideo}
      durationInFrames={TOTAL_SECONDS * DEFAULT_FPS}
      fps={DEFAULT_FPS}
      width={DEFAULT_WIDTH}
      height={DEFAULT_HEIGHT}
      defaultProps={{
        input: defaultInput,
      }}
      calculateMetadata={async ({ props }) => {
        const timeline = buildTimeline(props.input);

        return {
          durationInFrames: timeline.totalFrames,
          fps: timeline.fps,
          width: timeline.width,
          height: timeline.height,
          props: {
            input: props.input,
            timeline,
          },
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
