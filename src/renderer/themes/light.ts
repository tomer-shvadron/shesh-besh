import type { BoardTheme } from '@/renderer/themes/types';

export const lightTheme: BoardTheme = {
  board: {
    frame: '#c8a060',      // Light oak / honey wood
    surface: '#c8dcc0',    // Light sage green felt
    bar: '#b08840',        // Medium oak for bar
  },
  triangles: {
    light: '#d4a055',      // Warm sand / amber
    dark: '#2a7a7a',       // Teal / dark cyan
  },
  checkers: {
    white: {
      fill: '#ffffff',           // Pure white
      stroke: '#9090a0',         // Cool grey border
      gradientLight: '#ffffff',  // Full white highlight
      gradientDark: '#c0c0cc',   // Light shadow
    },
    black: {
      fill: '#2a3040',           // Dark slate blue
      stroke: '#151a26',         // Very dark border
      gradientLight: '#4a5060',  // Slate highlight
      gradientDark: '#0a0d14',   // Deep shadow
    },
  },
  dice: {
    bg: '#fffef8',         // Near-white dice face
    pips: '#2a3040',       // Dark slate pips
    usedBg: '#c8c0b0',     // Warm grey for used dice
    usedPips: '#908878',   // Dim pips
    border: '#908060',     // Oak-toned border
  },
  highlights: {
    valid: 'rgba(40, 160, 80, 0.50)',    // Forest green semi-transparent
    selected: 'rgba(220, 140, 20, 0.75)', // Amber/orange glow
    hit: 'rgba(200, 50, 50, 0.55)',      // Red for opponent blot
  },
  text: '#2a3040',
  bearOffLabel: 'rgba(42, 48, 64, 0.7)',
};
