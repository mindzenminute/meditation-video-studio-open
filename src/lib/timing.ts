/**
 * Utilitaires de timing image/seconde.
 *
 * Décision clé :
 * - Les arrondis sont centralisés ici pour éviter les dérives de timeline.
 * - La distribution de frames utilise les restes fractionnaires pour garantir
 *   que la somme des parties corresponde exactement au total.
 */

export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error(`clamp: min (${min}) must not be greater than max (${max}).`);
  }

  return Math.min(max, Math.max(min, value));
}

export function secondsToFrames(seconds: number, fps: number): number {
  if (!Number.isFinite(seconds)) {
    throw new Error('secondsToFrames: seconds must be a finite number.');
  }

  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('secondsToFrames: fps must be a positive finite number.');
  }

  return Math.max(0, Math.round(seconds * fps));
}

export function framesToSeconds(frames: number, fps: number): number {
  if (!Number.isFinite(frames)) {
    throw new Error('framesToSeconds: frames must be a finite number.');
  }

  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('framesToSeconds: fps must be a positive finite number.');
  }

  return frames / fps;
}

export function sumNumbers(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

/**
 * Distribue un nombre total de frames selon des poids, sans perte d'arrondi.
 */
export function distributeFrames(totalFrames: number, weights: number[]): number[] {
  if (!Number.isFinite(totalFrames) || totalFrames < 0) {
    throw new Error('distributeFrames: totalFrames must be a non-negative finite number.');
  }

  if (weights.length === 0) {
    return [];
  }

  const safeWeights = weights.map((weight) =>
    Math.max(0.0001, Number.isFinite(weight) ? weight : 0.0001),
  );

  const totalWeight = sumNumbers(safeWeights);

  const exact = safeWeights.map((weight) => (totalFrames * weight) / totalWeight);
  const floors = exact.map((value) => Math.floor(value));

  let remainder = totalFrames - sumNumbers(floors);

  const orderByFractional = exact
    .map((value, index) => ({
      index,
      fractional: value - Math.floor(value),
    }))
    .sort((a, b) => b.fractional - a.fractional);

  for (let i = 0; i < remainder; i += 1) {
    const target = orderByFractional[i % orderByFractional.length];
    floors[target.index] += 1;
  }

  return floors;
}

export function rangeFromSeconds(
  startSeconds: number,
  durationSeconds: number,
  fps: number,
): { startFrame: number; durationInFrames: number } {
  const startFrame = secondsToFrames(startSeconds, fps);
  const endFrame = secondsToFrames(startSeconds + durationSeconds, fps);

  return {
    startFrame,
    durationInFrames: endFrame - startFrame,
  };
}
