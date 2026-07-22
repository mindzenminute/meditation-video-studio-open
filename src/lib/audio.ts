/**
 * Utilitaires audio.
 *
 * Important :
 * - Ce module est surtout utilisé par les scripts Node (ingest/validation).
 * - La composition Remotion n'a pas besoin d'analyser l'audio : elle reçoit
 *   une durée audio précalculée ou un fallback déclaré par n8n.
 */
import type { TimelineAudio } from '../compositions/timeline/types';
import { secondsToFrames } from './timing';

export interface AudioSyncResult {
  ok: boolean;
  deltaSeconds: number | null;
  message: string;
}

function mimeFromExtension(source: string): string | undefined {
  const clean = source.split('?')[0] ?? '';
  const extension = clean.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    default:
      return undefined;
  }
}

async function getNodeAudioDurationInSeconds(source: string): Promise<number> {
  const { parseBuffer } = await import('music-metadata');

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const mimeType = response.headers.get('content-type') ?? mimeFromExtension(source);

    const metadata = await parseBuffer(data, mimeType ? { mimeType } : {});
    if (!metadata.format.duration) {
      throw new Error('Audio duration not available in metadata.');
    }

    return metadata.format.duration;
  }

  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');

  const localPath = source.startsWith('/')
    ? join(process.cwd(), 'public', source)
    : source;

  const data = await readFile(localPath);
  const mimeType = mimeFromExtension(localPath);

  const metadata = await parseBuffer(data, mimeType ? { mimeType } : {});
  if (!metadata.format.duration) {
    throw new Error('Audio duration not available in metadata.');
  }

  return metadata.format.duration;
}

export async function getAudioDurationInSeconds(
  source: string,
  options?: {
    fallbackDurationSeconds?: number;
    timeoutMs?: number;
  },
): Promise<number> {
  if (
    options?.fallbackDurationSeconds !== undefined &&
    Number.isFinite(options.fallbackDurationSeconds)
  ) {
    return options.fallbackDurationSeconds;
  }

  if (!source) {
    throw new Error('Audio source is empty.');
  }

  const timeoutMs = options?.timeoutMs ?? 15000;

  // Environnement navigateur / Remotion Player.
  if (typeof window !== 'undefined') {
    return new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      const timeout = setTimeout(() => {
        reject(new Error('Audio metadata loading timed out.'));
      }, timeoutMs);

      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        clearTimeout(timeout);

        if (!Number.isFinite(audio.duration)) {
          reject(new Error('Audio duration is not finite.'));
          return;
        }

        resolve(audio.duration);
      };

      audio.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load audio metadata.'));
      };

      audio.src = source;
    });
  }

  // Environnement Node.
  return getNodeAudioDurationInSeconds(source);
}

export function createAudioTimeline(
  url: string,
  durationSeconds: number | null,
  fps: number,
): TimelineAudio {
  return {
    url,
    startFrame: 0,
    durationInFrames:
      durationSeconds === null ? null : secondsToFrames(durationSeconds, fps),
    durationSeconds,
    offsetSeconds: 0,
  };
}

export function assertAudioAlignment(
  audioDurationSeconds: number | null,
  expectedSeconds: number,
  toleranceSeconds = 0.5,
): AudioSyncResult {
  if (audioDurationSeconds === null) {
    return {
      ok: false,
      deltaSeconds: null,
      message: 'Audio duration is unknown. Provide audioDurationSeconds or enable FETCH_AUDIO_DURATION.',
    };
  }

  const deltaSeconds = audioDurationSeconds - expectedSeconds;
  const absoluteDelta = Math.abs(deltaSeconds);

  if (absoluteDelta <= toleranceSeconds) {
    return {
      ok: true,
      deltaSeconds,
      message: `Audio aligned with timeline (delta: ${deltaSeconds.toFixed(2)}s).`,
    };
  }

  return {
    ok: false,
    deltaSeconds,
    message: `Audio misaligned by ${deltaSeconds.toFixed(2)}s (tolerance: ${toleranceSeconds.toFixed(2)}s).`,
  };
}
