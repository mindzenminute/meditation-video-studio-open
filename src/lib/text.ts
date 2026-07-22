/**
 * Utilitaires texte pour la méditation guidée.
 *
 * Objectifs :
 * - Segmenter naturellement le texte généré par RAG.
 * - Préparer des sous-sections lisibles à l'écran.
 * - Fournir des mesures simples pour valider la densité textuelle.
 */
import type { GuidanceSubsectionInput } from '../data/schema';

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countChars(text: string): number {
  return normalizeText(text).length;
}

export function countWords(text: string): number {
  const normalized = normalizeText(text);
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
}

export function estimateSpeakingSeconds(
  text: string,
  charsPerSecond: number,
): number {
  return countChars(text) / Math.max(1, charsPerSecond);
}

export function maxCharsForDuration(
  durationSeconds: number,
  charsPerSecond: number,
): number {
  return Math.floor(durationSeconds * charsPerSecond);
}

export function splitSentences(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const matches = normalized.match(
    /[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g,
  );

  if (!matches) {
    return [normalized];
  }

  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

/**
 * Découpe un texte long en sous-sections visuelles confortables.
 * Utilisé si n8n fournit un bloc texte unique au lieu de sous-sections.
 */
export function splitTextIntoSubsections(
  text: string,
  maxCharsPerSubsection = 220,
): GuidanceSubsectionInput[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const sentences = splitSentences(normalized);
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current) {
      chunks.push(current.trim());
      current = '';
    }
  };

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length <= maxCharsPerSubsection) {
      current = candidate;
      continue;
    }

    pushCurrent();

    if (sentence.length <= maxCharsPerSubsection) {
      current = sentence;
      continue;
    }

    // Phrase trop longue : découpage par mots.
    const words = sentence.split(/\s+/);
    let part = '';

    for (const word of words) {
      const candidatePart = part ? `${part} ${word}` : word;

      if (candidatePart.length <= maxCharsPerSubsection) {
        part = candidatePart;
      } else {
        if (part) {
          chunks.push(part.trim());
        }
        part = word;
      }
    }

    if (part) {
      chunks.push(part.trim());
    }
  }

  pushCurrent();

  return chunks.map((chunk, index) => ({
    id: `guidance-auto-${index + 1}`,
    text: chunk,
  }));
}

export function detectNaturalPauseSeconds(
  text: string,
  options: {
    pauseAfterSentenceSeconds: number;
    pauseAfterParagraphSeconds: number;
  },
): number {
  const normalized = normalizeText(text);

  if (/[.!?…]$/.test(normalized)) {
    return options.pauseAfterSentenceSeconds;
  }

  return options.pauseAfterParagraphSeconds;
}
