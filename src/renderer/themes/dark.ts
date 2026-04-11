import type { BoardTheme } from '@/renderer/themes/types';

export const darkTheme: BoardTheme = {
  board: {
    frame: '#3e2008',      // Dark walnut brown
    surface: '#1b4a1e',    // Deep forest green felt
    bar: '#2d1605',        // Darker walnut for bar
  },
  triangles: {
    light: '#f5e6c8',      // Warm cream
    dark: '#4a1069',       // Deep purple / aubergine
  },
  checkers: {
    white: {
      fill: '#f0e8d0',           // Ivory
      stroke: '#c8b070',         // Antique gold border
      gradientLight: '#ffffff',  // Bright highlight
      gradientDark: '#b8a060',   // Warm shadow
    },
    black: {
      fill: '#1a0a00',           // Espresso / near-black brown
      stroke: '#4a2a10',         // Dark brown border
      gradientLight: '#5a3a20',  // Warm brown highlight
      gradientDark: '#050200',   // Deep shadow
    },
  },
  dice: {
    bg: '#f5f0e8',         // Off-white dice face
    pips: '#1a1008',       // Dark espresso pips
    usedBg: '#4a3828',     // Muted warm grey for used dice
    usedPips: '#6a5848',   // Dim pips
    border: '#c8a050',     // Gold border
  },
  highlights: {
    valid: 'rgba(80, 220, 120, 0.55)',   // Emerald green semi-transparent
    selected: 'rgba(255, 220, 50, 0.75)', // Gold/yellow glow
    hit: 'rgba(220, 60, 60, 0.60)',      // Red for opponent blot
  },
  text: '#f5e6c8',
  bearOffLabel: 'rgba(245, 230, 200, 0.7)',
};
