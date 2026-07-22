/**
 * Thème visuel méditatif.
 *
 * Parti pris esthétique :
 * - couleurs froides et douces
 * - contrastes faibles
 * - mouvements lents
 * - textes centrés, aérés
 */
import type { CSSProperties } from 'react';
import type { BackgroundStyle, Branding } from '../data/schema';

export const theme = {
  spacing: {
    pagePadding: '0 12%',
  },
  radius: {
    circle: '50%',
  },
  shadow: {
    soft: '0 2px 24px rgba(0, 0, 0, 0.35)',
  },
} as const;

export function createBackgroundStyle(
  background: BackgroundStyle,
): CSSProperties {
  const colors = background.colors?.length
    ? background.colors
    : ['#07131d', '#12324a'];

  if (background.type === 'solid') {
    return {
      backgroundColor: colors[0] ?? '#07131d',
    };
  }

  if (background.type === 'image' && background.imageUrl) {
    return {
      backgroundImage: `url(${background.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return {
    backgroundImage: `linear-gradient(${background.angle ?? 160}deg, ${colors.join(', ')})`,
  };
}

export function createOverlayStyle(branding: Branding): CSSProperties {
  return {
    backgroundColor: `rgba(4, 10, 16, ${branding.overlayOpacity})`,
  };
}

export function createCenterTextStyle(
  branding: Branding,
  options: {
    size: number;
    color?: string;
    maxWidth?: number;
    weight?: number;
    lineHeight?: number;
  },
): CSSProperties {
  return {
    fontFamily: branding.fontFamily,
    color: options.color ?? branding.primaryColor,
    fontSize: options.size,
    fontWeight: options.weight ?? 500,
    textAlign: 'center',
    maxWidth: options.maxWidth ?? 1400,
    lineHeight: options.lineHeight ?? 1.35,
    letterSpacing: '0.01em',
    textShadow: theme.shadow.soft,
  };
}

export function createHaloStyle(accentColor: string): CSSProperties {
  return {
    background: `radial-gradient(circle at center, ${accentColor}22 0%, ${accentColor}11 35%, transparent 70%)`,
  };
}
